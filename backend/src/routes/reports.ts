import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { MANAGER_OR_ABOVE } from '../middleware/rbac';
import { query } from '../config/database';

const router = Router();

/**
 * GET /api/reports/agreements-summary
 * Agreement portfolio summary.
 */
router.get('/agreements-summary', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }

    const { rows } = await query(
      `SELECT
         COUNT(*) as total_agreements,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'expiring_soon') as expiring_soon,
         COUNT(*) FILTER (WHERE status = 'expired') as expired,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
         COUNT(*) FILTER (WHERE status = 'renewed') as renewed,
         COALESCE(SUM(price) FILTER (WHERE status IN ('active', 'expiring_soon')), 0) as active_revenue,
         COALESCE(AVG(renewal_probability) FILTER (WHERE renewal_probability IS NOT NULL), 0) as avg_renewal_probability,
         COALESCE(AVG(churn_risk_score) FILTER (WHERE churn_risk_score IS NOT NULL), 0) as avg_churn_risk
       FROM maintenance_agreements
       WHERE company_id = $1`,
      [req.auth.companyId]
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch agreement summary' });
  }
});

/**
 * GET /api/reports/revenue
 * Revenue report with monthly breakdown.
 */
router.get('/revenue', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const monthsBack = parseInt(req.query.months as string) || 12;

    const { rows } = await query(
      `SELECT
         DATE_TRUNC('month', created_at) as month,
         COUNT(*) as new_agreements,
         COALESCE(SUM(price), 0) as new_revenue
       FROM maintenance_agreements
       WHERE company_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '1 month' * $2
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`,
      [req.auth.companyId, monthsBack]
    );

    const { rows: activeByMonth } = await query(
      `SELECT
         DATE_TRUNC('month', end_date) as month,
         COUNT(*) as expiring_count,
         COALESCE(SUM(price), 0) as revenue_at_risk
       FROM maintenance_agreements
       WHERE company_id = $1
         AND status IN ('active', 'expiring_soon')
         AND end_date <= CURRENT_DATE + INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', end_date)
       ORDER BY month ASC`,
      [req.auth.companyId]
    );

    res.json({
      success: true,
      data: {
        monthly_new_agreements: rows,
        upcoming_expirations: activeByMonth,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch revenue report' });
  }
});

/**
 * GET /api/reports/service-performance
 * Service call performance metrics.
 */
router.get('/service-performance', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }

    const { rows } = await query(
      `SELECT
         COUNT(*) as total_calls,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
         COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
         COALESCE(AVG(labor_hours) FILTER (WHERE status = 'completed'), 0) as avg_labor_hours,
         COALESCE(AVG(total_cost) FILTER (WHERE status = 'completed'), 0) as avg_cost,
         COALESCE(SUM(total_cost) FILTER (WHERE status = 'completed'), 0) as total_revenue,
         COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_calls,
         COUNT(*) FILTER (WHERE priority = 'high') as high_priority_calls
       FROM service_calls
       WHERE company_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '90 days'`,
      [req.auth.companyId]
    );

    // Top technicians by completed calls
    const { rows: topTechs } = await query(
      `SELECT u.id, u.first_name, u.last_name,
              COUNT(sc.id) as completed_calls,
              COALESCE(AVG(sc.total_cost), 0) as avg_revenue
       FROM service_calls sc
       JOIN users u ON u.id = sc.technician_id
       WHERE sc.company_id = $1 AND sc.status = 'completed'
         AND sc.created_at >= CURRENT_DATE - INTERVAL '90 days'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY completed_calls DESC
       LIMIT 10`,
      [req.auth.companyId]
    );

    res.json({
      success: true,
      data: {
        summary: rows[0],
        top_technicians: topTechs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch service performance' });
  }
});

/**
 * GET /api/reports/customer-acquisition
 * Customer acquisition metrics.
 */
router.get('/customer-acquisition', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }

    const { rows } = await query(
      `SELECT
         COUNT(*) as total_customers,
         COUNT(*) FILTER (WHERE is_active = true) as active_customers,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_last_30_days,
         COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '90 days') as new_last_90_days
       FROM customers
       WHERE company_id = $1`,
      [req.auth.companyId]
    );

    // Customers with no agreements
    const { rows: noAgreements } = await query(
      `SELECT COUNT(*) as count
       FROM customers c
       WHERE c.company_id = $1
         AND NOT EXISTS (SELECT 1 FROM maintenance_agreements ma WHERE ma.customer_id = c.id)`,
      [req.auth.companyId]
    );

    res.json({
      success: true,
      data: {
        ...rows[0] as any,
        customers_without_agreements: parseInt((noAgreements[0] as any).count, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer acquisition' });
  }
});

/**
 * GET /api/reports/export
 * Export report data as JSON.
 */
router.get('/export', authenticate, MANAGER_OR_ABOVE, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const type = req.query.type as string || 'agreements';

    let data;
    switch (type) {
      case 'agreements':
        const { rows: agreements } = await query(
          `SELECT ma.*, c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email
           FROM maintenance_agreements ma JOIN customers c ON c.id = ma.customer_id
           WHERE ma.company_id = $1 ORDER BY ma.end_date`,
          [req.auth.companyId]
        );
        data = agreements;
        break;
      case 'customers':
        const { rows: customers } = await query(
          `SELECT c.*, (SELECT COUNT(*) FROM maintenance_agreements ma WHERE ma.customer_id = c.id) as agreement_count
           FROM customers c WHERE c.company_id = $1 ORDER BY c.last_name`,
          [req.auth.companyId]
        );
        data = customers;
        break;
      case 'equipment':
        const { rows: equipment } = await query(
          `SELECT e.*, c.first_name || ' ' || c.last_name as customer_name
           FROM equipment e JOIN customers c ON c.id = e.customer_id
           WHERE e.company_id = $1 ORDER BY e.type`,
          [req.auth.companyId]
        );
        data = equipment;
        break;
      default:
        res.status(400).json({ success: false, error: 'Invalid export type. Use: agreements, customers, equipment' });
        return;
    }

    res.json({ success: true, data, meta: { type, exported_at: new Date().toISOString(), count: data.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to export data' });
  }
});

export default router;