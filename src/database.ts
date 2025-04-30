import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

let db: Database;

export function setupDatabase(): void {
  db = new sqlite3.Database('budget.db', (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return;
    }
    console.log('Connected to SQLite database');
    createTables();
  });
}

function createTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES budgets (id)
    )
  `);
}

export function getDatabase(): Database {
  return db;
} 