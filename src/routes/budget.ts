import { Router } from 'express';
import { query } from '../database';

const router = Router();

// Get all categories with their budgets
router.get('/categories', (req, res) => {
  try {
    const categories = query.all<{ id: number; name: string; budget: number }[]>(
      'SELECT * FROM categories ORDER BY name'
    );
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Add a new category
router.post('/categories', (req, res) => {
  try {
    const { name, budget } = req.body;
    const result = query.run(
      'INSERT INTO categories (name, budget) VALUES (?, ?)',
      [name, budget]
    );
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get all transactions
router.get('/transactions', (req, res) => {
  try {
    const transactions = query.all<{ id: number; date: string; category: string; amount: number; description: string }[]>(
      'SELECT * FROM transactions ORDER BY date DESC'
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add a new transaction
router.post('/transactions', (req, res) => {
  try {
    const { date, category, amount, description } = req.body;
    const result = query.run(
      'INSERT INTO transactions (date, category, amount, description) VALUES (?, ?, ?, ?)',
      [date, category, amount, description]
    );
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

export const budgetRoutes = router; 