# Budget Assistant

A budget management application that combines natural language processing with visual budget tracking.

## Features

- Natural language interface for budget queries and updates
- Visual display of budget categories and transactions
- SQLite database for data persistence
- RESTful API for budget management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Budget Management
- `GET /api/budget/categories` - Get all budget categories
- `POST /api/budget/categories` - Add a new budget category
- `GET /api/budget/transactions` - Get all transactions
- `POST /api/budget/transactions` - Add a new transaction

### Natural Language Interface
- `POST /api/chat/query` - Process natural language queries about your budget

## Example Usage

1. Add a budget category:
```bash
curl -X POST http://localhost:3000/api/budget/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Groceries", "amount": 500}'
```

2. Ask about your budget:
```bash
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"message": "How much do I have left in my grocery budget?"}'
```

## Next Steps

1. Create a frontend interface (React/Next.js recommended)
2. Add user authentication
3. Implement budget analytics and reporting
4. Add support for recurring transactions
5. Implement budget alerts and notifications 