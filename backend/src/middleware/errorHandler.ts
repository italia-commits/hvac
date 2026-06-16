import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  console.error(`[ERROR] ${statusCode} - ${err.message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Helper to create operational errors with status codes.
 */
export function createError(statusCode: number, message: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
