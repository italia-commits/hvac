import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via SendGrid API.
 * Falls back to console.log when API key is placeholder/unset.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const isPlaceholder = env.sendgridApiKey.startsWith('placeholder-');

  if (isPlaceholder) {
    console.log(`[EMAIL] To: ${options.to}`);
    console.log(`[EMAIL] Subject: ${options.subject}`);
    console.log(`[EMAIL] Body: ${options.text || options.html.substring(0, 200)}...`);
    console.log('[EMAIL] (SendGrid not configured — email logged to console)');
    return;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: env.sendgridFromEmail, name: env.sendgridFromName },
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error ${response.status}: ${errorText}`);
    }

    console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('[EMAIL] Failed to send:', (error as Error).message);
    throw error;
  }
}

// ============================================================
// Email Templates
// ============================================================

export function getEmailVerificationHtml(name: string, verificationUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to HVAC RenewIQ!</h2>
      <p>Hi ${name},</p>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
        Verify Email Address
      </a>
      <p style="margin-top: 20px;">This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `;
}

export function getPasswordResetHtml(name: string, resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
        Reset Password
      </a>
      <p style="margin-top: 20px;">This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
}

export function getTwoFactorSetupHtml(name: string, qrCodeDataUrl: string, backupCodes: string[]): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Two-Factor Authentication Setup</h2>
      <p>Hi ${name},</p>
      <p>Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.):</p>
      <img src="${qrCodeDataUrl}" alt="2FA QR Code" style="display: block; margin: 20px auto;" />
      <p>If you can't scan the code, enter this key manually:</p>
      <code style="display: block; padding: 10px; background: #f3f4f6; margin: 10px 0;">${backupCodes[0]}</code>
      <p>Keep your backup codes safe:</p>
      <ul>${backupCodes.map(c => `<li><code>${c}</code></li>`).join('')}</ul>
    </div>
  `;
}

export function getAgreementExpiringHtml(
  customerName: string,
  agreementNumber: string,
  endDate: string,
  renewalUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Maintenance Agreement Expiring Soon</h2>
      <p>Hi,</p>
      <p>This is a reminder that ${customerName}'s maintenance agreement <strong>${agreementNumber}</strong> is expiring on <strong>${endDate}</strong>.</p>
      <a href="${renewalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px;">
        Renew Agreement
      </a>
    </div>
  `;
}

// ============================================================
// Campaign Email Templates (Phase 3)
// ============================================================

export function getWelcomeEmailHtml(name: string, companyName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to HVAC RenewIQ!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for joining HVAC RenewIQ. Your company <strong>${companyName}</strong> has been registered successfully.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li><strong>Import customers</strong> — Add your customer database</li>
        <li><strong>Create agreements</strong> — Set up maintenance agreements</li>
        <li><strong>Schedule services</strong> — Track service calls</li>
        <li><strong>Manage equipment</strong> — Log customer equipment details</li>
      </ul>
      <a href="${env.frontendUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
        Go to Dashboard
      </a>
    </div>
  `;
}

export function getInvoiceNotificationHtml(
  customerName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  invoiceUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice Ready</h2>
      <p>Hi ${customerName},</p>
      <p>A new invoice is ready for you:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Invoice</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${invoiceNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Due</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${amount}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${dueDate}</td></tr>
      </table>
      <a href="${invoiceUrl}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 6px;">
        View Invoice
      </a>
    </div>
  `;
}

export function getOverdueInvoiceHtml(
  customerName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  invoiceUrl: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">⚠️ Payment Overdue</h2>
      <p>Hi ${customerName},</p>
      <p>This is a reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${amount}</strong> was due on <strong>${dueDate}</strong> and is now overdue.</p>
      <p>Please make payment at your earliest convenience to avoid service interruption.</p>
      <a href="${invoiceUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">
        Pay Now
      </a>
    </div>
  `;
}

export function getAgreementFollowUpHtml(
  customerName: string,
  agreementNumber: string,
  endDate: string,
  renewalUrl: string,
  daysRemaining: number
): string {
  const urgencyColor = daysRemaining <= 30 ? '#dc2626' : daysRemaining <= 60 ? '#d97706' : '#059669';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${urgencyColor};">Agreement Renewal Follow-Up</h2>
      <p>Hi ${customerName},</p>
      <p>We previously reminded you about your agreement <strong>${agreementNumber}</strong> expiring on <strong>${endDate}</strong>.</p>
      <p>There are only <strong style="color: ${urgencyColor};">${daysRemaining} days</strong> remaining. Secure your coverage now.</p>
      <a href="${renewalUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${urgencyColor}; color: white; text-decoration: none; border-radius: 6px;">
        Renew Now
      </a>
    </div>
  `;
}