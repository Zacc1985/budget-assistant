import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';

let db: Database;

export function setupDatabase(): void {
  console.log('Setting up database...');
  
  try {
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return;
      }
      console.log('Connected to SQLite database');
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
    )`
  ];

  db.serialize(() => {
    tables.forEach(table => {
      db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        } else {
          console.log('Table created successfully');
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