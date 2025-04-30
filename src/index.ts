import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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