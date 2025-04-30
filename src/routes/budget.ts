import express, { Request, Response } from 'express';
import { getDatabase } from '../database';
import { Database } from 'sqlite3';

const router = express.Router();

// Promisify database operations
const dbAll = (db: Database, query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (db: Database, query: string, params: any[] = []): Promise<{ lastID: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
};

// Get all budget categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = await dbAll(db, 'SELECT * FROM budgets');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new budget category
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const { category, amount } = req.body;
    if (!category || !amount) {
      res.status(400).json({ error: 'Category and amount are required' });
      return;
    }

    const db = getDatabase();
    const result = await dbRun(
      db,
      'INSERT INTO budgets (category, amount) VALUES (?, ?)',
      [category, amount]
    );
    
    res.status(201).json({
      id: result.lastID,
      category,
      amount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const transactions = await dbAll(db, `
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      LEFT JOIN budget_categories c ON t.category_id = c.id
    `);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add new transaction
router.post('/transactions', async (req: Request, res: Response) => {
  try {
    const { category_id, amount, description } = req.body;
    const db = getDatabase();
    const result = await dbRun(
      db,
      'INSERT INTO transactions (category_id, amount, description) VALUES (?, ?, ?)',
      [category_id, amount, description]
    );
    res.json({ 
      id: result.lastID, 
      category_id, 
      amount, 
      description 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

export const budgetRoutes = router; 