import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuditAction } from '../types';

interface AuditLogEntry {
  companyId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the database.
 */
export async function logAuditEvent(entry: AuditLogEntry, req: Request): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_logs (company_id, user_id, action, entity_type, entity_id, description, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.companyId,
        entry.userId,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.description,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        req.ip || req.socket.remoteAddress || null,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', (error as Error).message);
    // Don't throw — audit logging should never break the main operation
  }
}

/**
 * Middleware that automatically logs CRUD operations.
 * Use on specific routes that need audit trails.
 */
export function auditMiddleware(entityType: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Log after response is sent
      if (req.auth && req.companyId) {
        const action = mapMethodToAction(req.method);
        const entityId = req.params.id || body?.data?.id || 'unknown';

        logAuditEvent(
          {
            companyId: req.companyId,
            userId: req.auth.userId,
            action,
            entityType,
            entityId,
            description: `${action} ${entityType} ${entityId}`,
          },
          req
        ).catch(console.error);
      }

      return originalJson(body);
    };

    next();
  };
}

function mapMethodToAction(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return AuditAction.CREATE;
    case 'PUT':
    case 'PATCH':
      return AuditAction.UPDATE;
    case 'DELETE':
      return AuditAction.DELETE;
    default:
      return AuditAction.VIEW;
  }
}
