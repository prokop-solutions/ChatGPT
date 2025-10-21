import jwt from 'jsonwebtoken';
import { findUserById } from '../repositories/userRepository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  findUserById(payload.sub)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: 'User not found.' });
      }
      req.user = { id: user.id, email: user.email };
      return next();
    })
    .catch((error) => {
      next(error);
    });
}
