import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { getDatabase } from '../database';

interface BudgetCategory {
  id: number;
  category: string;
  amount: number;
  created_at: string;
}

interface Transaction {
  id: number;
  category_id: number;
  amount: number;
  description: string;
  created_at: string;
}

interface BudgetSummary {
  categories: BudgetCategory[];
  transactions: Transaction[];
}

const router = express.Router();

// Check if Grok API key is configured
if (!process.env.XAPI) {
  console.warn('Warning: XAPI is not set in environment variables');
}

// Helper function to get budget summary
async function getBudgetSummary(): Promise<BudgetSummary> {
  const db = getDatabase();
  const categories = await new Promise<BudgetCategory[]>((resolve, reject) => {
    db.all('SELECT * FROM budgets', (err, rows) => {
      if (err) reject(err);
      else resolve(rows as BudgetCategory[]);
    });
  });
  
  const transactions = await new Promise<Transaction[]>((resolve, reject) => {
    db.all('SELECT * FROM transactions', (err, rows) => {
      if (err) reject(err);
      else resolve(rows as Transaction[]);
    });
  });

  return { categories, transactions };
}

// Process natural language queries
router.post('/query', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    // Get current budget data
    const budgetData = await getBudgetSummary();
    
    // Create a context-aware system message
    const systemMessage = `You are a helpful financial assistant with access to the user's budget data.
Current Budget Categories:
${budgetData.categories.map(cat => `- ${cat.category}: $${cat.amount}`).join('\n')}

Recent Transactions:
${budgetData.transactions.map(tx => `- $${tx.amount} for ${tx.description || 'Unspecified'}`).join('\n')}

Please provide specific, data-driven advice based on this information. You can:
1. Analyze spending patterns
2. Suggest budget adjustments
3. Provide savings recommendations
4. Alert about overspending
5. Calculate remaining budgets

Remember to be specific and reference actual numbers from their budget data.`;

    const response = await axios.post('https://api.grok.ai/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: message
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAPI}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Error calling Grok API:', error.message);
      res.status(500).json({ error: error.message || 'Failed to process query' });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

// Get AI-powered budget insights
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const budgetData = await getBudgetSummary();
    
    const systemMessage = `You are a financial analyst. Based on this budget data:
Current Budget Categories:
${budgetData.categories.map(cat => `- ${cat.category}: $${cat.amount}`).join('\n')}

Recent Transactions:
${budgetData.transactions.map(tx => `- $${tx.amount} for ${tx.description || 'Unspecified'}`).join('\n')}

Please provide a brief analysis including:
1. Top spending categories
2. Unusual spending patterns
3. Budget utilization
4. Savings opportunities
5. Recommendations

Keep the analysis concise and actionable.`;

    const response = await axios.post('https://api.grok.ai/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: 'Please provide a budget analysis and recommendations based on my current data.'
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAPI}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Error generating insights:', error.message);
      res.status(500).json({ error: error.message || 'Failed to generate insights' });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

export const chatRoutes = router; 