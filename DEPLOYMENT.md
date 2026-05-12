# Deployment Guide

Complete guide for deploying AstralStash to Cloudflare.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed and logged in
- D1 database already created and migrated

## Step 1: Set Up Secrets

### For Production Worker

Set the JWT_SECRET in Cloudflare (it's used for both JWT tokens and encrypting AI API keys):

```bash
# Generate a secure JWT secret (any length, but 32+ bytes recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set it in Cloudflare
wrangler secret put JWT_SECRET
# Paste the generated secret when prompted
```

**Note:** The same JWT_SECRET is used for:
- Signing JWT authentication tokens
- Encrypting AI API keys in the database (using PBKDF2 + AES-256-GCM)

### For Local Development

Your `.dev.vars` file (already gitignored) contains the local JWT secret:

```env
JWT_SECRET=your-local-jwt-secret
```

## Step 2: Initialize Database

Run the complete schema to create all tables:

```bash
npm run db:init
```

Or directly with wrangler:

```bash
wrangler d1 execute astralstash --remote --file=./workers/schema.sql
```

This creates all 8 tables:
- `users` - User accounts
- `login_attempts` - Brute force protection
- `account_locks` - Account lockout management
- `password_reset_tokens` - Password reset flow
- `stash_items` - Your saved items
- `collections` - Item organization
- `sessions` - Refresh tokens
- `ai_configs` - Encrypted AI API keys

**Note:** Uses `CREATE TABLE IF NOT EXISTS` - safe to run multiple times, won't delete existing data.

### Verify Database

Check that all tables exist:

```bash
wrangler d1 execute astralstash --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## Step 3: Deploy Worker (Backend API)

```bash
npm run worker:deploy
```

Your API will be available at:
```
https://astralstash-api.yourname.workers.dev
```

Test it:
```bash
curl https://astralstash-api.yourname.workers.dev/api/health
```

## Step 4: Deploy Frontend to Cloudflare Pages

### Option A: Automatic Deployment (Recommended)

```bash
npm run pages:deploy
```

This will:
1. Build the frontend
2. Deploy to Cloudflare Pages
3. Your site will be at: `https://yourname.pages.dev`

### Option B: Deploy Both at Once

```bash
npm run deploy:all
```

## Step 5: Configure Cloudflare Pages Environment Variables

**Important:** The frontend needs to know where your API is located.

### Method 1: Set in Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **astralstash**
3. Go to **Settings** → **Environment Variables**
4. Click **Add variable**
5. Add **Production** variable:
   - Name: `VITE_API_URL`
   - Value: `https://astralstash-api.yourname.workers.dev/api`
6. Click **Save**
7. Go to **Deployments** → Click **Retry deployment** on latest

### Method 2: Use .env.production File (Quick Deploy)

Create `.env.production` (already gitignored):

```env
VITE_API_URL=https://astralstash-api.yourname.workers.dev/api
```

Then deploy:

```bash
npm run pages:deploy
```

**Note:** Method 1 is better for production as it keeps the URL out of your codebase entirely.

### For Preview Deployments (Optional)

Add the same variable for **Preview** environment if you want preview deployments to work.

## Step 6: Redeploy Pages (After Setting Env Vars)

After adding environment variables, trigger a new deployment:

```bash
npm run pages:deploy
```

Or push to GitHub if you have automatic deployments set up.

## Step 7: Verify Deployment

1. **Visit your site**: https://yourname.pages.dev
2. **Create an account** (if ALLOW_SIGNUPS is true)
3. **Test login**
4. **Add an item**
5. **Configure AI** in Profile Settings
6. **Test AI features**

## Environment Variables Summary

### Local Development

**`.env`** (for frontend):
```env
VITE_API_URL=http://localhost:8787/api
```

**`.dev.vars`** (for worker):
```env
JWT_SECRET=your-local-jwt-secret
```

### Production

**Cloudflare Pages** (set in dashboard):
- `VITE_API_URL` = `https://astralstash-api.yourname.workers.dev/api`

**Cloudflare Workers Secrets** (set via CLI):
- `JWT_SECRET` (set via `wrangler secret put JWT_SECRET`)

**wrangler.toml** (non-sensitive only):
```toml
[vars]
ENVIRONMENT = "production"
ALLOW_SIGNUPS = "false"
```

## Blocking New Signups

To block new user registrations in production:

1. Edit `wrangler.toml`:
   ```toml
   [vars]
   ALLOW_SIGNUPS = "false"
   ```

2. Redeploy:
   ```bash
   npm run worker:deploy
   ```

## Updating the Database

### Important: Schema is Safe to Re-run

The schema uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`:
- Only creates tables/indexes that don't exist
- **Never deletes or modifies existing data**
- Safe to run `npm run db:init` anytime

### To Add New Features

Edit `workers/schema.sql` and add your changes:

```sql
-- Add new column to existing table
ALTER TABLE stash_items ADD COLUMN new_field TEXT;

-- Add new table
CREATE TABLE IF NOT EXISTS new_feature (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Then run:

```bash
npm run db:init
```

### Backup Your Database (Recommended)

Before making any schema changes:

```bash
# Backup entire database
npm run db:backup

# Or backup specific table
wrangler d1 execute astralstash --remote --command="SELECT * FROM stash_items;" --json > backup_stash.json
```

## Troubleshooting

### "Binding name 'JWT_SECRET' already in use" error

This happens when JWT_SECRET was previously deployed as a variable instead of a secret. Fix it:

```bash
# 1. Deploy the worker first (this clears the old variable binding)
npm run worker:deploy

# 2. Now add JWT_SECRET as a secret
wrangler secret put JWT_SECRET
```

### "Secrets not found" error

Make sure you've set the JWT_SECRET:
```bash
wrangler secret list
```

Should show: `JWT_SECRET`

### API calls failing with CORS errors

Check that `VITE_API_URL` in Cloudflare Pages matches your worker URL exactly.

### Database errors

Verify your database ID in `wrangler.toml` matches your actual D1 database:
```bash
wrangler d1 list
```

### AI features not working

1. Check that the `ai_configs` table exists
2. Verify `JWT_SECRET` is set in Cloudflare secrets (used for encryption)
3. Test API key encryption locally first

## Rollback

If something goes wrong:

```bash
# Rollback worker
wrangler rollback

# Rollback pages (use dashboard or specific deployment)
wrangler pages deployment list
wrangler pages deployment tail <deployment-id>
```

## Monitoring

View logs:

```bash
# Worker logs
wrangler tail

# Pages logs (in dashboard)
# Go to Pages → astralstash → Deployments → View logs
```

## Security Checklist

- [ ] JWT_SECRET is set and secure (32+ bytes recommended)
- [ ] ALLOW_SIGNUPS is "false" in production
- [ ] .env and .dev.vars are in .gitignore
- [ ] No secrets in wrangler.toml
- [ ] Database has all migrations applied
- [ ] Test AI encryption is working
- [ ] CORS is properly configured

## Support

If you encounter issues:
1. Check worker logs: `wrangler tail`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Test API endpoints directly with curl
