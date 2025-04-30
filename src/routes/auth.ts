import express, { Request, Response } from 'express';
import { userModel, User } from '../models/User';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { validateRequest } from '../middleware/security';

const router = express.Router();

// Register new user
router.post('/register', validateRequest, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = await userModel.create({
      email,
      password,
      name,
      loginMethods: '["password"]'
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with password
router.post('/login/password', validateRequest, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await userModel.findByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await userModel.comparePassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.json({
        requiresTwoFactor: true,
        tempToken: jwt.sign(
          { userId: user.id, temp: true },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '5m' }
        )
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login
    await userModel.update(user.id!, {
      lastLogin: new Date()
    });

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify 2FA token
router.post('/verify-2fa', validateRequest, async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    
    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'your-secret-key') as { userId: number };
    const user = await userModel.findById(decoded.userId);
    
    if (!user || !user.twoFactorSecret) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Verify 2FA code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Generate final token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login
    await userModel.update(user.id!, {
      lastLogin: new Date()
    });

    res.json({ token });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Setup 2FA
router.post('/setup-2fa', validateRequest, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new secret
    const secret = authenticator.generateSecret();
    await userModel.update(user.id!, {
      twoFactorSecret: secret,
      twoFactorEnabled: true
    });

    // Generate QR code data
    const otpauth = authenticator.keyuri(
      user.email,
      'Budget Assistant',
      secret
    );

    res.json({
      secret,
      otpauth
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Enable biometric login
router.post('/enable-biometric', validateRequest, async (req: Request, res: Response) => {
  try {
    const { userId, biometricId } = req.body;
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const loginMethods = JSON.parse(user.loginMethods);
    loginMethods.push('biometric');

    await userModel.update(user.id!, {
      biometricId,
      loginMethods: JSON.stringify(loginMethods)
    });

    res.json({ message: 'Biometric login enabled' });
  } catch (error) {
    console.error('Biometric setup error:', error);
    res.status(500).json({ error: 'Failed to enable biometric login' });
  }
});

// Login with biometric
router.post('/login/biometric', validateRequest, async (req: Request, res: Response) => {
  try {
    const { biometricId } = req.body;
    const user = await userModel.findByBiometricId(biometricId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Update last login
    await userModel.update(user.id!, {
      lastLogin: new Date()
    });

    res.json({ token });
  } catch (error) {
    console.error('Biometric login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export const authRoutes = router; 