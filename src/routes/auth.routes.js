import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { User } from '../models/User.js';

const router = express.Router();

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

    const token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
});

export const authRoutes = router;
