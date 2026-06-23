/**
 * Utility functions for the HVAC RenewIQ backend.
 */

/**
 * Generate a UUID v4 string.
 */
export function generateId(): string {
  const { v4 } = require('uuid');
  return v4();
}

/**
 * Sanitize a string for use in SQL ILIKE queries.
 */
export function sanitizeLikeString(input: string): string {
  return input.replace(/[%_]/g, '\\$&');
}

/**
 * Format a number as currency.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Calculate age in years from a date string.
 */
export function calculateAge(dateStr: string): number {
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Async wrapper for Express route handlers to catch errors.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Check if a string is a valid UUID.
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}