import express, { Request, Response } from 'express';
import { getDatabase } from '../database';

const router = express.Router();

// Get all budget categories
router.get('/categories', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM budgets', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new budget category
router.post('/categories', (req, res) => {
  const { category, amount } = req.body;
  if (!category || !amount) {
    res.status(400).json({ error: 'Category and amount are required' });
    return;
  }

  const db = getDatabase();
  db.run(
    'INSERT INTO budgets (category, amount) VALUES (?, ?)',
    [category, amount],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({
        id: this.lastID,
        category,
        amount
      });
    }
  );
});

// Get transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const transactions = await db.all(`
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
    const result = await db.run(
      'INSERT INTO transactions (category_id, amount, description) VALUES (?, ?, ?)',
      [category_id, amount, description]
    );
    res.json({ id: result.lastID, category_id, amount, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

export const budgetRoutes = router; 