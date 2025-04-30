import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { connectDatabase } from './config/database';

// Load environment variables
config();
console.log('Environment variables loaded');

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting server setup...');

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', message: 'Budget Assistant API is running' });
});

console.log('Attempting database connection...');

// Connect to database and start server
connectDatabase()
  .then(() => {
    console.log('Database connected successfully');
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 