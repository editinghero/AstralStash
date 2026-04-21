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

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open http://localhost:8080 🎉

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

### 3. Initialize Database Schema

```bash
npm run db:init
```

### 4. Continue from step 3 above

## Features Overview

### Authentication
- ✅ Email/password registration
- ✅ Secure login with JWT
- ✅ Brute force protection (9 attempts, 9-hour lockout)
- ✅ Password reset via email token
- ✅ Change password

### Profile Management
- ✅ Edit name
- ✅ Choose profile color (6 predefined colors)
- ✅ View account info
- ✅ Logout

### Security
- ✅ SHA-256 password hashing
- ✅ JWT token authentication
- ✅ Rate limiting on login
- ✅ Secure password reset flow
- ✅ Session management

## Database Schema

The system uses 8 tables:

1. **users** - User accounts
2. **login_attempts** - Track failed logins
3. **account_locks** - Manage locked accounts
4. **password_reset_tokens** - Password reset flow
5. **stash_items** - User's saved items
6. **collections** - Organize items
7. **sessions** - Refresh tokens (optional)

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

## Environment Variables

### Development (.env)
```env
VITE_API_URL=http://localhost:8787/api
```

### Production
```env
VITE_API_URL=https://your-worker.your-subdomain.workers.dev/api
```

## Deployment

### Deploy Workers API

```bash
npm run worker:deploy
```

Your API will be available at:
`https://astralstash-api.your-subdomain.workers.dev`

### Deploy Frontend

1. **Build:**
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Pages:**
   ```bash
   npx wrangler pages deploy dist
   ```

   Or use Vercel, Netlify, etc.

3. **Update environment:**
   Set `VITE_API_URL` to your deployed Workers URL

## Testing

### Test Registration
1. Go to http://localhost:8080/auth
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

## Troubleshooting

### "Database not found"
Run: `npm run db:init`

### "Unauthorized" errors
Check that JWT_SECRET matches in wrangler.toml

### CORS errors
Make sure API is running on port 8787

### "Account locked"
Wait 9 hours or manually clear:
```bash
npx wrangler d1 execute astralstash --command="DELETE FROM account_locks WHERE email='your@email.com'"
```

## Production Checklist

- [ ] Change JWT_SECRET to secure random string
- [ ] Set up email service for password resets
- [ ] Remove dev-only reset token from response
- [ ] Configure CORS for your domain
- [ ] Set up monitoring/logging
- [ ] Enable Cloudflare WAF
- [ ] Set up backup strategy
- [ ] Test all flows in production

## Support

For issues or questions, please open an issue on GitHub.
