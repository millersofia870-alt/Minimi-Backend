import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, UserRole } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export interface AuthedRequest extends Request {
  user?: { id: string; role: UserRole };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Missing or malformed Authorization header', 401));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Forbidden for this role', 403));
    next();
  };
}
