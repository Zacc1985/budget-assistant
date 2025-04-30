# Budget Assistant Application

A simple budget management application with Grok AI integration to help manage your finances.

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```
PORT=3000
XAPI=your_grok_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Start production server:
```bash
npm start
```

## Features
- Budget tracking
- AI-powered financial advice using Grok
- SQLite database for data storage
- RESTful API endpoints

## Project Structure
```
budget-assistant/
├── src/
│   ├── index.ts         # Main application entry
│   ├── database.ts      # Database configuration
│   └── routes/          # API routes
├── dist/                # Compiled JavaScript
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── render.yaml         # Render deployment configuration
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