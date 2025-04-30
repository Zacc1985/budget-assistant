import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import { analyticsRoutes } from './routes/analytics';
import { budgetRoutes } from './routes/budget';

const app = express();
const port = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/budget', budgetRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 