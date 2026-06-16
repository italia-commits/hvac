import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/opportunities
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const customerId = req.query.customer_id as string;
    const source = req.query.source as string;

    let whereClause = 'WHERE ro.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (status) { whereClause += ` AND ro.status = $${paramIdx++}`; params.push(status); }
    if (customerId) { whereClause += ` AND ro.customer_id = $${paramIdx++}`; params.push(customerId); }
    if (source) { whereClause += ` AND ro.source = $${paramIdx++}`; params.push(source); }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM replacement_opportunities ro ${whereClause}`, params
    );
    const total = parseInt((countResult.rows[0] as any).total, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT ro.*,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone,
              e.type as equipment_type, e.manufacturer, e.model, e.age_years
       FROM replacement_opportunities ro
       JOIN customers c ON c.id = ro.customer_id
       JOIN equipment e ON e.id = ro.equipment_id
       ${whereClause}
       ORDER BY ro.priority_score DESC NULLS LAST, ro.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch opportunities' });
  }
});

// POST /api/opportunities
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { customer_id, equipment_id, agreement_id, title, description, estimated_value, probability_score, source, notes } = req.body;

    if (!customer_id || !equipment_id || !title) {
      res.status(400).json({ success: false, error: 'Customer ID, equipment ID, and title are required' });
      return;
    }

    const id = uuidv4();
    const priorityScore = probability_score
      ? Math.min(100, Math.round(probability_score * (estimated_value ? Math.min(estimated_value / 1000, 1) : 0.5)))
      : null;

    await query(
      `INSERT INTO replacement_opportunities (id, company_id, customer_id, equipment_id, agreement_id, title, description, estimated_value, probability_score, priority_score, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, req.auth.companyId, customer_id, equipment_id, agreement_id, title, description, estimated_value, probability_score, priorityScore, source || 'manual', notes]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'replacement_opportunity',
      entityId: id,
      description: `Created opportunity: ${title}`,
    }, req);

    const { rows } = await query('SELECT * FROM replacement_opportunities WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create opportunity' });
  }
});

// PATCH /api/opportunities/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['title', 'description', 'status', 'estimated_value', 'probability_score', 'recommended_action', 'notes'];

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
      `UPDATE replacement_opportunities SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    const { rows } = await query('SELECT * FROM replacement_opportunities WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update opportunity' });
  }
});

export default router;