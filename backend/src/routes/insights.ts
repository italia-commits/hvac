import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { MANAGER_OR_ABOVE } from '../middleware/rbac';
import { query } from '../config/database';
import { batchUpdateScores } from '../services/ai/renewalEngine';
import { generateOpportunities } from '../services/ai/replacementEngine';

const router = Router();

/**
 * GET /api/insights/renewal-predictions
 * Customers most likely to renew (highest renewal_probability).
 */
router.get('/renewal-predictions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const limit = parseInt(req.query.limit as string) || 20;

    const { rows } = await query(
      `SELECT ma.id, ma.agreement_number, ma.renewal_probability, ma.churn_risk_score,
              ma.end_date, ma.plan_name, ma.price,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone
       FROM maintenance_agreements ma
       JOIN customers c ON c.id = ma.customer_id
       WHERE ma.company_id = $1 AND ma.status IN ('active', 'expiring_soon')
         AND ma.renewal_probability IS NOT NULL
       ORDER BY ma.renewal_probability DESC
       LIMIT $2`,
      [req.auth.companyId, limit]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch renewal predictions' });
  }
});

/**
 * GET /api/insights/churn-risk
 * Customers most likely to cancel (highest churn_risk_score).
 */
router.get('/churn-risk', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const limit = parseInt(req.query.limit as string) || 20;

    const { rows } = await query(
      `SELECT ma.id, ma.agreement_number, ma.renewal_probability, ma.churn_risk_score,
              ma.end_date, ma.plan_name, ma.price,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone
       FROM maintenance_agreements ma
       JOIN customers c ON c.id = ma.customer_id
       WHERE ma.company_id = $1 AND ma.status IN ('active', 'expiring_soon')
         AND ma.churn_risk_score IS NOT NULL
       ORDER BY ma.churn_risk_score DESC
       LIMIT $2`,
      [req.auth.companyId, limit]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch churn risk data' });
  }
});

/**
 * GET /api/insights/replacement-opportunities
 * Highest value replacement opportunities.
 */
router.get('/replacement-opportunities', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    let whereClause = 'WHERE ro.company_id = $1';
    const params: unknown[] = [req.auth.companyId];
    let paramIdx = 2;

    if (status) {
      whereClause += ` AND ro.status = $${paramIdx++}`;
      params.push(status);
    }

    params.push(limit);
    const { rows } = await query(
      `SELECT ro.*,
              c.first_name || ' ' || c.last_name as customer_name,
              c.email as customer_email, c.phone as customer_phone,
              e.type as equipment_type, e.manufacturer, e.model, e.age_years
       FROM replacement_opportunities ro
       JOIN customers c ON c.id = ro.customer_id
       JOIN equipment e ON e.id = ro.equipment_id
       ${whereClause}
       ORDER BY ro.priority_score DESC NULLS LAST, ro.estimated_value DESC
       LIMIT $${paramIdx}`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch replacement opportunities' });
  }
});

/**
 * GET /api/insights/revenue-forecast
 * Revenue forecasting data.
 */
router.get('/revenue-forecast', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }

    // Current monthly recurring revenue from active agreements
    const { rows: mrr } = await query(
      `SELECT COUNT(*) as active_agreements,
              COALESCE(SUM(ma.price), 0) as total_monthly_revenue,
              COALESCE(AVG(ma.price), 0) as avg_agreement_value,
              COALESCE(SUM(ma.price) FILTER (WHERE ma.status = 'expiring_soon'), 0) as at_risk_revenue
       FROM maintenance_agreements ma
       WHERE ma.company_id = $1 AND ma.status IN ('active', 'expiring_soon')`,
      [req.auth.companyId]
    );

    // Upcoming expirations count by month
    const { rows: expirations } = await query(
      `SELECT
         DATE_TRUNC('month', end_date) as month,
         COUNT(*) as expiring_count,
         COALESCE(SUM(price), 0) as revenue_at_risk
       FROM maintenance_agreements
       WHERE company_id = $1 AND status IN ('active', 'expiring_soon')
       GROUP BY DATE_TRUNC('month', end_date)
       ORDER BY month ASC
       LIMIT 12`,
      [req.auth.companyId]
    );

    const data = mrr[0] as any;
    res.json({
      success: true,
      data: {
        current_mrr: data.total_monthly_revenue,
        active_agreements: parseInt(data.active_agreements, 10),
        avg_agreement_value: parseFloat(data.avg_agreement_value),
        at_risk_revenue: parseFloat(data.at_risk_revenue),
        monthly_expirations: expirations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch revenue forecast' });
  }
});

/**
 * POST /api/insights/run-analysis
 * Manually trigger AI analysis for all agreements.
 */
router.post('/run-analysis', authenticate, MANAGER_OR_ABOVE, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }

    const scores = await batchUpdateScores(req.auth.companyId);
    const opportunities = await generateOpportunities(req.auth.companyId);

    res.json({
      success: true,
      data: {
        scores_updated: scores.updated,
        opportunities_created: opportunities.created,
      },
      message: `Analysis complete: ${scores.updated} agreements scored, ${opportunities.created} opportunities created`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to run analysis' });
  }
});

export default router;