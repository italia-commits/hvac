import { Router, Request, Response } from 'express';
import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { env } from '../config/env';
import { authRateLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { logAuditEvent } from '../middleware/auditLogger';
import {
  generateTokens,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateTwoFactorSecret,
  generateQRCode,
  verifyTwoFactorToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from '../services/auth';
import { sendEmail, getEmailVerificationHtml, getPasswordResetHtml } from '../services/email';
import { TokenPayload, UserRole, AuditAction, User } from '../types';

const router = Router();

// ============================================================
// POST /api/auth/register
// ============================================================
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, companyName, companySlug } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !companyName || !companySlug) {
      res.status(400).json({ success: false, error: 'All fields are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if company slug is taken
    const { rows: existingCompanies } = await query(
      'SELECT id FROM companies WHERE slug = $1',
      [companySlug.toLowerCase()]
    );
    if (existingCompanies.length > 0) {
      res.status(409).json({ success: false, error: 'Company slug is already taken' });
      return;
    }

    // Create company
    const companyId = uuidv4();
    await query(
      `INSERT INTO companies (id, name, slug, plan_tier, max_users, max_agreements)
       VALUES ($1, $2, $3, 'starter', 5, 200)`,
      [companyId, companyName, companySlug.toLowerCase()]
    );

    // Create user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const emailVerification = generateEmailVerificationToken();

    await query(
      `INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role,
        email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6, 'company_admin', $7, $8)`,
      [
        userId,
        companyId,
        normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        emailVerification.token,
        emailVerification.expiresAt.toISOString(),
      ]
    );

    // Send verification email
    const verificationUrl = `${env.frontendUrl}/verify-email?token=${emailVerification.token}`;
    sendEmail({
      to: normalizedEmail,
      subject: 'Verify your HVAC RenewIQ account',
      html: getEmailVerificationHtml(firstName, verificationUrl),
    }).catch((err) => console.error('[AUTH] Failed to send verification email:', err.message));

    // Generate tokens
    const tokens = generateTokens({
      userId,
      companyId,
      role: UserRole.COMPANY_ADMIN,
      email: normalizedEmail,
    });

    // Store refresh token hash
    const refreshTokenHash = await hashPassword(tokens.refreshToken);
    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshTokenHash, userId]
    );

    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, email: normalizedEmail, firstName, lastName, role: 'company_admin' },
        company: { id: companyId, name: companyName, slug: companySlug },
        tokens,
      },
      message: 'Account created. Please verify your email.',
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', authRateLimiter, (req: Request, res: Response) => {
  passport.authenticate('local', { session: false }, async (err: Error | null, user: User | false, info: { message?: string }) => {
    if (err) {
      console.error('[AUTH] Login error:', err.message);
      res.status(500).json({ success: false, error: 'Login failed' });
      return;
    }

    if (!user) {
      res.status(401).json({ success: false, error: info?.message || 'Invalid credentials' });
      return;
    }

    try {
      // Check if 2FA is enabled
      if (user.is_two_factor_enabled) {
        res.json({
          success: true,
          data: {
            requiresTwoFactor: true,
            userId: user.id,
          },
        });
        return;
      }

      const tokens = generateTokens({
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email,
      });

      // Store refresh token
      const refreshTokenHash = await hashPassword(tokens.refreshToken);
      await query(
        'UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2',
        [refreshTokenHash, user.id]
      );

      // Audit log
      await logAuditEvent(
        {
          companyId: user.company_id,
          userId: user.id,
          action: AuditAction.LOGIN,
          entityType: 'user',
          entityId: user.id,
          description: `User ${user.email} logged in`,
        },
        req
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            companyId: user.company_id,
          },
          tokens,
        },
      });
    } catch (error) {
      console.error('[AUTH] Login processing error:', (error as Error).message);
      res.status(500).json({ success: false, error: 'Login failed' });
    }
  })(req, res);
});

// ============================================================
// POST /api/auth/login/2fa
// ============================================================
router.post('/login/2fa', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, twoFactorToken } = req.body;

    if (!userId || !twoFactorToken) {
      res.status(400).json({ success: false, error: 'User ID and 2FA token are required' });
      return;
    }

    const { rows } = await query<User>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = rows[0];

    if (!user.is_two_factor_enabled || !user.two_factor_secret) {
      res.status(400).json({ success: false, error: '2FA is not enabled for this user' });
      return;
    }

    const isValid = verifyTwoFactorToken(user.two_factor_secret, twoFactorToken);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid 2FA token' });
      return;
    }

    const tokens = generateTokens({
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
      email: user.email,
    });

    const refreshTokenHash = await hashPassword(tokens.refreshToken);
    await query(
      'UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2',
      [refreshTokenHash, user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          companyId: user.company_id,
        },
        tokens,
      },
    });
  } catch (error) {
    console.error('[AUTH] 2FA login error:', (error as Error).message);
    res.status(500).json({ success: false, error: '2FA login failed' });
  }
});

// ============================================================
// GET /api/auth/google
// POST /api/auth/google/callback
// ============================================================
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=google_auth_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      // If user doesn't exist yet (no account), redirect to register
      if (!user.id) {
        const registerUrl = `${env.frontendUrl}/register?google_id=${user.google_id}&email=${user.email}&first_name=${user.first_name}&last_name=${user.last_name}`;
        res.redirect(registerUrl);
        return;
      }

      const tokens = generateTokens({
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email,
      });

      const refreshTokenHash = await hashPassword(tokens.refreshToken);
      await query(
        'UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2',
        [refreshTokenHash, user.id]
      );

      // Redirect to frontend with tokens
      res.redirect(
        `${env.frontendUrl}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`
      );
    } catch (error) {
      console.error('[AUTH] Google callback error:', (error as Error).message);
      res.redirect(`${env.frontendUrl}/login?error=google_auth_failed`);
    }
  }
);

// ============================================================
// POST /api/auth/refresh
// ============================================================
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    let decoded: TokenPayload;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    // Verify refresh token in database
    const { rows } = await query<User>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const user = rows[0];

    // Verify stored refresh token
    if (user.refresh_token) {
      const isValid = await comparePassword(refreshToken, user.refresh_token);
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid refresh token' });
        return;
      }
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
      email: user.email,
    });

    const newRefreshHash = await hashPassword(tokens.refreshToken);
    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [newRefreshHash, user.id]
    );

    res.json({ success: true, data: { tokens } });
  } catch (error) {
    console.error('[AUTH] Token refresh error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if ((req as any).user) {
      await query(
        'UPDATE users SET refresh_token = NULL WHERE id = $1',
        [(req as any).user.id]
      );

      await logAuditEvent(
        {
          companyId: (req as any).user.company_id,
          userId: (req as any).user.id,
          action: AuditAction.LOGOUT,
          entityType: 'user',
          entityId: (req as any).user.id,
          description: `User logged out`,
        },
        req
      );
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AUTH] Logout error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// ============================================================
// POST /api/auth/verify-email
// ============================================================
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'Verification token is required' });
      return;
    }

    const { rows } = await query<User>(
      `SELECT * FROM users
       WHERE email_verification_token = $1
       AND email_verification_expires > NOW()
       AND is_email_verified = false`,
      [token]
    );

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
      return;
    }

    await query(
      `UPDATE users SET is_email_verified = true, email_verification_token = NULL, email_verification_expires = NULL
       WHERE id = $1`,
      [rows[0].id]
    );

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('[AUTH] Email verification error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Email verification failed' });
  }
});

// ============================================================
// POST /api/auth/resend-verification
// ============================================================
router.post('/resend-verification', authenticate, async (req: Request, res: Response) => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { rows } = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [(req as any).user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (rows[0].is_email_verified) {
      res.json({ success: true, message: 'Email is already verified' });
      return;
    }

    const verification = generateEmailVerificationToken();
    await query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3`,
      [verification.token, verification.expiresAt.toISOString(), (req as any).user.id]
    );

    const verificationUrl = `${env.frontendUrl}/verify-email?token=${verification.token}`;
    sendEmail({
      to: rows[0].email,
      subject: 'Verify your HVAC RenewIQ account',
      html: getEmailVerificationHtml(rows[0].first_name, verificationUrl),
    }).catch((err) => console.error('[AUTH] Resend verification email failed:', err.message));

    res.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('[AUTH] Resend verification error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Failed to resend verification email' });
  }
});

// ============================================================
// POST /api/auth/forgot-password
// ============================================================
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const { rows } = await query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
      return;
    }

    const resetToken = generatePasswordResetToken();
    await query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [resetToken.token, resetToken.expiresAt.toISOString(), rows[0].id]
    );

    const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken.token}`;
    sendEmail({
      to: rows[0].email,
      subject: 'Reset your HVAC RenewIQ password',
      html: getPasswordResetHtml(rows[0].first_name, resetUrl),
    }).catch((err) => console.error('[AUTH] Password reset email failed:', err.message));

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('[AUTH] Forgot password error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Password reset request failed' });
  }
});

// ============================================================
// POST /api/auth/reset-password
// ============================================================
router.post('/reset-password', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ success: false, error: 'Token and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const { rows } = await query<User>(
      `SELECT * FROM users
       WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_active = true`,
      [token]
    );

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
      [passwordHash, rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[AUTH] Reset password error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Password reset failed' });
  }
});

// ============================================================
// POST /api/auth/2fa/enable
// ============================================================
router.post('/2fa/enable', authenticate, async (req: Request, res: Response) => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { token } = req.body;

    if (!token) {
      // Step 1: Generate secret and QR code
      const { secret, otpauthUrl } = generateTwoFactorSecret();
      const qrCodeUrl = await generateQRCode(otpauthUrl);

      // Store secret temporarily (will be confirmed in step 2)
      await query(
        'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
        [secret, (req as any).user.id]
      );

      res.json({
        success: true,
        data: {
          secret,
          qrCodeUrl,
          step: 'verify',
        },
      });
      return;
    }

    // Step 2: Verify and enable
    const { rows } = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [(req as any).user.id]
    );

    if (rows.length === 0 || !rows[0].two_factor_secret) {
      res.status(400).json({ success: false, error: '2FA setup not initialized' });
      return;
    }

    const isValid = verifyTwoFactorToken(rows[0].two_factor_secret, token);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid 2FA token. Please try again.' });
      return;
    }

    await query(
      'UPDATE users SET is_two_factor_enabled = true WHERE id = $1',
      [(req as any).user.id]
    );

    res.json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (error) {
    console.error('[AUTH] 2FA enable error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Failed to enable 2FA' });
  }
});

// ============================================================
// POST /api/auth/2fa/disable
// ============================================================
router.post('/2fa/disable', authenticate, async (req: Request, res: Response) => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { token } = req.body;

    const { rows } = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [(req as any).user.id]
    );

    if (rows.length === 0 || !rows[0].two_factor_secret) {
      res.status(400).json({ success: false, error: '2FA is not configured' });
      return;
    }

    if (token) {
      const isValid = verifyTwoFactorToken(rows[0].two_factor_secret, token);
      if (!isValid) {
        res.status(400).json({ success: false, error: 'Invalid 2FA token' });
        return;
      }
    }

    await query(
      `UPDATE users SET is_two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1`,
      [(req as any).user.id]
    );

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (error) {
    console.error('[AUTH] 2FA disable error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Failed to disable 2FA' });
  }
});

// ============================================================
// GET /api/auth/me
// ============================================================
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_email_verified,
              u.is_two_factor_enabled, u.last_login_at, u.created_at,
              json_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug,
                'plan_tier', c.plan_tier,
                'is_active', c.is_active,
                'max_users', c.max_users,
                'max_agreements', c.max_agreements
              ) as company
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [(req as any).user.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[AUTH] Get profile error:', (error as Error).message);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

export default router;