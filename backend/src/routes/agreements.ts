import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/agreements
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const customerId = req.query.customer_id as string;

    let whereClause = 'WHERE ma.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (status) { whereClause += ` AND ma.status = $${paramIdx++}`; params.push(status); }
    if (customerId) { whereClause += ` AND ma.customer_id = $${paramIdx++}`; params.push(customerId); }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM maintenance_agreements ma ${whereClause}`,
      params
    );
    const total = parseInt((countResult.rows[0] as any).total, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT ma.*, c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone
       FROM maintenance_agreements ma
       JOIN customers c ON c.id = ma.customer_id
       ${whereClause}
       ORDER BY ma.end_date ASC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch agreements' });
  }
});

// POST /api/agreements
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { customer_id, equipment_ids, start_date, end_date, plan_name, price, auto_renew, notes } = req.body;

    if (!customer_id || !start_date || !end_date || !plan_name || price === undefined) {
      res.status(400).json({ success: false, error: 'Missing required fields: customer_id, start_date, end_date, plan_name, price' });
      return;
    }

    const id = uuidv4();
    const agreementNumber = `AGR-${req.auth.companyId.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    await query(
      `INSERT INTO maintenance_agreements (id, company_id, customer_id, equipment_ids, agreement_number, start_date, end_date, plan_name, price, auto_renew, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, req.auth.companyId, customer_id, equipment_ids || [], agreementNumber, start_date, end_date, plan_name, price, auto_renew !== false, notes]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'maintenance_agreement',
      entityId: id,
      description: `Created agreement ${agreementNumber} for customer ${customer_id}`,
    }, req);

    const { rows } = await query('SELECT * FROM maintenance_agreements WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create agreement' });
  }
});

// GET /api/agreements/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      `SELECT ma.*, c.first_name || ' ' || c.last_name as customer_name,
              c.email, c.phone, c.address_line1, c.city, c.state, c.zip_code
       FROM maintenance_agreements ma
       JOIN customers c ON c.id = ma.customer_id
       WHERE ma.id = $1 AND ma.company_id = $2`,
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Agreement not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch agreement' });
  }
});

// PATCH /api/agreements/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['plan_name', 'price', 'start_date', 'end_date', 'renewal_date', 'status', 'auto_renew', 'churn_risk_score', 'renewal_probability', 'notes', 'equipment_ids'];

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIdx++}`);
        values.push(field === 'equipment_ids' ? JSON.stringify(req.body[field]) : req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id, req.auth.companyId);

    await query(
      `UPDATE maintenance_agreements SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    const { rows } = await query('SELECT * FROM maintenance_agreements WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update agreement' });
  }
});

// POST /api/agreements/:id/renew
router.post('/:id/renew', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { new_end_date, price } = req.body;

    const { rows } = await query(
      'SELECT * FROM maintenance_agreements WHERE id = $1 AND company_id = $2',
      [id, req.auth.companyId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Agreement not found' });
      return;
    }

    const agreement = rows[0] as any;
    const endDate = new_end_date || new Date(new Date(agreement.end_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await query(
      `UPDATE maintenance_agreements SET
        status = 'renewed', end_date = $1, renewal_date = NOW(),
        price = COALESCE($2, price), updated_at = NOW()
       WHERE id = $3`,
      [endDate, price, id]
    );

    const { rows: updatedRows } = await query('SELECT * FROM maintenance_agreements WHERE id = $1', [id]);

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.UPDATE,
      entityType: 'maintenance_agreement',
      entityId: id,
      description: `Renewed agreement ${agreement.agreement_number} through ${endDate}`,
    }, req);

    res.json({ success: true, data: updatedRows[0], message: 'Agreement renewed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to renew agreement' });
  }
});

export default router;