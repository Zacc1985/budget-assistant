import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let database: Database.Database;
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
      const database = getDatabase();
      const stmt = database.prepare(query);
      stmt.run(params);
      console.log(`Query executed successfully: ${query.split('\n')[0]}...`);
      resolve();
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

export const initializeDatabase = () => {
  if (database) {
    return database;
  }

  const dbPath = path.join(process.cwd(), 'budget.db');
  database = new Database(dbPath);

  // Enable foreign keys
  database.pragma('foreign_keys = ON');

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      budget REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return database;
};

export const getDatabase = () => {
  if (!database) {
    return initializeDatabase();
  }
  return database;
};

type QueryResult<T> = T extends any[] ? T : T | undefined;

export const query = {
  all: <T extends any[]>(sql: string, params?: any[]): T => {
    const db = getDatabase();
    return db.prepare(sql).all(params || []) as T;
  },
  
  get: <T>(sql: string, params?: any[]): T | undefined => {
    const db = getDatabase();
    return db.prepare(sql).get(params || []) as T | undefined;
  },
  
  run: (sql: string, params?: any[]) => {
    const db = getDatabase();
    return db.prepare(sql).run(params || []);
  }
}; 