/**
 * HVAC RenewIQ — AI Email Writer
 *
 * Generates personalized renewal and retention emails using GPT-4.
 * Falls back to template-based emails when GPT-4 is unavailable.
 */
import { callGPT4 } from './index';

interface EmailContext {
  customerName: string;
  customerEmail: string;
  companyName: string;
  agreementNumber: string;
  endDate: string;
  renewalProbability: number;
  churnRisk: number;
  equipmentInfo?: string;
}

/**
 * Generate a personalized renewal reminder email using GPT-4.
 */
export async function generateRenewalEmail(context: EmailContext): Promise<{
  subject: string;
  body: string;
  source: 'ai' | 'template';
}> {
  const gptPrompt = `Write a brief, professional renewal reminder email for an HVAC maintenance agreement:
- Customer: ${context.customerName}
- Company: ${context.companyName}
- Agreement: ${context.agreementNumber}
- Expires: ${context.endDate}
- Renewal probability: ${context.renewalProbability}%
${context.equipmentInfo ? `- Equipment: ${context.equipmentInfo}` : ''}

Return JSON: {"subject": "email subject line (max 60 chars)", "body": "html email body in a div"}`;

  const gptResult = await callGPT4(
    gptPrompt,
    'You are an HVAC marketing email writer. Return ONLY valid JSON. Keep it professional and concise.'
  );

  if (gptResult) {
    try {
      const parsed = JSON.parse(gptResult);
      return {
        subject: parsed.subject || `Renewal Reminder: ${context.agreementNumber}`,
        body: parsed.body || getTemplateBody(context),
        source: 'ai',
      };
    } catch {
      // Fall through to template
    }
  }

  return {
    subject: `Renewal Reminder: Agreement ${context.agreementNumber}`,
    body: getTemplateBody(context),
    source: 'template',
  };
}

/**
 * Generate a retention/promotion email for at-risk customers.
 */
export async function generateRetentionEmail(context: EmailContext): Promise<{
  subject: string;
  body: string;
  source: 'ai' | 'template';
}> {
  const gptPrompt = `Write a retention offer email for an HVAC customer at risk of churning:
- Customer: ${context.customerName}
- Company: ${context.companyName}
- Churn risk: ${context.churnRisk}%
- Agreement: ${context.agreementNumber}

Offer a 10% discount on renewal. Return JSON: {"subject": "subject line", "body": "html body in a div"}`;

  const gptResult = await callGPT4(
    gptPrompt,
    'You are an HVAC retention specialist. Return ONLY valid JSON. Keep it warm and professional.'
  );

  if (gptResult) {
    try {
      const parsed = JSON.parse(gptResult);
      return { subject: parsed.subject || 'Special Offer: Save on Your Renewal', body: parsed.body || '', source: 'ai' };
    } catch {
      // Fall through
    }
  }

  return {
    subject: `${context.customerName}, here's a special offer on your renewal`,
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>We'd Love to Keep You!</h2>
        <p>Hi ${context.customerName},</p>
        <p>We value your business and want to make sure you continue to receive priority service. As a valued customer, we're offering <strong>10% off</strong> your renewal of agreement <strong>${context.agreementNumber}</strong>.</p>
        <p>Don't let your coverage lapse — renew today and save!</p>
      </div>`,
    source: 'template',
  };
}

function getTemplateBody(context: EmailContext): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Renewal Reminder</h2>
      <p>Hi ${context.customerName},</p>
      <p>Your maintenance agreement <strong>${context.agreementNumber}</strong> with ${context.companyName} is expiring on <strong>${context.endDate}</strong>.</p>
      <p>Renew now to continue enjoying priority service and exclusive rates.</p>
      <p style="margin-top: 20px;">Thank you for your continued business!</p>
    </div>
  `;
}