import express from 'express';
import { chatRoutes } from './routes/chat';
import { authRoutes } from './routes/auth';
import { limiter, validateRequest, securityHeaders } from './middleware/security';
import cors from 'cors';
import { config } from 'dotenv';
import { connectDatabase } from './config/database';

// Load environment variables
config();

// Initialize database
connectDatabase().catch(error => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(limiter);
app.use(validateRequest);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Body parser middleware
app.use(express.json({ limit: '10kb' })); // Limit body size

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Budget Assistant API is running' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app; 