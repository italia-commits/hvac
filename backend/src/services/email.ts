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