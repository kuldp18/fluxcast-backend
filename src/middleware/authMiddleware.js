import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }

  const [scheme, ...rest] = String(header).split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || rest.length === 0) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }

  const token = rest.join(' ').trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: true, message: 'Unauthorized' });
  }
}

export { authMiddleware };
