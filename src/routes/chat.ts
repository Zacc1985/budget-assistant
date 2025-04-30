import express, { Request, Response } from 'express';
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import https from 'https';
import { getDatabase } from '../database';
import { Database } from 'sqlite3';
import { localML } from '../ml/localML';

// Helper function for database operations
const dbRun = (db: Database, query: string, params: any[] = []): Promise<{ lastID: number }> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
};

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

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const router = express.Router();

// Configure axios for SSL
// @ts-ignore
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Note: This is not recommended for production
  })
});

// Check if Grok API key is configured
if (!process.env.XAPI) {
  console.warn('Warning: XAPI (Grok API key) is not set in environment variables');
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

// Helper function to get goals summary
async function getGoalsSummary(): Promise<any[]> {
  const db = getDatabase();
  return new Promise<any[]>((resolve, reject) => {
    db.all(`
      SELECT 
        id,
        name,
        target_amount,
        current_amount,
        target_date,
        priority,
        monthly_contribution,
        (target_amount - current_amount) as remaining_amount,
        CASE 
          WHEN monthly_contribution > 0 
          THEN (target_amount - current_amount) / monthly_contribution 
          ELSE NULL 
        END as months_to_complete
      FROM goals 
      ORDER BY priority ASC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper function to let Grok manage goals
async function manageGoals(action: string, data: any): Promise<any> {
  const db = getDatabase();
  
  switch (action) {
    case 'create_goal':
      return await dbRun(
        db,
        `INSERT INTO goals (name, target_amount, target_date, priority, monthly_contribution) 
         VALUES (?, ?, ?, ?, ?)`,
        [data.name, data.target_amount, data.target_date, data.priority, data.monthly_contribution]
      );
    
    case 'update_goal':
      return await dbRun(
        db,
        `UPDATE goals 
         SET target_amount = ?, 
             target_date = ?, 
             priority = ?, 
             monthly_contribution = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.target_amount, data.target_date, data.priority, data.monthly_contribution, data.id]
      );
    
    case 'update_progress':
      return await dbRun(
        db,
        'UPDATE goals SET current_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [data.current_amount, data.id]
      );
    
    case 'delete_goal':
      return await dbRun(db, 'DELETE FROM goals WHERE id = ?', [data.id]);
    
    default:
      throw new Error('Invalid action');
  }
}

// Process natural language queries
router.post('/query', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  if (!process.env.XAPI) {
    res.status(500).json({ error: 'Grok API key not configured' });
    return;
  }

  try {
    // Get current budget and goals data
    const budgetData = await getBudgetSummary();
    const goalsData = await getGoalsSummary();
    const spendingInsights = await localML.getSpendingInsights();
    const budgetInsights = await localML.getBudgetInsights();
    
    // Create a context-aware system message
    const systemMessage = `You are a proactive financial assistant with access to the user's budget, goals, and spending patterns.

Current Budget Categories:
${budgetData.categories.map(cat => `- ${cat.category}: $${cat.amount}`).join('\n')}

Recent Transactions:
${budgetData.transactions.map(tx => `- $${tx.amount} for ${tx.description || 'Unspecified'}`).join('\n')}

Financial Goals (in priority order):
${goalsData.map(goal => `
- ${goal.name}
  Target: $${goal.target_amount}
  Current: $${goal.current_amount}
  Remaining: $${goal.remaining_amount}
  Monthly Contribution: $${goal.monthly_contribution}
  Months to Complete: ${goal.months_to_complete || 'N/A'}
  Priority: ${goal.priority}
`).join('\n')}

Budget Rule Status (50/30/20):
${budgetInsights.map(insight => `
- ${insight.category} (${insight.status})
  Spent: $${insight.spent.toFixed(2)} / $${insight.limit.toFixed(2)}
  Percentage Used: ${insight.percentage.toFixed(1)}%
`).join('\n')}

Spending Patterns (from local ML):
${spendingInsights.map(pattern => `
- ${pattern.category}
  Average Amount: $${pattern.average_amount}
  Monthly Frequency: ${pattern.monthly_frequency}
  Confidence: ${(pattern.confidence * 100).toFixed(1)}%
`).join('\n')}

You have the following capabilities:
1. Create new financial goals
2. Update existing goals (amounts, dates, priorities)
3. Track goal progress
4. Delete goals`;

    // Call Grok API
    try {
      const response = await axiosInstance.post<GrokResponse>('https://api.grok.ai/v1/chat/completions', {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message }
        ],
        model: 'grok-1',
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.XAPI}`,
          'Content-Type': 'application/json'
        }
      });

      const grokResponse = response.data.choices[0].message.content;
      res.json({ response: grokResponse });
    } catch (error: any) {
      console.error('Error:', error);
      res.status(500).json({ 
        error: 'An error occurred',
        details: error.message
      });
    }
  } catch (error: any) {
    console.error('Server error:', error.message);
    res.status(500).json({ 
      error: 'An error occurred',
      details: error.message
    });
  }
});

// Get AI-powered budget insights
router.get('/insights', async (req: Request, res: Response) => {
  if (!process.env.XAPI) {
    res.status(500).json({ error: 'Grok API key not configured' });
    return;
  }

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

    console.log('Calling Grok API for insights');

    const response = await axiosInstance.post<GrokResponse>('https://api.grok.ai/v1/chat/completions', {
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

    console.log('Grok API insights received');
    res.json(response.data);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'An error occurred',
      details: error.message
    });
  }
});

// Helper function to categorize transactions
async function categorizeTransaction(description: string): Promise<string> {
  const systemMessage = `Categorize this transaction description into one of these categories:
- Food & Dining
- Shopping
- Transportation
- Housing
- Utilities
- Entertainment
- Healthcare
- Income
- Savings
- Other

Description: "${description}"
Return only the category name, nothing else.`;

  try {
    const response = await axiosInstance.post('https://api.grok.ai/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: 'Please categorize this transaction.'
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAPI}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error categorizing transaction:', error);
    return 'Other';
  }
}

// Fetch and process bank statements from Grok
router.get('/bank-statements', async (req: Request, res: Response) => {
  if (!process.env.XAPI) {
    res.status(500).json({ error: 'Grok API key not configured' });
    return;
  }

  try {
    const systemMessage = `You have access to the user's bank statements since December.
Please provide the transaction data in the following format:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "description": string
    }
  ]
}

Only return the JSON data, no additional text.`;

    console.log('Fetching bank statements from Grok');

    const response = await axiosInstance.post<GrokResponse>('https://api.grok.ai/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: 'Please provide my bank statement data since December.'
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAPI}`,
        'Content-Type': 'application/json'
      }
    });

    // Process and store the transactions
    const transactions = JSON.parse(response.data.choices[0].message.content).transactions;
    const db = getDatabase();

    // Store each transaction with automatic categorization
    for (const tx of transactions) {
      const category = await categorizeTransaction(tx.description);
      
      // First, ensure the category exists
      const categoryResult = await dbRun(
        db,
        'INSERT OR IGNORE INTO budgets (category) VALUES (?)',
        [category]
      );

      // Then insert the transaction
      await dbRun(
        db,
        'INSERT INTO transactions (amount, description, created_at, category_id) VALUES (?, ?, ?, ?)',
        [tx.amount, tx.description, tx.date, categoryResult.lastID]
      );
    }

    console.log('Bank statements processed and stored');
    res.json({ 
      message: 'Bank statements processed successfully',
      transactionsProcessed: transactions.length
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'An error occurred',
      details: error.message
    });
  }
});

// Add endpoint to view transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const transactions = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT t.*, b.category 
        FROM transactions t 
        LEFT JOIN budgets b ON t.category_id = b.id 
        ORDER BY t.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      transactions,
      total: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0)
    });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'An error occurred',
      details: error.message
    });
  }
});

export const chatRoutes = router; 