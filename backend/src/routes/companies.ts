import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { SUPER_ADMIN_ONLY, MANAGER_OR_ABOVE } from '../middleware/rbac';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/companies — list all (super admin only)
router.get('/', authenticate, SUPER_ADMIN_ONLY, async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM companies ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }
    // Non-super-admins can only view their own company
    if (req.auth.role !== 'super_admin' && req.auth.companyId !== id) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
});

// PATCH /api/companies/:id
router.patch('/:id', authenticate, MANAGER_OR_ABOVE, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { name, plan_tier, max_users, max_agreements, is_active } = req.body;

    // Only super admin can change plan_tier and is_active
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (req.auth.role === 'super_admin') {
      if (plan_tier) { updates.push(`plan_tier = $${paramIndex++}`); values.push(plan_tier); }
      if (max_users !== undefined) { updates.push(`max_users = $${paramIndex++}`); values.push(max_users); }
      if (max_agreements !== undefined) { updates.push(`max_agreements = $${paramIndex++}`); values.push(max_agreements); }
      if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const { rows } = await query('SELECT * FROM companies WHERE id = $1', [id]);

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.UPDATE,
      entityType: 'company',
      entityId: id,
      description: `Updated company ${id}`,
    }, req);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update company' });
  }
});

export default router;