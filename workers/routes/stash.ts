import { Env, StashItem, Collection } from '../types';
import { authenticateRequest } from '../utils/auth';

export async function handleGetItems(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const items = await env.DB.prepare(
      'SELECT * FROM stash_items WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(auth.userId).all();

    const parsedItems = items.results.map(parseStashItem);

    return jsonResponse({ items: parsedItems });
  } catch (error) {
    console.error('Get items error:', error);
    return jsonResponse({ error: 'Failed to fetch items' }, 500);
  }
}

export async function handleCreateItem(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const item = await request.json() as Partial<StashItem>;

    if (!item.type || !item.title) {
      return jsonResponse({ error: 'Type and title are required' }, 400);
    }

    const id = generateId();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO stash_items (
        id, user_id, type, title, url, description, image, favicon,
        content, color, format, tags, pinned, collection_id, deleted, deleted_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, auth.userId, item.type, item.title,
      item.url || null, item.description || null, item.image || null, item.favicon || null,
      item.content || null, item.color || null, item.format || null, JSON.stringify(item.tags || []),
      item.pinned ? 1 : 0, item.collection_id || null, 0, null, now, now
    ).run();

    const created = await env.DB.prepare('SELECT * FROM stash_items WHERE id = ?')
      .bind(id).first();

    return jsonResponse({ item: parseStashItem(created) }, 201);
  } catch (error) {
    console.error('Create item error:', error);
    return jsonResponse({ error: 'Failed to create item' }, 500);
  }
}

export async function handleUpdateItem(request: Request, env: Env, itemId: string): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Check ownership
    const existing = await env.DB.prepare('SELECT user_id FROM stash_items WHERE id = ?')
      .bind(itemId).first<{ user_id: string }>();

    if (!existing) {
      return jsonResponse({ error: 'Item not found' }, 404);
    }

    if (existing.user_id !== auth.userId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const updates = await request.json() as Partial<StashItem>;
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url || null);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description || null);
    }
    if (updates.image !== undefined) {
      fields.push('image = ?');
      values.push(updates.image || null);
    }
    if (updates.favicon !== undefined) {
      fields.push('favicon = ?');
      values.push(updates.favicon || null);
    }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content || null);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color || null);
    }
    if (updates.format !== undefined) {
      fields.push('format = ?');
      values.push(updates.format || null);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.pinned !== undefined) {
      fields.push('pinned = ?');
      values.push(updates.pinned ? 1 : 0);
    }
    if (updates.collection_id !== undefined) {
      fields.push('collection_id = ?');
      values.push(updates.collection_id || null);
    }
    if (updates.deleted !== undefined) {
      fields.push('deleted = ?');
      values.push(updates.deleted ? 1 : 0);
      if (updates.deleted) {
        fields.push('deleted_at = ?');
        values.push(Date.now());
      }
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(itemId);

    await env.DB.prepare(
      `UPDATE stash_items SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM stash_items WHERE id = ?')
      .bind(itemId).first();

    return jsonResponse({ item: parseStashItem(updated) });
  } catch (error) {
    console.error('Update item error:', error);
    return jsonResponse({ error: 'Failed to update item' }, 500);
  }
}

export async function handleDeleteItem(request: Request, env: Env, itemId: string): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Check ownership
    const existing = await env.DB.prepare('SELECT user_id FROM stash_items WHERE id = ?')
      .bind(itemId).first<{ user_id: string }>();

    if (!existing) {
      return jsonResponse({ error: 'Item not found' }, 404);
    }

    if (existing.user_id !== auth.userId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    await env.DB.prepare('DELETE FROM stash_items WHERE id = ?').bind(itemId).run();

    return jsonResponse({ message: 'Item deleted' });
  } catch (error) {
    console.error('Delete item error:', error);
    return jsonResponse({ error: 'Failed to delete item' }, 500);
  }
}

export async function handleGetCollections(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const collections = await env.DB.prepare(
      'SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(auth.userId).all();

    return jsonResponse({ collections: collections.results });
  } catch (error) {
    console.error('Get collections error:', error);
    return jsonResponse({ error: 'Failed to fetch collections' }, 500);
  }
}

export async function handleCreateCollection(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { name, emoji } = await request.json() as { name: string; emoji?: string };

    if (!name) {
      return jsonResponse({ error: 'Name is required' }, 400);
    }

    const id = generateId();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO collections (id, user_id, name, emoji, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, auth.userId, name, emoji || null, now).run();

    const created = await env.DB.prepare('SELECT * FROM collections WHERE id = ?')
      .bind(id).first<Collection>();

    return jsonResponse({ collection: created }, 201);
  } catch (error) {
    console.error('Create collection error:', error);
    return jsonResponse({ error: 'Failed to create collection' }, 500);
  }
}

export async function handleUpdateCollection(request: Request, env: Env, collectionId: string): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Check ownership
    const existing = await env.DB.prepare('SELECT user_id FROM collections WHERE id = ?')
      .bind(collectionId).first<{ user_id: string }>();

    if (!existing) {
      return jsonResponse({ error: 'Collection not found' }, 404);
    }

    if (existing.user_id !== auth.userId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const updates = await request.json() as { name?: string; emoji?: string };
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.emoji !== undefined) {
      fields.push('emoji = ?');
      values.push(updates.emoji || null);
    }

    if (fields.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }

    values.push(collectionId);

    await env.DB.prepare(
      `UPDATE collections SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await env.DB.prepare('SELECT * FROM collections WHERE id = ?')
      .bind(collectionId).first<Collection>();

    return jsonResponse({ collection: updated });
  } catch (error) {
    console.error('Update collection error:', error);
    return jsonResponse({ error: 'Failed to update collection' }, 500);
  }
}

export async function handleDeleteCollection(request: Request, env: Env, collectionId: string): Promise<Response> {
  try {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Check ownership
    const existing = await env.DB.prepare('SELECT user_id FROM collections WHERE id = ?')
      .bind(collectionId).first<{ user_id: string }>();

    if (!existing) {
      return jsonResponse({ error: 'Collection not found' }, 404);
    }

    if (existing.user_id !== auth.userId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // Remove collection_id from all items in this collection
    await env.DB.prepare('UPDATE stash_items SET collection_id = NULL WHERE collection_id = ? AND user_id = ?')
      .bind(collectionId, auth.userId).run();

    // Delete the collection
    await env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId).run();

    return jsonResponse({ message: 'Collection deleted' });
  } catch (error) {
    console.error('Delete collection error:', error);
    return jsonResponse({ error: 'Failed to delete collection' }, 500);
  }
}

function parseStashItem(row: any): StashItem {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    url: row.url,
    description: row.description,
    image: row.image,
    favicon: row.favicon,
    content: row.content,
    color: row.color,
    format: row.format,
    tags: row.tags ? JSON.parse(row.tags) : [],
    pinned: Boolean(row.pinned),
    collection_id: row.collection_id,
    deleted: Boolean(row.deleted),
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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
