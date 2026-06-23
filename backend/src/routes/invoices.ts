import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query, transaction } from '../config/database';
import { logAuditEvent } from '../middleware/auditLogger';
import { AuditAction } from '../types';

const router = Router();

// GET /api/invoices
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const customerId = req.query.customer_id as string;

    let whereClause = 'WHERE i.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (status) { whereClause += ` AND i.status = $${paramIdx++}`; params.push(status); }
    if (customerId) { whereClause += ` AND i.customer_id = $${paramIdx++}`; params.push(customerId); }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM invoices i ${whereClause}`, params
    );
    const total = parseInt((countResult.rows[0] as any).total, 10);

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT i.*, c.first_name || ' ' || c.last_name as customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// POST /api/invoices
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { customer_id, agreement_id, service_call_id, subtotal, tax, total, due_date, line_items, notes } = req.body;

    if (!customer_id || subtotal === undefined || total === undefined || !due_date) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const id = uuidv4();
    const invoiceNumber = `INV-${req.auth.companyId.substring(0, 6)}-${Date.now().toString(36).toUpperCase()}`;

    await query(
      `INSERT INTO invoices (id, company_id, customer_id, agreement_id, service_call_id, invoice_number, subtotal, tax, total, due_date, line_items, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, req.auth.companyId, customer_id, agreement_id, service_call_id, invoiceNumber, subtotal, tax || 0, total, due_date, line_items ? JSON.stringify(line_items) : '[]', notes]
    );

    await logAuditEvent({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: AuditAction.CREATE,
      entityType: 'invoice',
      entityId: id,
      description: `Created invoice ${invoiceNumber}`,
    }, req);

    const { rows } = await query('SELECT * FROM invoices WHERE id = $1', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create invoice' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const { rows } = await query(
      `SELECT i.*, c.first_name || ' ' || c.last_name as customer_name,
              c.email, c.phone, c.address_line1, c.address_line2, c.city, c.state, c.zip_code
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.id = $1 AND i.company_id = $2`,
      [id, req.auth.companyId]
    );
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { id } = req.params;
    const allowedFields = ['status', 'subtotal', 'tax', 'total', 'due_date', 'paid_date', 'notes', 'line_items'];

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIdx++}`);
        values.push(field === 'line_items' ? JSON.stringify(req.body[field]) : req.body[field]);
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No valid fields to update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id, req.auth.companyId);

    await query(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      values
    );

    const { rows } = await query('SELECT * FROM invoices WHERE id = $1', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

export default router;