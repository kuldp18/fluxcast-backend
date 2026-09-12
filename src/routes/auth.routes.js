import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: String(user._id), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: true, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: role || 'plant_owner',
    });

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    // Handle duplicate key race.
    if (err?.code === 11000) {
      return res.status(400).json({ error: true, message: 'Email already registered' });
    }
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const token = signToken(user);

    return res.status(200).json({ token, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }
    return res.status(200).json(user.toJSON());
  } catch (err) {
    return next(err);
  }
});

export const authRoutes = router;
