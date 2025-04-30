import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database;

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'budget.db');

export function setupDatabase(): void {
  console.log('Setting up database...');
  
  try {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return;
      }
      console.log('Connected to SQLite database at:', dbPath);
      createTables();
    });
  } catch (error) {
    console.error('Failed to create database:', error);
  }
}

function createTables(): void {
  console.log('Creating database tables...');
  
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

  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    tables.forEach(table => {
      db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        } else {
          console.log('Table created successfully');
        }
      });
    });

    // Initialize default budget rules
    const defaultRules = [
      { category: 'Needs', percentage: 50, monthly_limit: 0 },
      { category: 'Wants', percentage: 30, monthly_limit: 0 },
      { category: 'Savings', percentage: 20, monthly_limit: 0 }
    ];

    defaultRules.forEach(rule => {
      db.run(`
        INSERT OR IGNORE INTO budget_rules (category, percentage, monthly_limit)
        VALUES (?, ?, ?)
      `, [rule.category, rule.percentage, rule.monthly_limit], (err) => {
        if (err) {
          console.error('Error inserting default rule:', err);
        }
      });
    });
  });
}

export function getDatabase(): Database {
  if (!db) {
    console.log('Database not initialized, setting up...');
    setupDatabase();
  }
  return db;
} 