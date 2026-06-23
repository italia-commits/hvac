import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/service-calls
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const customerId = req.query.customer_id as string;
    const technicianId = req.query.technician_id as string;

    let whereClause = 'WHERE sc.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (status) { whereClause += ` AND sc.status = $${paramIdx++}`; params.push(status); }
    if (customerId) { whereClause += ` AND sc.customer_id = $${paramIdx++}`; params.push(customerId); }
    if (technicianId) { whereClause += ` AND sc.technician_id = $${paramIdx++}`; params.push(technicianId); }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM service_calls sc ${whereClause}`, params
    );
    const total = parseInt((countResult.rows[0] as any).total, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT sc.*,
              c.first_name || ' ' || c.last_name as customer_name,
              u.first_name || ' ' || u.last_name as technician_name
       FROM service_calls sc
       JOIN customers c ON c.id = sc.customer_id
       LEFT JOIN users u ON u.id = sc.technician_id
       ${whereClause}
       ORDER BY sc.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch service calls' });
  }
});

// POST /api/service-calls
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { customer_id, equipment_id, agreement_id, technician_id, title, description, priority, scheduled_date } = req.body;

    if (!customer_id || !title) {
      res.status(400).json({ success: false, error: 'Customer ID and title are required' });
      return;
    }

    const id = uuidv4();
    await query(
      `INSERT INTO service_calls (id, company_id, customer_id, equipment_id, agreement_id, technician_id, title, description, priority, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, req.auth.companyId, customer_id, equipment_id, agreement_id, technician_id, title, description, priority || 'medium', scheduled_date]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'service_call',
      entityId: id,
      description: `Created service call: ${title}`,
    }, req);

    const { rows } = await query('SELECT * FROM service_calls WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create service call' });
  }
});

// GET /api/service-calls/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      `SELECT sc.*,
              c.first_name || ' ' || c.last_name as customer_name,
              u.first_name || ' ' || u.last_name as technician_name
       FROM service_calls sc
       JOIN customers c ON c.id = sc.customer_id
       LEFT JOIN users u ON u.id = sc.technician_id
       WHERE sc.id = $1 AND sc.company_id = $2`,
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Service call not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch service call' });
  }
});

// PATCH /api/service-calls/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['title', 'description', 'status', 'priority', 'scheduled_date', 'completed_date', 'technician_id', 'labor_hours', 'labor_cost', 'parts_cost', 'total_cost', 'notes'];

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
      `UPDATE service_calls SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    const { rows } = await query('SELECT * FROM service_calls WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update service call' });
  }
});

export default router;