import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { budgetRoutes } from './routes/budget';
import { chatRoutes } from './routes/chat';
import { goalRoutes } from './routes/goals';
import { setupDatabase } from './database';

// Load environment variables
dotenv.config();

// Initialize database
setupDatabase();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api/budget', budgetRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/goals', goalRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Budget Assistant API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 