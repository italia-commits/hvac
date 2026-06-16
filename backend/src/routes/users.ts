import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { MANAGER_OR_ABOVE } from '../middleware/rbac';
import { query } from '../config/database';
import { hashPassword } from '../services/auth';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/users — list users in current company
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, role, is_email_verified,
              is_two_factor_enabled, last_login_at, is_active, created_at
       FROM users WHERE company_id = $1
       ORDER BY created_at DESC`,
      [req.auth.companyId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// POST /api/users — create user in company
router.post('/', authenticate, MANAGER_OR_ABOVE, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !firstName || !lastName || !role) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    const passwordHash = password ? await hashPassword(password) : null;

    await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, req.auth.companyId, email.toLowerCase().trim(), passwordHash, firstName, lastName, role]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: userId,
      description: `Created user ${email}`,
    }, req);

    res.status(201).json({
      success: true,
      data: { id: userId, email, firstName, lastName, role },
    });
  } catch (error: any) {
    if (error?.constraint === 'users_company_id_email_key') {
      res.status(409).json({ success: false, error: 'User with this email already exists in this company' });
      return;
    }
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, role, is_email_verified,
              is_two_factor_enabled, last_login_at, is_active, created_at
       FROM users WHERE id = $1 AND company_id = $2`,
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/:id
router.patch('/:id', authenticate, MANAGER_OR_ABOVE, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { firstName, lastName, role, is_active, password } = req.body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (firstName) { updates.push(`first_name = $${paramIndex++}`); values.push(firstName); }
    if (lastName) { updates.push(`last_name = $${paramIndex++}`); values.push(lastName); }
    if (role) { updates.push(`role = $${paramIndex++}`); values.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }
    if (password) {
      const pwHash = await hashPassword(password);
      updates.push(`password_hash = $${paramIndex++}`); values.push(pwHash);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id, req.auth.companyId);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}`,
      values
    );

    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

export default router;