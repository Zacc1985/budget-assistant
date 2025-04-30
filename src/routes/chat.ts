import express from 'express';
import axios from 'axios';

const router = express.Router();

// Check if Grok API key is configured
if (!process.env.XAPI) {
  console.warn('Warning: XAPI is not set in environment variables');
}

// Process natural language queries
router.post('/query', async (req, res) => {
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
    console.error('Error calling Grok API:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

export const chatRoutes = router; 