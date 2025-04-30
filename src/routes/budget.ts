import express from 'express';
import { getDb } from '../database';

const router = express.Router();

// Get all budget categories
router.get('/categories', async (req, res) => {
  try {
    const db = getDb();
    const categories = await db.all('SELECT * FROM budget_categories');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budget categories' });
  }
});

// Add new budget category
router.post('/categories', async (req, res) => {
  try {
    const { name, amount } = req.body;
    const db = getDb();
    const result = await db.run(
      'INSERT INTO budget_categories (name, amount) VALUES (?, ?)',
      [name, amount]
    );
    res.json({ id: result.lastID, name, amount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add budget category' });
  }
});

// Get transactions
router.get('/transactions', async (req, res) => {
  try {
    const db = getDb();
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
router.post('/transactions', async (req, res) => {
  try {
    const { category_id, amount, description } = req.body;
    const db = getDb();
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