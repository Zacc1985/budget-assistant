import express, { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const router = express.Router();

// Check if Grok API key is configured
if (!process.env.XAPI) {
  console.warn('Warning: XAPI is not set in environment variables');
}

// Process natural language queries
router.post('/query', async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  try {
    const response = await axios.post('https://api.grok.ai/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful financial assistant.'
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

export const chatRoutes = router; 