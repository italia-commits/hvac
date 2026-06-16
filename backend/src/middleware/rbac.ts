import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

/**
 * Role-based access control middleware.
 * Checks if the authenticated user has one of the allowed roles.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Required role: ' + allowedRoles.join(', '),
      });
      return;
    }

    next();
  };
}

// Pre-defined role combinations for convenience
export const ADMIN_OR_ABOVE = authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN);
export const MANAGER_OR_ABOVE = authorize(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MANAGER);
export const ALL_AUTHENTICATED = authorize(
  UserRole.SUPER_ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.MANAGER,
  UserRole.TECHNICIAN,
  UserRole.DISPATCHER
);
export const SUPER_ADMIN_ONLY = authorize(UserRole.SUPER_ADMIN);
