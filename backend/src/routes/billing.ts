import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { SUPER_ADMIN_ONLY } from '../middleware/rbac';
import { query } from '../config/database';
import { env } from '../config/env';
import { createStripeCustomer, createSubscription, cancelSubscription } from '../services/stripe';
import { PlanTier } from '../types';

const router = Router();

// GET /api/billing/subscription — current subscription status
router.get('/subscription', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { rows } = await query(
      `SELECT plan_tier, stripe_customer_id, stripe_subscription_id,
              subscription_status, subscription_end_date, is_active,
              max_users, max_agreements
       FROM companies WHERE id = $1`,
      [req.auth.companyId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// POST /api/billing/subscription — create or upgrade subscription
router.post('/subscription', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { plan_tier } = req.body;

    if (!plan_tier || !['starter', 'growth', 'pro'].includes(plan_tier)) {
      res.status(400).json({ success: false, error: 'Valid plan_tier required: starter, growth, or pro' });
      return;
    }

    const { rows } = await query(
      'SELECT * FROM companies WHERE id = $1',
      [req.auth.companyId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Company not found' });
      return;
    }

    const company = rows[0] as any;

    // Create Stripe customer if needed
    if (!company.stripe_customer_id) {
      const stripeCustomerId = await createStripeCustomer(
        req.auth.companyId,
        company.name,
        req.auth.email
      );

      if (!stripeCustomerId) {
        // Stripe not configured — just update locally
        await query(
          'UPDATE companies SET plan_tier = $1, updated_at = NOW() WHERE id = $2',
          [plan_tier, req.auth.companyId]
        );
      } else {
        await createSubscription(req.auth.companyId, stripeCustomerId, plan_tier as PlanTier);
      }
    } else {
      // Existing customer — update subscription
      await createSubscription(req.auth.companyId, company.stripe_customer_id, plan_tier as PlanTier);
    }

    const { rows: updated } = await query(
      'SELECT * FROM companies WHERE id = $1',
      [req.auth.companyId]
    );

    res.json({ success: true, data: updated[0], message: `Subscription updated to ${plan_tier}` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update subscription' });
  }
});

// POST /api/billing/cancel — cancel subscription
router.post('/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.auth) { res.status(401).json({ success: false, error: 'Auth required' }); return; }
    const { rows } = await query(
      'SELECT stripe_subscription_id FROM companies WHERE id = $1',
      [req.auth.companyId]
    );

    if (rows.length === 0 || !(rows[0] as any).stripe_subscription_id) {
      res.status(400).json({ success: false, error: 'No active subscription' });
      return;
    }

    await cancelSubscription((rows[0] as any).stripe_subscription_id);

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// GET /api/billing/plans — list available plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'starter', name: 'Starter', price: 99, currency: 'USD', interval: 'month', users: 5, agreements: 200 },
      { id: 'growth', name: 'Growth', price: 299, currency: 'USD', interval: 'month', users: 25, agreements: 1000 },
      { id: 'pro', name: 'Pro', price: 599, currency: 'USD', interval: 'month', users: 100, agreements: 5000 },
    ],
  });
});

export default router;