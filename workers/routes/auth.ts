import { Env, User } from '../types';
import { hashPassword, verifyPassword, generateJWT, generateToken, generateId } from '../utils/auth';
import { checkAccountLock, recordLoginAttempt, getRemainingAttempts } from '../utils/bruteforce';

const PROFILE_COLORS = [
  '#FFF0F3', '#F0F4FF', '#F0FFF4', '#FFFBF0', '#F5F0FF', '#FFF1E6',
];

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password, name } = await request.json() as { email: string; password: string; name: string };

    // Validation
    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ error: 'Invalid email format' }, 400);
    }

    // Check if user exists
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return jsonResponse({ error: 'Email already registered' }, 409);
    }

    // Create user
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const now = Date.now();
    const profileColor = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];

    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, profile_color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, email.toLowerCase(), passwordHash, name, profileColor, now, now).run();

    // Generate JWT
    const token = await generateJWT({ userId, email: email.toLowerCase() }, env.JWT_SECRET);

    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      name,
      profile_color: profileColor,
      created_at: now,
      updated_at: now,
    };

    return jsonResponse({ token, user }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse({ error: 'Registration failed' }, 500);
  }
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required' }, 400);
    }

    const normalizedEmail = email.toLowerCase();

    // Check if account is locked
    const lockStatus = await checkAccountLock(normalizedEmail, env);
    if (lockStatus.locked) {
      return jsonResponse({
        error: 'Account locked due to too many failed attempts',
        locked: true,
        remainingMinutes: lockStatus.remainingTime,
      }, 423);
    }

    // Get remaining attempts before checking password
    const remainingAttempts = await getRemainingAttempts(normalizedEmail, env);

    // Find user
    const user = await env.DB.prepare(
      'SELECT id, email, password_hash, name, profile_color, created_at, updated_at FROM users WHERE email = ?'
    ).bind(normalizedEmail).first<User & { password_hash: string }>();

    if (!user) {
      await recordLoginAttempt(normalizedEmail, false, env);
      return jsonResponse({
        error: 'Invalid email or password',
        remainingAttempts: Math.max(0, remainingAttempts - 1),
      }, 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await recordLoginAttempt(normalizedEmail, false, env);
      return jsonResponse({
        error: 'Invalid email or password',
        remainingAttempts: Math.max(0, remainingAttempts - 1),
      }, 401);
    }

    // Success - record and clear attempts
    await recordLoginAttempt(normalizedEmail, true, env);

    // Generate JWT
    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET);

    const userResponse: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      profile_color: user.profile_color,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return jsonResponse({ token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ error: 'Login failed' }, 500);
  }
}

export async function handleRequestPasswordReset(request: Request, env: Env): Promise<Response> {
  try {
    const { email } = await request.json() as { email: string };

    if (!email) {
      return jsonResponse({ error: 'Email is required' }, 400);
    }

    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first<{ id: string }>();

    // Always return success to prevent email enumeration
    if (!user) {
      return jsonResponse({ message: 'If the email exists, a reset link will be sent' });
    }

    // Generate reset token
    const tokenId = generateId();
    const token = generateToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

    await env.DB.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(tokenId, user.id, token, expiresAt).run();

    // In production, send email here
    // For now, return token in response (REMOVE IN PRODUCTION)
    return jsonResponse({
      message: 'If the email exists, a reset link will be sent',
      // TODO: Remove this in production - only for development
      resetToken: token,
      resetLink: `${new URL(request.url).origin}/reset-password?token=${token}`,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return jsonResponse({ error: 'Failed to process request' }, 500);
  }
}

export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  try {
    const { token, newPassword } = await request.json() as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return jsonResponse({ error: 'Token and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Find valid token
    const resetToken = await env.DB.prepare(`
      SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?
    `).bind(token).first<{ id: string; user_id: string; expires_at: number; used: number }>();

    if (!resetToken) {
      return jsonResponse({ error: 'Invalid or expired reset token' }, 400);
    }

    if (resetToken.used) {
      return jsonResponse({ error: 'Reset token already used' }, 400);
    }

    if (resetToken.expires_at < Date.now()) {
      return jsonResponse({ error: 'Reset token expired' }, 400);
    }

    // Update password
    const passwordHash = await hashPassword(newPassword);
    const now = Date.now();

    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(passwordHash, now, resetToken.user_id).run();

    // Mark token as used
    await env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
      .bind(resetToken.id).run();

    // Clear login attempts
    const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?')
      .bind(resetToken.user_id).first<{ email: string }>();
    
    if (user) {
      await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(user.email).run();
      await env.DB.prepare('DELETE FROM account_locks WHERE email = ?').bind(user.email).run();
    }

    return jsonResponse({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    return jsonResponse({ error: 'Failed to reset password' }, 500);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
