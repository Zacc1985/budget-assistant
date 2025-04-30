import { getDatabase } from '../database';
import { Database } from 'sqlite3';

interface TransactionPattern {
  description: string;
  category: string;
  amount: number;
  frequency: number;
  last_occurrence: string;
  confidence: number;
}

interface SpendingPattern {
  category: string;
  average_amount: number;
  monthly_frequency: number;
  day_of_month: string;
  confidence: number;
}

interface BudgetRule {
  category: string;
  percentage: number;
  current_spent: number;
  monthly_limit: number;
  last_updated: string;
}

class LocalML {
  private db: Database | null = null;
  private isInitializing = false;

  constructor() {
    this.initialize().catch(error => {
      console.error('Failed to initialize LocalML:', error);
    });
  }

  private async initialize() {
    if (this.isInitializing) {
      console.log('LocalML initialization already in progress...');
      return;
    }

    this.isInitializing = true;
    try {
      console.log('Initializing LocalML...');
      this.db = getDatabase();
      await this.initializeTables();
      console.log('LocalML initialization completed');
    } catch (error) {
      console.error('Error during LocalML initialization:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async waitForInitialization() {
    if (!this.db) {
      console.log('Waiting for database initialization...');
      await this.initialize();
    }
    return this.db!;
  }

  private async initializeTables() {
    console.log('Initializing ML tables...');
    const db = await this.waitForInitialization();

    const tables = [
      `CREATE TABLE IF NOT EXISTS transaction_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        frequency INTEGER DEFAULT 1,
        last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confidence REAL DEFAULT 0.5
      )`,
      `CREATE TABLE IF NOT EXISTS spending_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        average_amount REAL NOT NULL,
        monthly_frequency REAL NOT NULL,
        day_of_month TEXT,
        confidence REAL DEFAULT 0.5,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS ml_budget_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        percentage REAL NOT NULL,
        current_spent REAL DEFAULT 0,
        monthly_limit REAL NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await new Promise<void>((resolve, reject) => {
        db.run(table, (err) => {
          if (err) {
            console.error('Error creating table:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    console.log('ML tables initialized');
    await this.initializeBudgetRules();
  }

  private async initializeBudgetRules() {
    console.log('Initializing ML budget rules...');
    const db = await this.waitForInitialization();

    const defaultRules = [
      { category: 'Needs', percentage: 50, monthly_limit: 0 },
      { category: 'Wants', percentage: 30, monthly_limit: 0 },
      { category: 'Savings', percentage: 20, monthly_limit: 0 }
    ];

    for (const rule of defaultRules) {
      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO ml_budget_rules (category, percentage, monthly_limit)
          VALUES (?, ?, ?)
        `, [rule.category, rule.percentage, rule.monthly_limit], (err) => {
          if (err) {
            console.error('Error inserting budget rule:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    console.log('ML budget rules initialized');
  }

  // Update monthly limits based on income
  async updateMonthlyLimits(monthlyIncome: number) {
    const db = await this.waitForInitialization();
    const rules = await this.getBudgetRules();
    
    for (const rule of rules) {
      const newLimit = (monthlyIncome * rule.percentage) / 100;
      await new Promise<void>((resolve, reject) => {
        db.run(`
          UPDATE ml_budget_rules 
          SET monthly_limit = ?, last_updated = CURRENT_TIMESTAMP
          WHERE category = ?
        `, [newLimit, rule.category], (err) => {
          if (err) {
            console.error('Error updating monthly limit:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  // Get current budget rules
  async getBudgetRules(): Promise<BudgetRule[]> {
    const db = await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM ml_budget_rules', (err, rows) => {
        if (err) {
          console.error('Error getting budget rules:', err);
          reject(err);
        } else {
          resolve(rows as BudgetRule[]);
        }
      });
    });
  }

  // Check if a purchase would exceed budget limits
  async checkPurchaseAffordability(amount: number, category: string): Promise<{
    canAfford: boolean;
    remainingBudget: number;
    percentageUsed: number;
    recommendation: string;
  }> {
    const rules = await this.getBudgetRules();
    const rule = rules.find(r => r.category === category);
    
    if (!rule) {
      return {
        canAfford: false,
        remainingBudget: 0,
        percentageUsed: 0,
        recommendation: 'Category not found in budget rules'
      };
    }

    const remainingBudget = rule.monthly_limit - rule.current_spent;
    const canAfford = remainingBudget >= amount;
    const percentageUsed = ((rule.current_spent + amount) / rule.monthly_limit) * 100;

    let recommendation = '';
    if (canAfford) {
      if (percentageUsed > 80) {
        recommendation = `Warning: This purchase would use ${percentageUsed.toFixed(1)}% of your ${category} budget. Consider waiting until next month.`;
      } else {
        recommendation = `You can afford this. It would use ${percentageUsed.toFixed(1)}% of your ${category} budget.`;
      }
    } else {
      recommendation = `This purchase would exceed your ${category} budget by $${(amount - remainingBudget).toFixed(2)}.`;
    }

    return {
      canAfford,
      remainingBudget,
      percentageUsed,
      recommendation
    };
  }

  // Get budget insights
  async getBudgetInsights(): Promise<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
    status: string;
  }[]> {
    const rules = await this.getBudgetRules();
    return rules.map(rule => {
      const percentage = (rule.current_spent / rule.monthly_limit) * 100;
      let status = 'Good';
      if (percentage > 90) status = 'Critical';
      else if (percentage > 75) status = 'Warning';
      else if (percentage > 50) status = 'Caution';

      return {
        category: rule.category,
        spent: rule.current_spent,
        limit: rule.monthly_limit,
        percentage,
        status
      };
    });
  }

  // Learn from a new transaction
  async learnFromTransaction(description: string, category: string, amount: number) {
    // Update transaction pattern
    await this.db!.run(`
      INSERT INTO transaction_patterns (description, category, amount, frequency)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(description) DO UPDATE SET
        frequency = frequency + 1,
        confidence = confidence + 0.1,
        last_occurrence = CURRENT_TIMESTAMP
    `, [description, category, amount]);

    // Update spending pattern
    await this.updateSpendingPattern(category, amount);

    // Update budget rule
    await this.db!.run(`
      UPDATE ml_budget_rules 
      SET current_spent = current_spent + ?,
          last_updated = CURRENT_TIMESTAMP
      WHERE category = ?
    `, [amount, category]);
  }

  // Update spending patterns
  private async updateSpendingPattern(category: string, amount: number) {
    const today = new Date();
    const dayOfMonth = today.getDate();

    await this.db!.run(`
      INSERT INTO spending_patterns (category, average_amount, monthly_frequency, day_of_month, confidence)
      VALUES (?, ?, 1, ?, 0.5)
      ON CONFLICT(category) DO UPDATE SET
        average_amount = (average_amount * monthly_frequency + ?) / (monthly_frequency + 1),
        monthly_frequency = monthly_frequency + 1,
        day_of_month = CASE 
          WHEN day_of_month IS NULL THEN ?
          ELSE day_of_month || ',' || ?
        END,
        confidence = confidence + 0.1,
        last_updated = CURRENT_TIMESTAMP
    `, [category, amount, dayOfMonth, amount, dayOfMonth, dayOfMonth]);
  }

  // Predict category for a new transaction
  async predictCategory(description: string, amount: number): Promise<{ category: string; confidence: number }> {
    return new Promise((resolve, reject) => {
      this.db!.get<TransactionPattern>(
        `SELECT category, confidence
        FROM transaction_patterns
        WHERE description LIKE ?
        ORDER BY confidence DESC
        LIMIT 1`,
        [`%${description}%`],
        (err, pattern: TransactionPattern | undefined) => {
          if (err) {
            reject(err);
            return;
          }

          if (pattern) {
            resolve({
              category: pattern.category,
              confidence: pattern.confidence
            });
            return;
          }

          // If no exact match, look for similar spending patterns
          this.db!.get<SpendingPattern>(
            `SELECT category, confidence
            FROM spending_patterns
            WHERE ABS(average_amount - ?) < 100
            ORDER BY confidence DESC
            LIMIT 1`,
            [amount],
            (err, similarSpending: SpendingPattern | undefined) => {
              if (err) {
                reject(err);
                return;
              }

              resolve(similarSpending 
                ? { category: similarSpending.category, confidence: similarSpending.confidence }
                : { category: 'Other', confidence: 0.1 }
              );
            }
          );
        }
      );
    });
  }

  // Get spending insights
  async getSpendingInsights(): Promise<SpendingPattern[]> {
    return new Promise((resolve, reject) => {
      this.db!.all<SpendingPattern>(
        'SELECT * FROM spending_patterns',
        (err, rows: SpendingPattern[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Predict future spending
  async predictFutureSpending(category: string): Promise<{ amount: number; date: Date }> {
    return new Promise((resolve, reject) => {
      this.db!.get<SpendingPattern>(
        `SELECT average_amount, day_of_month
        FROM spending_patterns
        WHERE category = ?`,
        [category],
        (err, pattern: SpendingPattern | undefined) => {
          if (err) {
            reject(err);
            return;
          }

          if (!pattern) {
            resolve({ amount: 0, date: new Date() });
            return;
          }

          const days = pattern.day_of_month.split(',').map(Number);
          const today = new Date();
          const nextDay = Math.min(...days.filter(d => d > today.getDate())) || Math.min(...days);
          const nextDate = new Date(today.getFullYear(), today.getMonth(), nextDay);

          if (nextDay <= today.getDate()) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }

          resolve({
            amount: pattern.average_amount,
            date: nextDate
          });
        }
      );
    });
  }
}

export const localML = new LocalML(); 