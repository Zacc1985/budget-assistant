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
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        isInitializing = false;
        return;
      }
      console.log('Connected to SQLite database at:', dbPath);
      try {
        await createTables();
        isInitialized = true;
        isInitializing = false;
        console.log('Database initialization completed successfully');
      } catch (error) {
        console.error('Error during table creation:', error);
        isInitializing = false;
        throw error;
      }
    });
  } catch (error) {
    console.error('Failed to create database:', error);
    isInitializing = false;
    throw error;
  }
}

async function createTables(): Promise<void> {
  console.log('Creating database tables...');
  
  // Enable foreign keys
  await new Promise<void>((resolve, reject) => {
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // Create tables sequentially
  const tables = [
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES budgets (id)
    )`,
    `CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      target_date DATE,
      priority INTEGER NOT NULL,
      monthly_contribution REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS budget_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      percentage REAL NOT NULL,
      current_spent REAL DEFAULT 0,
      monthly_limit REAL NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const table of tables) {
    await new Promise<void>((resolve, reject) => {
      db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('Table created successfully');
          resolve();
        }
      });
    });
  }

  // Verify tables exist before inserting data
  await new Promise<void>((resolve, reject) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='budget_rules'", (err, row) => {
      if (err) {
        console.error('Error verifying budget_rules table:', err);
        reject(err);
      } else if (!row) {
        reject(new Error('budget_rules table not found after creation'));
      } else {
        resolve();
      }
    });
  });

  // Initialize default budget rules
  const defaultRules = [
    { category: 'Needs', percentage: 50, monthly_limit: 0 },
    { category: 'Wants', percentage: 30, monthly_limit: 0 },
    { category: 'Savings', percentage: 20, monthly_limit: 0 }
  ];

  for (const rule of defaultRules) {
    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO budget_rules (category, percentage, monthly_limit)
        VALUES (?, ?, ?)
      `, [rule.category, rule.percentage, rule.monthly_limit], (err) => {
        if (err) {
          console.error('Error inserting default rule:', err);
          reject(err);
        } else {
          console.log(`Default rule inserted for ${rule.category}`);
          resolve();
        }
      });
    });
  }
}

export function getDatabase(): Database {
  if (!db) {
    console.log('Database not initialized, setting up...');
    setupDatabase();
  }
  return db;
} 