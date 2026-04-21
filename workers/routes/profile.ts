import { Env, User } from '../types';
import { authenticateRequest, hashPassword, verifyPassword } from '../utils/auth';

const PROFILE_COLORS = [
  '#FFF0F3', '#F0F4FF', '#F0FFF4', '#FFFBF0', '#F5F0FF', '#FFF1E6',
];

export async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const user = await env.DB.prepare(
      'SELECT id, email, name, profile_color, created_at, updated_at FROM users WHERE id = ?'
    ).bind(auth.userId).first<User>();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    return jsonResponse({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return jsonResponse({ error: 'Failed to fetch profile' }, 500);
  }
}

export async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { name, profile_color } = await request.json() as { name?: string; profile_color?: string };

    if (!name && !profile_color) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }

    // Validate profile color
    if (profile_color && !PROFILE_COLORS.includes(profile_color)) {
      return jsonResponse({ error: 'Invalid profile color' }, 400);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      if (name.trim().length === 0) {
        return jsonResponse({ error: 'Name cannot be empty' }, 400);
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (profile_color) {
      updates.push('profile_color = ?');
      values.push(profile_color);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(auth.userId);

    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Fetch updated user
    const user = await env.DB.prepare(
      'SELECT id, email, name, profile_color, created_at, updated_at FROM users WHERE id = ?'
    ).bind(auth.userId).first<User>();

    return jsonResponse({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return jsonResponse({ error: 'Failed to update profile' }, 500);
  }
}

export async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { currentPassword, newPassword } = await request.json() as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return jsonResponse({ error: 'Current and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
      return jsonResponse({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Get current password hash
    const user = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(auth.userId).first<{ password_hash: string }>();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return jsonResponse({ error: 'Current password is incorrect' }, 401);
    }

    // Update password
    const newPasswordHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(newPasswordHash, Date.now(), auth.userId).run();

    return jsonResponse({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return jsonResponse({ error: 'Failed to change password' }, 500);
  }
}

export async function handleGetProfileColors(_request: Request, _env: Env): Promise<Response> {
  return jsonResponse({ colors: PROFILE_COLORS });
}

export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Delete all user data
    await env.DB.batch([
      env.DB.prepare('DELETE FROM stash_items WHERE user_id = ?').bind(auth.userId),
      env.DB.prepare('DELETE FROM collections WHERE user_id = ?').bind(auth.userId),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(auth.userId),
      env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(auth.userId),
      env.DB.prepare('DELETE FROM login_attempts WHERE email = ?').bind(auth.email),
      env.DB.prepare('DELETE FROM account_locks WHERE email = ?').bind(auth.email),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(auth.userId),
    ]);

    return jsonResponse({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return jsonResponse({ error: 'Failed to delete account' }, 500);
  }
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
