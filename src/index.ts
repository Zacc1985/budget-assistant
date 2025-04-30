import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { budgetRoutes } from './routes/budget';
import { chatRoutes } from './routes/chat';
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

// Health check endpoint (required by Render)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Budget Assistant API is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 