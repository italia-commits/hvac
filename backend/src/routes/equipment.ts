import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/equipment
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const customerId = req.query.customer_id as string;
    const type = req.query.type as string;

    let whereClause = 'WHERE e.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (customerId) {
      whereClause += ` AND e.customer_id = $${paramIdx++}`;
      params.push(customerId);
    }
    if (type) {
      whereClause += ` AND e.type = $${paramIdx++}`;
      params.push(type);
    }

    const { rows } = await query(
      `SELECT e.*, c.first_name || ' ' || c.last_name as customer_name
       FROM equipment e
       JOIN customers c ON c.id = e.customer_id
       ${whereClause}
       ORDER BY e.created_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch equipment' });
  }
});

// POST /api/equipment
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { customer_id, type, manufacturer, model, serial_number, installation_date, warranty_expiration, condition_score, notes } = req.body;

    if (!customer_id || !type) {
      res.status(400).json({ success: false, error: 'Customer ID and equipment type are required' });
      return;
    }

    const id = uuidv4();
    await query(
      `INSERT INTO equipment (id, company_id, customer_id, type, manufacturer, model, serial_number, installation_date, warranty_expiration, condition_score, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, req.auth.companyId, customer_id, type, manufacturer, model, serial_number, installation_date, warranty_expiration, condition_score, notes]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'equipment',
      entityId: id,
      description: `Created ${type} equipment for customer ${customer_id}`,
    }, req);

    const { rows } = await query('SELECT * FROM equipment WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create equipment' });
  }
});

// GET /api/equipment/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      `SELECT e.*, c.first_name || ' ' || c.last_name as customer_name
       FROM equipment e JOIN customers c ON c.id = e.customer_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Equipment not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch equipment' });
  }
});

// PATCH /api/equipment/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['type', 'manufacturer', 'model', 'serial_number', 'installation_date', 'warranty_expiration', 'condition_score', 'notes', 'is_active'];

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
      `UPDATE equipment SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    const { rows } = await query('SELECT * FROM equipment WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update equipment' });
  }
});

export default router;