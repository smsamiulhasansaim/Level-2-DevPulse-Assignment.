import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/responseHelper';
import { JwtPayload, UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; name: string; role: UserRole };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader; // Spec: Authorization: <JWT_TOKEN> (no Bearer prefix)

  if (!token) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = { id: decoded.id, name: decoded.name, role: decoded.role };
    next();
  } catch (error) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, StatusCodes.FORBIDDEN, 'Forbidden: Insufficient permissions');
    }
    next();
  };
};