import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database;
let isInitializing = false;
let isInitialized = false;

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'budget.db');

// Helper function to run queries with proper error handling
function runQuery(query: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      db.run(query, params, function(err) {
        if (err) {
          console.error(`Error running query: ${query}`, err);
          reject(err);
        } else {
          console.log(`Query executed successfully: ${query.split('\n')[0]}...`);
          resolve();
        }
      });
    } catch (error) {
      console.error(`Exception running query: ${query}`, error);
      reject(error);
    }
  });
}

async function createTable(tableName: string, schema: string): Promise<void> {
  try {
    console.log(`Creating/verifying table: ${tableName}`);
    await runQuery(schema);
    console.log(`Table ${tableName} created/verified successfully`);
  } catch (error) {
    console.error(`Failed to create table ${tableName}:`, error);
    throw error;
  }
}

export async function setupDatabase(): Promise<void> {
  if (isInitialized) {
    console.log('Database already initialized');
    return;
  }

  if (isInitializing) {
    console.log('Database initialization in progress...');
    return;
  }

  isInitializing = true;
  console.log('Setting up database...');
  
  try {
    // Create database connection
    db = await new Promise<Database>((resolve, reject) => {
      const database = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', dbPath);
          resolve(database);
        }
      });
    });

    // Enable foreign keys
    await runQuery('PRAGMA foreign_keys = ON');
    console.log('Foreign keys enabled');

    // Create tables one by one
    await createTable('budgets', `
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTable('transactions', `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES budgets (id)
      )
    `);

    await createTable('goals', `
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        target_date DATE,
        priority INTEGER NOT NULL,
        monthly_contribution REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTable('budget_rules', `
      CREATE TABLE IF NOT EXISTS budget_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL UNIQUE,
        percentage REAL NOT NULL,
        current_spent REAL DEFAULT 0,
        monthly_limit REAL NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default rules
    const defaultRules = [
      { category: 'Needs', percentage: 50, monthly_limit: 0 },
      { category: 'Wants', percentage: 30, monthly_limit: 0 },
      { category: 'Savings', percentage: 20, monthly_limit: 0 }
    ];

    for (const rule of defaultRules) {
      try {
        await runQuery(
          `INSERT OR IGNORE INTO budget_rules (category, percentage, monthly_limit)
           VALUES (?, ?, ?)`,
          [rule.category, rule.percentage, rule.monthly_limit]
        );
        console.log(`Default rule processed for ${rule.category}`);
      } catch (error) {
        console.error(`Error inserting default rule for ${rule.category}:`, error);
        // Continue with other rules even if one fails
      }
    }

    isInitialized = true;
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

export function getDatabase(): Database {
  if (!db) {
    console.log('Database not initialized, setting up...');
    setupDatabase().catch(error => {
      console.error('Failed to setup database:', error);
      process.exit(1); // Exit if database setup fails
    });
  }
  return db;
} 