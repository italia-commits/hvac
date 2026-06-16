import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/customers
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let whereClause = 'WHERE company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (search) {
      whereClause += ` AND (LOWER(first_name || ' ' || last_name) LIKE LOWER($${paramIdx}) OR email ILIKE $${paramIdx} OR phone LIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      params
    );
    const total = parseInt((countResult.rows[0] as any).total, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT * FROM customers ${whereClause} ORDER BY last_name, first_name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// POST /api/customers
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { first_name, last_name, email, phone, mobile, address_line1, address_line2, city, state, zip_code, notes } = req.body;

    if (!first_name || !last_name) {
      res.status(400).json({ success: false, error: 'First name and last name are required' });
      return;
    }

    const id = uuidv4();
    await query(
      `INSERT INTO customers (id, company_id, first_name, last_name, email, phone, mobile, address_line1, address_line2, city, state, zip_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, req.auth.companyId, first_name, last_name, email, phone, mobile, address_line1, address_line2, city, state, zip_code, notes]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'customer',
      entityId: id,
      description: `Created customer ${first_name} ${last_name}`,
    }, req);

    const { rows } = await query('SELECT * FROM customers WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      'SELECT * FROM customers WHERE id = $1 AND company_id = $2',
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'mobile', 'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'notes', 'is_active'];

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIdx++}`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id, req.auth.companyId);

    await query(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.UPDATE,
      entityType: 'customer',
      entityId: id,
      description: `Updated customer ${id}`,
    }, req);

    const { rows } = await query('SELECT * FROM customers WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;

    const { rowCount } = await query(
      'DELETE FROM customers WHERE id = $1 AND company_id = $2',
      [id, req.auth.companyId]
    );

    if (rowCount === 0) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.DELETE,
      entityType: 'customer',
      entityId: id,
      description: `Deleted customer ${id}`,
    }, req);

    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
});

export default router;