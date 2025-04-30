import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database;

export const connectDatabase = async () => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    console.log('Data directory path:', dataDir);
    
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'budget.db');
    console.log('Database path:', dbPath);
    
    db = new Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite database successfully');
    });

    return new Promise((resolve, reject) => {
      db.exec('SELECT 1', (err) => {
        if (err) {
          console.error('Database test query failed:', err);
          reject(err);
        } else {
          console.log('Database test query successful');
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('SQLite database connection error:', error);
    throw error;
  }
};

export const getDatabase = (): Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}; 