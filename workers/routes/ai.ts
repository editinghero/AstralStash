import { Hono } from 'hono';
import { Env, AIConfigRequest, AIConfigResponse } from '../types';
import { authenticateRequest } from '../utils/auth';
import { encryptApiKey, decryptApiKey } from '../utils/encryption';

const ai = new Hono<{ Bindings: Env }>().basePath('/api/ai');

// Helper to verify auth and return userId
async function verifyAuth(c: any): Promise<string | null> {
  const payload = await authenticateRequest(c.req.raw, c.env);
  return payload?.userId || null;
}

// Get AI configuration (for current provider in use)
ai.get('/', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get the most recently updated config (the active one) or a specific provider
    const provider = c.req.query('provider');
    let config;
    
    if (provider) {
      config = await c.env.DB.prepare(
        'SELECT id, user_id, provider_type, model_id, base_url, created_at, updated_at FROM ai_configs WHERE user_id = ? AND provider_type = ?'
      ).bind(userId, provider).first();
    } else {
      config = await c.env.DB.prepare(
        'SELECT id, user_id, provider_type, model_id, base_url, created_at, updated_at FROM ai_configs WHERE user_id = ? AND provider_type != ? ORDER BY updated_at DESC LIMIT 1'
      ).bind(userId, 'brave-search').first();
    }

    if (!config) {
      return c.json({ configured: false }, 200);
    }

    const response: AIConfigResponse = {
      provider_type: config.provider_type as 'gemini' | 'groq' | 'mistral' | 'claude' | 'openai' | 'openai-compat' | 'brave-search',
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
    console.log('Request body:', { ...body, api_key: '***', brave_search_api_key: body.brave_search_api_key ? '***' : undefined });
    
    const { provider_type, api_key, model_id, base_url, brave_search_api_key } = body;

    if (!provider_type || !api_key || !model_id) {
      console.log('Missing required fields');
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const validProviders = ['gemini', 'groq', 'mistral', 'claude', 'openai', 'openai-compat'];
    if (!validProviders.includes(provider_type)) {
      console.log('Invalid provider type:', provider_type);
      return c.json({ error: 'Invalid provider type. Must be one of: ' + validProviders.join(', ') }, 400);
    }

    if (provider_type === 'openai-compat' && !base_url) {
      console.log('Missing base_url for OpenAI-compat');
      return c.json({ error: 'base_url is required for OpenAI-compatible providers' }, 400);
    }

    console.log('Encrypting API key...');
    // Encrypt the API key
    const encryptedKey = await encryptApiKey(api_key, c.env.JWT_SECRET);
    console.log('API key encrypted');

    // Check if config already exists for this provider
    console.log('Checking for existing config...');
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ai_configs WHERE user_id = ? AND provider_type = ?'
    ).bind(userId, provider_type).first();
    console.log('Existing config:', existing ? 'found' : 'not found');

    const now = Date.now();

    if (existing) {
      console.log('Updating existing config...');
      // Update existing config
      await c.env.DB.prepare(
        'UPDATE ai_configs SET encrypted_api_key = ?, model_id = ?, base_url = ?, enable_search = ?, updated_at = ? WHERE user_id = ? AND provider_type = ?'
      ).bind(encryptedKey, model_id, base_url || null, body.enable_search || false, now, userId, provider_type).run();
      console.log('Config updated');
    } else {
      console.log('Creating new config...');
      // Create new config
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO ai_configs (id, user_id, provider_type, encrypted_api_key, model_id, base_url, enable_search, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, userId, provider_type, encryptedKey, model_id, base_url || null, body.enable_search || false, now, now).run();
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
    const provider = c.req.query('provider');
    
    // Get the config (either specific provider or most recent)
    let config;
    if (provider) {
      config = await c.env.DB.prepare(
        'SELECT encrypted_api_key, provider_type, model_id, base_url, enable_search FROM ai_configs WHERE user_id = ? AND provider_type = ?'
      ).bind(userId, provider).first();
    } else {
      config = await c.env.DB.prepare(
        'SELECT encrypted_api_key, provider_type, model_id, base_url, enable_search FROM ai_configs WHERE user_id = ? AND provider_type != ? ORDER BY updated_at DESC LIMIT 1'
      ).bind(userId, 'brave-search').first();
    }

    if (!config) {
      return c.json({ error: 'No AI configuration found' }, 404);
    }

    // Decrypt the API key
    const apiKey = await decryptApiKey(config.encrypted_api_key as string, c.env.JWT_SECRET);

    // Get Brave Search API key if it exists
    const braveConfig = await c.env.DB.prepare(
      'SELECT encrypted_api_key FROM ai_configs WHERE user_id = ? AND provider_type = ?'
    ).bind(userId, 'brave-search').first();

    let braveSearchApiKey = undefined;
    if (braveConfig) {
      braveSearchApiKey = await decryptApiKey(braveConfig.encrypted_api_key as string, c.env.JWT_SECRET);
    }

    return c.json({
      provider_type: config.provider_type,
      api_key: apiKey,
      model_id: config.model_id,
      base_url: config.base_url,
      enable_search: config.enable_search,
      brave_search_api_key: braveSearchApiKey,
    }, 200);
  } catch (error: any) {
    console.error('Get API key error:', error);
    return c.json({ error: 'Failed to retrieve API key' }, 500);
  }
});

// Get Brave Search API key
ai.get('/brave-search', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const config = await c.env.DB.prepare(
      'SELECT encrypted_api_key FROM ai_configs WHERE user_id = ? AND provider_type = ?'
    ).bind(userId, 'brave-search').first();

    if (!config) {
      return c.json({ configured: false }, 200);
    }

    const apiKey = await decryptApiKey(config.encrypted_api_key as string, c.env.JWT_SECRET);

    return c.json({ api_key: apiKey }, 200);
  } catch (error: any) {
    console.error('Get Brave Search key error:', error);
    return c.json({ error: 'Failed to retrieve Brave Search API key' }, 500);
  }
});

// Save Brave Search API key
ai.post('/brave-search', async (c) => {
  const userId = await verifyAuth(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const { api_key } = body;

    if (!api_key) {
      return c.json({ error: 'API key is required' }, 400);
    }

    // Encrypt the API key
    const encryptedKey = await encryptApiKey(api_key, c.env.JWT_SECRET);

    // Check if config already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ai_configs WHERE user_id = ? AND provider_type = ?'
    ).bind(userId, 'brave-search').first();

    const now = Date.now();

    if (existing) {
      // Update existing config
      await c.env.DB.prepare(
        'UPDATE ai_configs SET encrypted_api_key = ?, updated_at = ? WHERE user_id = ? AND provider_type = ?'
      ).bind(encryptedKey, now, userId, 'brave-search').run();
    } else {
      // Create new config
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO ai_configs (id, user_id, provider_type, encrypted_api_key, model_id, base_url, enable_search, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, userId, 'brave-search', encryptedKey, null, null, 0, now, now).run();
    }

    return c.json({ success: true }, 200);
  } catch (error: any) {
    console.error('Save Brave Search key error:', error);
    return c.json({ error: 'Failed to save Brave Search API key' }, 500);
  }
});

export default ai;
