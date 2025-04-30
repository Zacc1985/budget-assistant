import { Router } from 'express';
import { db } from '../database';

const router = Router();

// Get spending analytics
router.get('/spending', async (req, res) => {
  try {
    const spending = await db.all(`
      SELECT category, SUM(amount) as total
      FROM transactions
      GROUP BY category
    `);
    res.json(spending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch spending analytics' });
  }
});

// Get monthly summary
router.get('/monthly', async (req, res) => {
  try {
    const monthly = await db.all(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(amount) as total
      FROM transactions
      GROUP BY month
      ORDER BY month DESC
    `);
    res.json(monthly);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

export const analyticsRoutes = router; 