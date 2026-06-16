import Stripe from 'stripe';
import { env } from '../config/env';
import { query } from '../config/database';
import { PlanTier } from '../types';

const stripe = env.stripeSecretKey.startsWith('placeholder-')
  ? null
  : new Stripe(env.stripeSecretKey, { apiVersion: '2024-11-20.acacia' as any });

/**
 * Create a Stripe customer for a company.
 */
export async function createStripeCustomer(
  companyId: string,
  companyName: string,
  email: string
): Promise<string | null> {
  if (!stripe) {
    console.log('[STRIPE] Not configured — skipping customer creation');
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      name: companyName,
      email,
      metadata: { company_id: companyId },
    });

    await query(
      'UPDATE companies SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
      [customer.id, companyId]
    );

    return customer.id;
  } catch (error) {
    console.error('[STRIPE] Failed to create customer:', (error as Error).message);
    throw error;
  }
}

/**
 * Create or update a Stripe subscription.
 */
export async function createSubscription(
  companyId: string,
  stripeCustomerId: string,
  planTier: PlanTier
): Promise<{ subscriptionId: string; status: string; endDate: string } | null> {
  if (!stripe) {
    console.log('[STRIPE] Not configured — skipping subscription creation');
    return null;
  }

  const priceMap: Record<PlanTier, string> = {
    starter: env.stripePriceStarter,
    growth: env.stripePriceGrowth,
    pro: env.stripePricePro,
  };

  const priceId = priceMap[planTier];

  try {
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      metadata: { company_id: companyId, plan_tier: planTier },
      trial_period_days: 14,
    });

    await query(
      `UPDATE companies SET
        stripe_subscription_id = $1,
        subscription_status = $2,
        subscription_end_date = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [
        subscription.id,
        subscription.status,
        new Date(subscription.current_period_end * 1000).toISOString(),
        companyId,
      ]
    );

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      endDate: new Date(subscription.current_period_end * 1000).toISOString(),
    };
  } catch (error) {
    console.error('[STRIPE] Failed to create subscription:', (error as Error).message);
    throw error;
  }
}

/**
 * Cancel a Stripe subscription.
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    console.log('[STRIPE] Not configured — skipping subscription cancellation');
    return false;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('[STRIPE] Failed to cancel subscription:', (error as Error).message);
    throw error;
  }
}

/**
 * Handle Stripe webhook event.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata.company_id;

      if (companyId) {
        await query(
          `UPDATE companies SET
            subscription_status = $1,
            subscription_end_date = $2,
            updated_at = NOW()
          WHERE id = $3`,
          [
            subscription.status,
            new Date(subscription.current_period_end * 1000).toISOString(),
            companyId,
          ]
        );
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[STRIPE] Payment succeeded for invoice ${invoice.id}`);
      break;
    }

    case 'invoice.payment_failed': {
      const failedInvoice = event.data.object as Stripe.Invoice;
      console.log(`[STRIPE] Payment failed for invoice ${failedInvoice.id}`);
      // TODO: Send email notification to company admin
      break;
    }
  }
}