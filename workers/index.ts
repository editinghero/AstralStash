import { Env } from './types';
import { handleRegister, handleLogin, handleRequestPasswordReset, handleResetPassword } from './routes/auth';
import { handleGetProfile, handleUpdateProfile, handleChangePassword, handleGetProfileColors, handleDeleteAccount } from './routes/profile';
import {
  handleGetItems, handleCreateItem, handleUpdateItem, handleDeleteItem,
  handleGetCollections, handleCreateCollection, handleUpdateCollection, handleDeleteCollection
} from './routes/stash';
import ai from './routes/ai';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers helper
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Helper to add CORS to response
    const addCors = (response: Response): Response => {
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    };

    try {
      // Auth routes
      if (path === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, env);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request, env);
      }
      if (path === '/api/auth/request-reset' && method === 'POST') {
        return await handleRequestPasswordReset(request, env);
      }
      if (path === '/api/auth/reset-password' && method === 'POST') {
        return await handleResetPassword(request, env);
      }

      // Profile routes
      if (path === '/api/profile' && method === 'GET') {
        return await handleGetProfile(request, env);
      }
      if (path === '/api/profile' && method === 'PUT') {
        return await handleUpdateProfile(request, env);
      }
      if (path === '/api/profile/password' && method === 'PUT') {
        return await handleChangePassword(request, env);
      }
      if (path === '/api/profile/colors' && method === 'GET') {
        return await handleGetProfileColors(request, env);
      }
      if (path === '/api/profile' && method === 'DELETE') {
        return await handleDeleteAccount(request, env);
      }

      // Stash items routes
      if (path === '/api/items' && method === 'GET') {
        return await handleGetItems(request, env);
      }
      if (path === '/api/items' && method === 'POST') {
        return await handleCreateItem(request, env);
      }
      if (path.startsWith('/api/items/') && method === 'PUT') {
        const itemId = path.split('/')[3];
        return await handleUpdateItem(request, env, itemId);
      }
      if (path.startsWith('/api/items/') && method === 'DELETE') {
        const itemId = path.split('/')[3];
        return await handleDeleteItem(request, env, itemId);
      }

      // Collections routes
      if (path === '/api/collections' && method === 'GET') {
        return await handleGetCollections(request, env);
      }
      if (path === '/api/collections' && method === 'POST') {
        return await handleCreateCollection(request, env);
      }
      if (path.startsWith('/api/collections/') && method === 'PUT') {
        const collectionId = path.split('/')[3];
        return await handleUpdateCollection(request, env, collectionId);
      }
      if (path.startsWith('/api/collections/') && method === 'DELETE') {
        const collectionId = path.split('/')[3];
        return await handleDeleteCollection(request, env, collectionId);
      }

      // AI configuration routes - delegate to Hono app
      if (path.startsWith('/api/ai')) {
        console.log('AI route matched:', path, method);
        try {
          // Hono expects the path to start from root
          const honoPath = path.replace('/api/ai', '') || '/';
          console.log('Hono path:', honoPath);
          
          // Create new URL with adjusted path
          const honoUrl = new URL(request.url);
          honoUrl.pathname = honoPath;
          
          // Create new request for Hono
          const honoRequest = new Request(honoUrl.toString(), {
            method: request.method,
            headers: request.headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
          });
          
          // Call Hono with env context
          const honoResponse = await ai.fetch(honoRequest, env, {});
          console.log('Hono response status:', honoResponse.status);
          return addCors(honoResponse);
        } catch (error: any) {
          console.error('AI route error:', error);
          return addCors(new Response(JSON.stringify({ error: 'AI route error: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
      }

      // Health check
      if (path === '/api/health') {
        return addCors(new Response(JSON.stringify({ status: 'ok' }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      }

      return addCors(new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }));
    } catch (error) {
      console.error('Worker error:', error);
      return addCors(new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
  },
};
