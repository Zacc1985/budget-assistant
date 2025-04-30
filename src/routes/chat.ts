import express from 'express';
import { getDb } from '../database';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Process natural language query about budget
router.post('/query', async (req, res) => {
  try {
    const { message } = req.body;
    const db = getDb();

    // Get current budget data
    const categories = await db.all('SELECT * FROM budget_categories');
    const transactions = await db.all(`
      SELECT t.*, c.name as category_name 
      FROM transactions t 
      LEFT JOIN budget_categories c ON t.category_id = c.id
    `);

    // Create context for the AI
    const context = {
      budget_categories: categories,
      transactions: transactions
    };

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
    });

    res.json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process query' });
  }
});

export const chatRoutes = router; 