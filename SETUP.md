# AstralStash Setup Guide

Complete guide to set up AstralStash with Cloudflare D1 authentication.

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Set Up Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Run automated setup script
npm run setup
```

The setup script will:
- Create your D1 database
- Initialize the schema
- Update your wrangler.toml with the database ID

### 3. Configure Security

Edit `wrangler.toml` and change the JWT_SECRET:

```toml
[vars]
JWT_SECRET = "your-super-secret-key-change-this-now"
```

**Important:** Use a strong random string for production!

Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start Development

**Terminal 1 - API Server:**
```bash
npm run worker:dev
```
This runs the backend on `localhost:8787` with `--remote` flag (connects to remote D1 database)

**Terminal 2 - Frontend:**
```bash
npm run dev
```
This runs the frontend on `localhost:9999` and proxies API calls to the backend

Open http://localhost:9999 🎉

### 5. Configure AI Features (Optional)

After starting the app:
1. Create an account and login
2. Go to **Profile Settings**
3. Scroll to **AI Configuration**
4. Choose your provider:
   - **Google Gemini** - Free tier available with models like `gemini-2.5-flash`
   - **OpenAI-compatible API** - Works with OpenAI, Groq, or any compatible endpoint
5. Enter your API key (will be encrypted before storage)
6. Select a model from the dropdown
7. Click **Test Connection** to verify
8. Click **Save**

**Supported Gemini Models:**
- `gemini-2.5-flash` (Recommended for free tier)
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `gemini-3.1-flash-lite`
- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`
- `gemma-3-27b-it`

**AI Features:**
- Chat with individual items (✨ button on cards)
- Knowledge Base chat (Cmd+Shift+K or AI button in header)
- Auto-tag items when adding
- Auto-summarize content

## Manual Setup (if automated script fails)

### 1. Create D1 Database

```bash
npx wrangler d1 create astralstash
```

Copy the `database_id` from the output.

### 2. Update wrangler.toml

Replace `your-database-id-here` with your actual database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "astralstash"
database_id = "your-actual-database-id"
```

### 3. Initialize Database

```bash
npm run db:init
```

This creates all tables in your remote D1 database. Uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times - won't delete existing data.

### 4. Continue from step 3 above

## Features Overview

### Authentication
- ✅ Email/password registration
- ✅ Secure login with JWT
- ✅ Brute force protection (9 attempts, 9-hour lockout)
- ✅ Password reset via email token
- ✅ Change password
- ✅ Signup blocking via `ALLOW_SIGNUPS` environment variable

### AI Features
- ✅ Encrypted API key storage (AES-256-GCM)
- ✅ Google Gemini support
- ✅ OpenAI-compatible API support
- ✅ Item-specific AI chat
- ✅ Knowledge Base chat (queries entire stash)
- ✅ Auto-tagging
- ✅ Auto-summarization
- ✅ Keyboard shortcuts (Cmd+Shift+K for AI chat)

### Profile Management
- ✅ Edit name
- ✅ Choose profile color (6 predefined colors)
- ✅ View account info
- ✅ AI configuration management
- ✅ Logout

### Security
- ✅ SHA-256 password hashing
- ✅ JWT token authentication
- ✅ Rate limiting on login
- ✅ Secure password reset flow
- ✅ Session management
- ✅ AES-256-GCM encryption for API keys

## Database Schema

The system uses 9 tables:

1. **users** - User accounts
2. **login_attempts** - Track failed logins
3. **account_locks** - Manage locked accounts
4. **password_reset_tokens** - Password reset flow
5. **stash_items** - User's saved items
6. **collections** - Organize items
7. **sessions** - Refresh tokens (optional)
8. **ai_configs** - Encrypted AI provider configurations

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/request-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update name/color
- `PUT /api/profile/password` - Change password
- `GET /api/profile/colors` - Get available colors

### Stash (Protected)
- `GET /api/items` - Get all items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Collections (Protected)
- `GET /api/collections` - Get collections
- `POST /api/collections` - Create collection

### AI (Protected)
- `GET /api/ai` - Get AI configuration
- `POST /api/ai` - Save AI configuration (encrypts API key)
- `POST /api/ai/test` - Test AI connection
- `POST /api/ai/chat` - Chat with AI (item-specific or knowledge base)

## Environment Variables

### Development (.env)
```env
VITE_API_URL=http://localhost:9999/api
```

### Production (wrangler.toml)
```toml
[vars]
JWT_SECRET = "your-super-secret-key-change-this-now"
ALLOW_SIGNUPS = "true"  # Set to "false" to block new signups
```

**Generate secure key:**
```bash
# JWT Secret (any length, 32+ bytes recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Note:** JWT_SECRET is used for both JWT tokens and encrypting AI API keys.

## Deployment

For complete deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Quick Deploy

```bash
# Deploy everything at once
npm run deploy:all
```

**Important:** Before deploying, make sure to:
1. Set JWT_SECRET in Cloudflare: `wrangler secret put JWT_SECRET`
2. Set `VITE_API_URL` in Cloudflare Pages dashboard
3. Run database migrations with `--remote` flag

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions.

## Testing

### Test Registration
1. Go to http://localhost:9999/auth
2. Click "Sign up"
3. Enter email, password (8+ chars), and name
4. Should redirect to /app

### Test Login
1. Go to /auth
2. Enter credentials
3. Try wrong password 3 times to see remaining attempts
4. Try 9 times to trigger account lock

### Test Password Reset
1. Go to /auth
2. Click "Forgot password?"
3. Enter email
4. Check console for reset token (in dev mode)
5. Go to /reset-password?token=YOUR_TOKEN
6. Set new password

### Test Profile
1. Login and go to /profile
2. Change name
3. Select different color
4. Change password
5. Logout

### Test AI Features
1. Go to /profile
2. Scroll to AI Configuration
3. Select "Google Gemini"
4. Enter API key
5. Select model (e.g., `gemini-2.5-flash`)
6. Click "Test Connection" - should show success
7. Click "Save"
8. Go to your stash
9. Click ✨ on any card to chat about that item
10. Press Cmd+Shift+K to open Knowledge Base chat
11. When adding an item, try "Auto-tag" and "Summarize" buttons

## Troubleshooting

### "Database not found"
Run: `npm run db:init`

### "Unauthorized" errors
Check that JWT_SECRET matches in wrangler.toml

### CORS errors
Make sure API is running on port 8787 and frontend proxies to it

### "Account locked"
Wait 9 hours or manually clear:
```bash
npx wrangler d1 execute astralstash --remote --command="DELETE FROM account_locks WHERE email='your@email.com'"
```

### AI Configuration Issues

**"Failed to save AI configuration"**
- Check that the `ai_configs` table exists in your database
- Run migration: `wrangler d1 execute astralstash --remote --file=./workers/migrations/0001_add_ai_configs.sql`

**"Connection test failed"**
- Verify your API key is correct
- Check that the model ID is valid
- For Gemini: Use models like `gemini-2.5-flash`, not `models/gemini-2.5-flash`
- For OpenAI: Ensure the endpoint URL is correct

**"Not authenticated" when saving AI config**
- Check that you're logged in
- Verify the auth token is stored correctly (should be `auth_token` in localStorage)

### Proxy Connection Errors
If you see `ECONNREFUSED 127.0.0.1:8787`:
- Make sure the worker is running: `npm run worker:dev`
- Check that it's running on port 8787
- Verify the Vite proxy configuration in `vite.config.ts`

## Production Checklist

- [ ] Change JWT_SECRET to secure random string (32+ bytes recommended)
- [ ] Set ALLOW_SIGNUPS to "false" if you want to block new registrations
- [ ] Set up email service for password resets
- [ ] Remove dev-only reset token from response
- [ ] Configure CORS for your domain
- [ ] Set up monitoring/logging
- [ ] Enable Cloudflare WAF
- [ ] Set up backup strategy for D1 database
- [ ] Test all flows in production
- [ ] Test AI features with real API keys
- [ ] Verify API key encryption is working

## Support

For issues or questions, please open an issue on GitHub.
