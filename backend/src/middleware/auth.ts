import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenPayload } from '../types';

/**
 * Middleware to verify JWT access token.
 * Attaches decoded user payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Access token is required',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
    req.auth = decoded;
    req.companyId = decoded.companyId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Access token has expired',
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: 'Invalid access token',
    });
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't fail if missing.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
      req.auth = decoded;
      req.companyId = decoded.companyId;
    } catch {
      // Token invalid — just continue without auth
    }
  }

  next();
}
