import express, { Request, Response } from 'express';
import { getDatabase } from '../database';
import { Database } from 'sqlite3';

const router = express.Router();

// Helper function for database operations
const dbRun = (db: Database, query: string, params: any[] = []): Promise<{ lastID: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
};

// Create a new goal
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, target_amount, target_date, priority, monthly_contribution } = req.body;
    
    if (!name || !target_amount || !priority) {
      res.status(400).json({ error: 'Name, target amount, and priority are required' });
      return;
    }

    const db = getDatabase();
    const result = await dbRun(
      db,
      `INSERT INTO goals (name, target_amount, target_date, priority, monthly_contribution) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, target_amount, target_date, priority, monthly_contribution]
    );

    res.status(201).json({
      id: result.lastID,
      name,
      target_amount,
      target_date,
      priority,
      monthly_contribution
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Get all goals
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const goals = await new Promise<any[]>((resolve, reject) => {
      db.all('SELECT * FROM goals ORDER BY priority ASC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Update goal priority
router.patch('/:id/priority', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!priority) {
      res.status(400).json({ error: 'Priority is required' });
      return;
    }

    const db = getDatabase();
    await dbRun(
      db,
      'UPDATE goals SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [priority, id]
    );

    res.json({ message: 'Goal priority updated successfully' });
  } catch (error) {
    console.error('Error updating goal priority:', error);
    res.status(500).json({ error: 'Failed to update goal priority' });
  }
});

// Update goal progress
router.patch('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { current_amount } = req.body;

    if (current_amount === undefined) {
      res.status(400).json({ error: 'Current amount is required' });
      return;
    }

    const db = getDatabase();
    await dbRun(
      db,
      'UPDATE goals SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [current_amount, id]
    );

    res.json({ message: 'Goal progress updated successfully' });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});

// Delete a goal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    await dbRun(db, 'DELETE FROM goals WHERE id = ?', [id]);
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export const goalRoutes = router; 