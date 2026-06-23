import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

/**
 * Multi-tenant middleware.
 * Ensures all data queries are scoped to the user's company.
 * Modifies req to inject companyId for downstream use.
 */
export function multiTenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // companyId is set by authenticate middleware from JWT payload
  if (!req.auth) {
    res.status(401).json({
      success: false,
      error: 'Authentication required for multi-tenant access',
    });
    return;
  }

  const { companyId, role } = req.auth;

  // Super admins can access any company's data
  // They should pass a X-Company-ID header to specify which company
  if (role === 'super_admin') {
    const headerCompanyId = req.headers['x-company-id'] as string;
    if (headerCompanyId) {
      req.companyId = headerCompanyId;
      next();
      return;
    }
    // If no header, super admin gets their own company context
    req.companyId = companyId;
    next();
    return;
  }

  // Regular users are always scoped to their own company
  req.companyId = companyId;
  next();
}

/**
 * Helper to add WHERE company_id = $1 clause to queries.
 * Pass the params array and this adds companyId as the first parameter.
 */
export function withCompanyScope(
  baseQuery: string,
  companyId: string
): { text: string; paramIndex: number } {
  const hasWhere = baseQuery.toLowerCase().includes('where');
  const scopeClause = hasWhere
    ? ` AND company_id = $${getNextParamIndex(baseQuery)}`
    : ` WHERE company_id = $1`;

  return {
    text: baseQuery + scopeClause,
    paramIndex: getNextParamIndex(baseQuery),
  };
}

function getNextParamIndex(queryString: string): number {
  // Count $1, $2, etc. in the query
  const matches = queryString.match(/\$\d+/g);
  return matches ? matches.length + 1 : 1;
}
