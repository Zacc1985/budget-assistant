import express, { Request, Response } from 'express';
import { getDatabase } from '../database';
import { Database } from 'sqlite3';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

const router = express.Router();

// Helper functions
const dbAll = (db: Database, query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (db: Database, query: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Initialize notifications table
const initializeNotificationsTable = async () => {
  const db = getDatabase();
  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await dbRun(db, `
    CREATE TABLE IF NOT EXISTS notification_settings (
      user_id INTEGER PRIMARY KEY,
      budget_alerts BOOLEAN DEFAULT TRUE,
      goal_updates BOOLEAN DEFAULT TRUE,
      spending_insights BOOLEAN DEFAULT TRUE,
      email_notifications BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
};

// Initialize tables when the module loads
initializeNotificationsTable().catch(console.error);

// Get user's notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id; // Assuming auth middleware sets this
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const notifications = await dbAll(db, `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    await dbRun(db, `
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Update notification settings
router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      budget_alerts,
      goal_updates,
      spending_insights,
      email_notifications
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    await dbRun(db, `
      INSERT INTO notification_settings 
        (user_id, budget_alerts, goal_updates, spending_insights, email_notifications)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        budget_alerts = excluded.budget_alerts,
        goal_updates = excluded.goal_updates,
        spending_insights = excluded.spending_insights,
        email_notifications = excluded.email_notifications
    `, [userId, budget_alerts, goal_updates, spending_insights, email_notifications]);

    res.json({ message: 'Notification settings updated' });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Get notification settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const settings = await dbAll(db, `
      SELECT * FROM notification_settings WHERE user_id = ?
    `, [userId]);

    res.json(settings[0] || {
      budget_alerts: true,
      goal_updates: true,
      spending_insights: true,
      email_notifications: true
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Clear all notifications
router.delete('/clear', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    await dbRun(db, 'DELETE FROM notifications WHERE user_id = ?', [userId]);

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export const notificationRoutes = router;

// Export function to create notifications (to be used by other modules)
export const createNotification = async (
  userId: number,
  type: string,
  message: string
): Promise<void> => {
  try {
    const db = getDatabase();
    
    // Check user's notification settings
    const settings = await dbAll(db, `
      SELECT * FROM notification_settings WHERE user_id = ?
    `, [userId]);

    const userSettings = settings[0] || {
      budget_alerts: true,
      goal_updates: true,
      spending_insights: true
    };

    // Only create notification if the user has enabled this type
    if (userSettings[type.toLowerCase() as keyof typeof userSettings]) {
      await dbRun(db, `
        INSERT INTO notifications (user_id, type, message)
        VALUES (?, ?, ?)
      `, [userId, type, message]);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}; 