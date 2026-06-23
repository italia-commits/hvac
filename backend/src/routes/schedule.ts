import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { SUPER_ADMIN_ONLY } from '../middleware/rbac';
import { runExpirationCheck, processExpiredAgreements } from '../services/scheduler';

const router = Router();

/**
 * POST /api/schedule/check-expirations
 * Manually trigger the expiration workflow check.
 * Super admin only — runs all milestones.
 */
router.post('/check-expirations', authenticate, SUPER_ADMIN_ONLY, async (_req: Request, res: Response) => {
  try {
    const result = await runExpirationCheck();
    const expiredCount = await processExpiredAgreements();

    res.json({
      success: true,
      data: {
        ...result,
        expired_agreements_processed: expiredCount,
      },
      message: `Expiration check complete. ${result.total_processed} actions processed, ${expiredCount} agreements expired/renewed.`,
    });
  } catch (error) {
    console.error('[SCHEDULE] Check expirations error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Failed to run expiration check' });
  }
});

/**
 * GET /api/schedule/status
 * Returns the current scheduler status.
 */
router.get('/status', authenticate, async (_req: Request, res: Response) => {
  try {
    // Get upcoming expiration counts for the dashboard
    const { rows: upcoming } = await query(
      `SELECT
        COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as critical,
        COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days') as warning,
        COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '90 days') as normal
       FROM maintenance_agreements
       WHERE company_id = $1
         AND status IN ('active', 'expiring_soon')`,
      [_req.companyId || '']
    );

    res.json({
      success: true,
      data: {
        upcoming_expirations: upcoming[0] || { critical: 0, warning: 0, normal: 0 },
        scheduler_healthy: true,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get scheduler status' });
  }
});

// Need query for the status endpoint
import { query } from '../config/database';

export default router;