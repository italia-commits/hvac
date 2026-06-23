import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../config/env';
import { query } from '../config/database';
import { TokenPayload, AuthTokens, User } from '../types';

// ============================================================
// Passport Configuration
// ============================================================

export function setupPassport(): void {
  // Local Strategy (email + password)
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const { rows } = await query<User>(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email.toLowerCase()]
          );

          if (rows.length === 0) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const user = rows[0];

          if (!user.password_hash) {
            return done(null, false, { message: 'Account uses Google OAuth. Please sign in with Google.' });
          }

          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user as any);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, { message: 'No email from Google profile' });
          }

          // Check if user exists with this Google ID
          const { rows: existingUsers } = await query<User>(
            'SELECT * FROM users WHERE google_id = $1 OR email = $2',
            [profile.id, email]
          );

          if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            // Link Google ID if not already linked
            if (!existingUser.google_id) {
              await query(
                'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
                [profile.id, existingUser.id]
              );
            }
            return done(null, existingUser as any);
          }

          // No existing user — return profile info for registration
          return done(null, {
            google_id: profile.id,
            email,
            first_name: profile.name?.givenName || '',
            last_name: profile.name?.familyName || '',
          } as any);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
      done(null, rows[0] || null);
    } catch (error) {
      done(error);
    }
  });
}

// ============================================================
// JWT Token Management
// ============================================================

export function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn as any,
  });

  const refreshToken = jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as any,
  });

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as TokenPayload;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as TokenPayload;
}

// ============================================================
// Password Management
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// Two-Factor Authentication (TOTP via speakeasy)
// ============================================================

export function generateTwoFactorSecret(): { secret: string; otpauthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `HVAC RenewIQ:${env.frontendUrl}`,
    length: 20,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || '',
  };
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl);
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow 30s clock drift
  });
}

// ============================================================
// Token Generation (for email verification, password reset)
// ============================================================

export function generateSecureToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export function generateEmailVerificationToken(): { token: string; expiresAt: Date } {
  return {
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
}

export function generatePasswordResetToken(): { token: string; expiresAt: Date } {
  return {
    token: generateSecureToken(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
}