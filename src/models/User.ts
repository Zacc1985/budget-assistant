import { Database, RunResult } from 'sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDatabase } from '../database';

export interface User {
  id?: number;
  email: string;
  password?: string;
  name: string;
  biometricId?: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  lastLogin: Date;
  loginMethods: string;  // Stored as JSON string
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  private db: Database;

  constructor() {
    this.db = getDatabase();
    this.initTable();
  }

  private async initTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        biometricId TEXT UNIQUE,
        twoFactorSecret TEXT,
        twoFactorEnabled BOOLEAN DEFAULT 0,
        lastLogin DATETIME,
        loginMethods TEXT DEFAULT '["password"]',
        isActive BOOLEAN DEFAULT 1,
        resetPasswordToken TEXT,
        resetPasswordExpires DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row ? UserModel.parseRow(row) : null);
      });
    });
  }

  async findById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? UserModel.parseRow(row) : null);
      });
    });
  }

  async findByBiometricId(biometricId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE biometricId = ?', [biometricId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? UserModel.parseRow(row) : null);
      });
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    if (userData.password) {
      const salt = await bcrypt.genSalt(12);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    const sql = `
      INSERT INTO users (email, password, name, loginMethods)
      VALUES (?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        userData.email,
        userData.password,
        userData.name,
        JSON.stringify(['password'])
      ], function(this: RunResult, err: Error | null) {
        if (err) {
          reject(err);
          return;
        }
        
        const db = getDatabase();
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err: Error | null, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(UserModel.parseRow(row));
        });
      });
    });
  }

  async update(id: number, updates: Partial<User>): Promise<User> {
    const currentUser = await this.findById(id);
    if (!currentUser) throw new Error('User not found');

    const updateFields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        values.push(key === 'loginMethods' ? JSON.stringify(value) : value);
      }
    });

    values.push(id);

    const sql = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, values, async (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const updatedUser = await this.findById(id);
          if (!updatedUser) {
            reject(new Error('User not found after update'));
            return;
          }
          resolve(updatedUser);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  static parseRow(row: any): User {
    return {
      ...row,
      loginMethods: JSON.parse(row.loginMethods),
      lastLogin: row.lastLogin ? new Date(row.lastLogin) : new Date(),
      resetPasswordExpires: row.resetPasswordExpires ? new Date(row.resetPasswordExpires) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  async comparePassword(user: User, candidatePassword: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(candidatePassword, user.password);
  }

  async generateResetToken(user: User): Promise<string> {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    await this.update(user.id!, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    return resetToken;
  }
}

export const userModel = new UserModel(); 