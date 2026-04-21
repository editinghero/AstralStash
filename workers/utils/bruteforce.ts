import { Env } from '../types';

const MAX_ATTEMPTS = 9;
const LOCK_DURATION = 9 * 60 * 60 * 1000; // 9 hours in milliseconds
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes window to count attempts

export async function checkAccountLock(email: string, env: Env): Promise<{ locked: boolean; remainingTime?: number }> {
  const now = Date.now();
  
  const lock = await env.DB.prepare(
    'SELECT locked_until, attempt_count FROM account_locks WHERE email = ?'
  ).bind(email).first<{ locked_until: number; attempt_count: number }>();

  if (lock && lock.locked_until > now) {
    return {
      locked: true,
      remainingTime: Math.ceil((lock.locked_until - now) / 1000 / 60), // minutes
    };
  }

  // Clean up expired lock
  if (lock && lock.locked_until <= now) {
    await env.DB.prepare('DELETE FROM account_locks WHERE email = ?').bind(email).run();
  }

  return { locked: false };
}

export async function recordLoginAttempt(email: string, success: boolean, env: Env): Promise<void> {
  const now = Date.now();
  const windowStart = now - ATTEMPT_WINDOW;

  // Record the attempt
  await env.DB.prepare(
    'INSERT INTO login_attempts (email, attempted_at, success) VALUES (?, ?, ?)'
  ).bind(email, now, success ? 1 : 0).run();

  if (success) {
    // Clear failed attempts and locks on successful login
    await env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(email).run();
    await env.DB.prepare('DELETE FROM account_locks WHERE email = ?').bind(email).run();
    return;
  }

  // Count failed attempts in the window
  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND attempted_at > ? AND success = 0'
  ).bind(email, windowStart).first<{ count: number }>();

  const failedCount = result?.count || 0;

  if (failedCount >= MAX_ATTEMPTS) {
    const lockUntil = now + LOCK_DURATION;
    
    // Create or update lock
    await env.DB.prepare(`
      INSERT INTO account_locks (email, locked_until, attempt_count)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        locked_until = excluded.locked_until,
        attempt_count = attempt_count + 1
    `).bind(email, lockUntil, failedCount).run();
  }
}

export async function getRemainingAttempts(email: string, env: Env): Promise<number> {
  const now = Date.now();
  const windowStart = now - ATTEMPT_WINDOW;

  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE email = ? AND attempted_at > ? AND success = 0'
  ).bind(email, windowStart).first<{ count: number }>();

  const failedCount = result?.count || 0;
  return Math.max(0, MAX_ATTEMPTS - failedCount);
}

// Clean up old login attempts (call periodically)
export async function cleanupOldAttempts(env: Env): Promise<void> {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
  await env.DB.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').bind(cutoff).run();
}
