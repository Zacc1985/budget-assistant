import express from 'express';
import { getDb } from '../database';

const router = express.Router();

// Check if Grok API key is configured
if (!process.env.XAPI) {
  console.warn('Warning: XAPI is not set in environment variables');
}

// Process natural language query about budget
router.post('/query', async (req, res) => {
  try {
    // Check if Grok is configured
    if (!process.env.XAPI) {
      return res.status(500).json({ 
        error: 'Grok API key not configured. Please set XAPI environment variable.' 
      });
    }

    const { message } = req.body;
    const db = getDb();

    // Get current budget data
    const categories = await db.all('SELECT * FROM budget_categories');
    const transactions = await db.all(`
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      LEFT JOIN budget_categories c ON t.category_id = c.id
    `);

    // Create context for Grok
    const context = {
      budget_categories: categories,
      transactions: transactions
    };

    // Call Grok API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAPI}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a helpful budget assistant. Use the provided budget data to answer questions and provide insights."
          },
          {
            role: "user",
            content: `Context: ${JSON.stringify(context)}\n\nUser question: ${message}`
          }
        ]
      })
    });

    const grokResponse = await response.json();
    
    res.json({
      response: grokResponse.choices[0].message.content
    });
  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const chatRoutes = router; 