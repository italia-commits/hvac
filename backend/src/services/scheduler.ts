/**
 * HVAC RenewIQ — Agreement Expiration Workflow Scheduler
 *
 * Runs daily checks to process agreements approaching expiry and sends
 * automated email campaigns at key milestones:
 *   - 90 days:  Initial renewal reminder
 *   - 60 days:  Follow-up email + internal task
 *   - 30 days:  Notify office manager
 *   - 15 days:  Notify sales rep
 *   - 7 days:   Escalate to management
 */

import { query } from '../config/database';
import { sendEmail, getAgreementExpiringHtml } from './email';
import { env } from '../config/env';

interface ExpiringAgreement {
  id: string;
  company_id: string;
  customer_id: string;
  agreement_number: string;
  end_date: string;
  customer_name: string;
  customer_email: string;
  days_until_expiry: number;
}

export interface MilestoneAction {
  days: number;
  label: string;
  action: 'send_email' | 'create_task' | 'escalate';
  severity: 'info' | 'warning' | 'critical';
}

const MILESTONES: MilestoneAction[] = [
  { days: 90, label: '90-day renewal reminder', action: 'send_email', severity: 'info' },
  { days: 60, label: '60-day follow-up', action: 'send_email', severity: 'info' },
  { days: 60, label: '60-day internal task', action: 'create_task', severity: 'info' },
  { days: 30, label: '30-day manager notification', action: 'send_email', severity: 'warning' },
  { days: 15, label: '15-day sales rep notification', action: 'send_email', severity: 'warning' },
  { days: 7, label: '7-day escalation', action: 'escalate', severity: 'critical' },
];

/**
 * Find all agreements expiring in the given number of days.
 */
async function findAgreementsExpiringIn(days: number): Promise<ExpiringAgreement[]> {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const dateStr = targetDate.toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT ma.id, ma.company_id, ma.customer_id, ma.agreement_number, ma.end_date,
            c.first_name || ' ' || c.last_name as customer_name,
            c.email as customer_email,
            $3::int - EXTRACT(DAY FROM (ma.end_date - CURRENT_DATE))::int as days_until_expiry
     FROM maintenance_agreements ma
     JOIN customers c ON c.id = ma.customer_id
     WHERE ma.status IN ('active', 'expiring_soon')
       AND ma.end_date = $1::date
       AND ma.auto_renew = true
       AND c.email IS NOT NULL`,
    [dateStr, false, days]
  );

  // Recalculate days_until_expiry properly
  return (rows as any[]).map(r => ({
    ...r,
    days_until_expiry: days,
  })) as ExpiringAgreement[];
}

/**
 * Log a workflow action to the activity log.
 */
async function logWorkflowAction(
  companyId: string,
  agreementId: string,
  milestone: string,
  details: string
): Promise<void> {
  await query(
    `INSERT INTO activity_logs (company_id, user_id, action, entity_type, entity_id, description, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      companyId,
      '00000000-0000-0000-0000-000000000000', // system user
      'VIEW',
      'workflow',
      agreementId,
      details,
      JSON.stringify({ milestone, timestamp: new Date().toISOString() }),
    ]
  );
}

/**
 * Send a renewal reminder email for an agreement.
 */
async function sendRenewalReminder(
  agreement: ExpiringAgreement,
  milestone: MilestoneAction
): Promise<void> {
  const renewalUrl = `${env.frontendUrl}/agreements/${agreement.id}/renew`;
  const subjectMap: Record<string, string> = {
    info: `Renewal Reminder: Agreement ${agreement.agreement_number}`,
    warning: `URGENT: Agreement ${agreement.agreement_number} Expiring Soon`,
    critical: `CRITICAL: ${agreement.agreement_number} - Immediate Action Required`,
  };

  await sendEmail({
    to: agreement.customer_email,
    subject: subjectMap[milestone.severity] || subjectMap.info,
    html: getAgreementExpiringHtml(
      agreement.customer_name,
      agreement.agreement_number,
      new Date(agreement.end_date).toLocaleDateString(),
      renewalUrl
    ),
  });
}

/**
 * Create an internal task/notification for a team member.
 */
async function createInternalTask(
  agreement: ExpiringAgreement,
  milestone: MilestoneAction
): Promise<void> {
  // Log the task creation in activity_logs
  await logWorkflowAction(
    agreement.company_id,
    agreement.id,
    milestone.label,
    `System created task: ${milestone.label} for agreement ${agreement.agreement_number} (expires ${agreement.end_date})`
  );

  console.log(
    `[SCHEDULER] Task created: ${milestone.label} for ${agreement.agreement_number}`
  );
}

/**
 * Escalate to management by sending an escalation email.
 */
async function escalateToManagement(
  agreement: ExpiringAgreement,
  _milestone: MilestoneAction
): Promise<void> {
  // Find company admins and managers
  const { rows: admins } = await query(
    `SELECT email, first_name FROM users
     WHERE company_id = $1
       AND role IN ('company_admin', 'manager')
       AND is_active = true
       AND email IS NOT NULL`,
    [agreement.company_id]
  );

  for (const admin of admins as any[]) {
    const subject = `ESCALATION: Agreement ${agreement.agreement_number} expires in 7 days`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⛔ Agreement Expiration Escalation</h2>
        <p>Hi ${admin.first_name},</p>
        <p>This is an <strong>escalation notice</strong> for the following agreement:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${agreement.customer_name}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Agreement</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${agreement.agreement_number}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Expires</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date(agreement.end_date).toLocaleDateString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">⚠️ URGENT - Action Required</td></tr>
        </table>
        <p>Please take immediate action to secure this renewal.</p>
        <p>If the agreement expires without renewal, the customer may be lost to a competitor.</p>
      </div>
    `;

    await sendEmail({
      to: admin.email,
      subject,
      html,
    });
  }
}

/**
 * Process a single milestone for all matching agreements.
 */
async function processMilestone(milestone: MilestoneAction): Promise<number> {
  const agreements = await findAgreementsExpiringIn(milestone.days);
  let processed = 0;

  for (const agreement of agreements) {
    try {
      switch (milestone.action) {
        case 'send_email':
          await sendRenewalReminder(agreement, milestone);
          break;
        case 'create_task':
          await createInternalTask(agreement, milestone);
          break;
        case 'escalate':
          await escalateToManagement(agreement, milestone);
          break;
      }

      await logWorkflowAction(
        agreement.company_id,
        agreement.id,
        milestone.label,
        `${milestone.label}: ${milestone.action} sent for agreement ${agreement.agreement_number}`
      );

      // Update agreement status to expiring_soon
      await query(
        `UPDATE maintenance_agreements SET status = 'expiring_soon', updated_at = NOW()
         WHERE id = $1 AND status = 'active'`,
        [agreement.id]
      );

      processed++;
    } catch (error) {
      console.error(
        `[SCHEDULER] Failed to process ${milestone.label} for ${agreement.agreement_number}:`,
        (error as Error).message
      );
    }
  }

  return processed;
}

/**
 * Run the full expiration workflow check.
 * Processes all milestones and returns a summary.
 */
export async function runExpirationCheck(): Promise<{
  total_processed: number;
  milestones: Record<string, number>;
}> {
  console.log('[SCHEDULER] Running agreement expiration check...');

  const results: Record<string, number> = {};
  let total = 0;

  for (const milestone of MILESTONES) {
    const count = await processMilestone(milestone);
    results[milestone.label] = count;
    total += count;

    if (count > 0) {
      console.log(`[SCHEDULER] ${milestone.label}: processed ${count} agreements`);
    }
  }

  console.log(`[SCHEDULER] Check complete. Processed ${total} total actions.`);

  return {
    total_processed: total,
    milestones: results,
  };
}

/**
 * Check for agreements that recently expired and update their status.
 */
export async function processExpiredAgreements(): Promise<number> {
  const { rowCount } = await query(
    `UPDATE maintenance_agreements
     SET status = 'expired', updated_at = NOW()
     WHERE status IN ('active', 'expiring_soon')
       AND end_date < CURRENT_DATE
       AND auto_renew = false`
  );

  if (rowCount && rowCount > 0) {
    console.log(`[SCHEDULER] Marked ${rowCount} agreements as expired`);
  }

  // For auto-renew agreements, auto-renew them
  const { rowCount: renewedCount } = await query(
    `UPDATE maintenance_agreements
     SET status = 'renewed',
         end_date = end_date + INTERVAL '1 year',
         renewal_date = NOW(),
         updated_at = NOW()
     WHERE status IN ('active', 'expiring_soon')
       AND end_date < CURRENT_DATE
       AND auto_renew = true`
  );

  if (renewedCount && renewedCount > 0) {
    console.log(`[SCHEDULER] Auto-renewed ${renewedCount} agreements`);
  }

  return (rowCount || 0) + (renewedCount || 0);
}