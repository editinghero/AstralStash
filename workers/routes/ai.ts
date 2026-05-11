import { Hono } from 'hono';
import { Env, AIConfigRequest, AIConfigResponse } from '../types';
import { authenticateRequest } from '../utils/auth';
import { encryptApiKey, decryptApiKey } from '../utils/encryption';

const ai = new Hono<{ Bindings: Env }>();

// Helper to verify auth and return userId
async function verifyAuth(c: any): Promise<string | null> {
  const payload = await authenticateRequest(c.req.raw, c.env);
  return payload?.userId || null;
}

// Get AI configuration
ai.get('/', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const config = await c.env.DB.prepare(
      'SELECT id, user_id, provider_type, model_id, base_url, created_at, updated_at FROM ai_configs WHERE user_id = ?'
    ).bind(userId).first();

    if (!config) {
      return c.json({ configured: false }, 200);
    }

    const response: AIConfigResponse = {
      provider_type: config.provider_type as 'gemini' | 'openai-compat',
      model_id: config.model_id as string,
      base_url: config.base_url as string | undefined,
      has_api_key: true,
    };

    return c.json({ configured: true, config: response }, 200);
  } catch (error: any) {
    console.error('Get AI config error:', error);
    return c.json({ error: 'Failed to fetch AI configuration' }, 500);
  }
});

// Save or update AI configuration
ai.post('/', async (c) => {
  console.log('POST /api/ai - Save AI config');
  const userId = await verifyAuth(c);
  console.log('User ID:', userId);
  
  if (!userId) {
    console.log('Unauthorized - no user ID');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body: AIConfigRequest = await c.req.json();
    console.log('Request body:', { ...body, api_key: '***' });
    
    const { provider_type, api_key, model_id, base_url } = body;

    if (!provider_type || !api_key || !model_id) {
      console.log('Missing required fields');
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (provider_type !== 'gemini' && provider_type !== 'openai-compat') {
      console.log('Invalid provider type:', provider_type);
      return c.json({ error: 'Invalid provider type' }, 400);
    }

    if (provider_type === 'openai-compat' && !base_url) {
      console.log('Missing base_url for OpenAI-compat');
      return c.json({ error: 'base_url is required for OpenAI-compatible providers' }, 400);
    }

    console.log('Encrypting API key...');
    // Encrypt the API key
    const encryptedKey = await encryptApiKey(api_key, c.env.JWT_SECRET);
    console.log('API key encrypted');

    // Check if config already exists
    console.log('Checking for existing config...');
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ai_configs WHERE user_id = ?'
    ).bind(userId).first();
    console.log('Existing config:', existing ? 'found' : 'not found');

    const now = Date.now();

    if (existing) {
      console.log('Updating existing config...');
      // Update existing config
      await c.env.DB.prepare(
        'UPDATE ai_configs SET provider_type = ?, encrypted_api_key = ?, model_id = ?, base_url = ?, updated_at = ? WHERE user_id = ?'
      ).bind(provider_type, encryptedKey, model_id, base_url || null, now, userId).run();
      console.log('Config updated');
    } else {
      console.log('Creating new config...');
      // Create new config
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO ai_configs (id, user_id, provider_type, encrypted_api_key, model_id, base_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, userId, provider_type, encryptedKey, model_id, base_url || null, now, now).run();
      console.log('Config created');
    }

    const response: AIConfigResponse = {
      provider_type,
      model_id,
      base_url,
      has_api_key: true,
    };

    console.log('Returning success response');
    return c.json({ success: true, config: response }, 200);
  } catch (error: any) {
    console.error('Save AI config error:', error);
    console.error('Error stack:', error.stack);
    return c.json({ error: 'Failed to save AI configuration: ' + error.message }, 500);
  }
});

// Delete AI configuration
ai.delete('/', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    await c.env.DB.prepare(
      'DELETE FROM ai_configs WHERE user_id = ?'
    ).bind(userId).run();

    return c.json({ success: true }, 200);
  } catch (error: any) {
    console.error('Delete AI config error:', error);
    return c.json({ error: 'Failed to delete AI configuration' }, 500);
  }
});

// Get decrypted API key (for making AI calls from client)
ai.get('/key', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const config = await c.env.DB.prepare(
      'SELECT encrypted_api_key, provider_type, model_id, base_url FROM ai_configs WHERE user_id = ?'
    ).bind(userId).first();

    if (!config) {
      return c.json({ error: 'No AI configuration found' }, 404);
    }

    // Decrypt the API key
    const apiKey = await decryptApiKey(config.encrypted_api_key as string, c.env.JWT_SECRET);

    return c.json({
      provider_type: config.provider_type,
      api_key: apiKey,
      model_id: config.model_id,
      base_url: config.base_url,
    }, 200);
  } catch (error: any) {
    console.error('Get API key error:', error);
    return c.json({ error: 'Failed to retrieve API key' }, 500);
  }
});

export default ai;
