import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { handleWebhookEvent } from '../services/stripe';

const router = Router();

// POST /api/webhooks/stripe
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      res.status(400).json({ success: false, error: 'Missing stripe-signature header' });
      return;
    }

    // Verify webhook signature
    if (!env.stripeWebhookSecret.startsWith('placeholder-')) {
      const stripe = require('stripe')(env.stripeSecretKey);
      const event = stripe.webhooks.constructEvent(
        JSON.stringify(req.body),
        sig,
        env.stripeWebhookSecret
      );

      await handleWebhookEvent(event);
    } else {
      console.log('[WEBHOOK] Stripe not configured — event logged:', req.body.type || 'unknown');
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Stripe webhook error:', (error as Error).message);
    res.status(400).json({ success: false, error: 'Webhook signature verification failed' });
  }
});

export default router;