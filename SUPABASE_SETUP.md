# Supabase Setup Guide for TConnext Island Dream

This guide will help you connect your application to Supabase.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js installed on your machine
- Supabase CLI installed (optional but recommended)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in your project details:
   - **Name**: tconnext-island-dream (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Start with the Free tier
4. Click "Create new project" and wait for it to initialize (~2 minutes)

## Step 2: Get Your API Keys

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** in the left menu
3. You'll see these important values:

### Copy These Values:

- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon/public key**: `eyJhbGc...` (long string starting with eyJ)
- **service_role key**: `eyJhbGc...` (different long string, keep this SECRET!)

## Step 3: Set Up Environment Variables

1. In your project root, create a `.env.local` file:

```bash
# Copy the .env.example file
cp .env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key...
```

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to Git (it's already in `.gitignore`)
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - keep it secret!

## Step 4: Run Database Migrations

Your project has migrations in the `supabase/migrations/` folder. You need to apply them to your Supabase database.

### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref your-project-ref
```
(Get your project-ref from the Project Settings > General in Supabase Dashboard)

4. Push migrations to your database:
```bash
npm run db:push
```

Or directly:
```bash
supabase db push
```

### Option B: Manual Migration (Alternative)

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the sidebar
3. Open each migration file from `supabase/migrations/` folder (in order!)
4. Copy and paste the SQL content into the SQL Editor
5. Click "Run" for each migration

**Migration Order** (run in this sequence):
- 001_initial_schema.sql
- 002_rls_policies.sql
- 003_seed_data.sql
- ... (continue through all numbered files)

## Step 5: Verify the Connection

1. Start your development server:
```bash
npm run dev
```

2. Open http://localhost:3000

3. Try to access the login page - if it loads without errors, you're connected!

4. You can also test the connection by visiting:
   http://localhost:3000/api/test-supabase

## Step 6: Create Your First User

### Option A: Through the App
1. Go to the signup page in your app
2. Create an account

### Option B: Through Supabase Dashboard
1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click "Add user" > "Create new user"
3. Enter email and password
4. The user will be created

## Step 7: Set Up Storage Buckets (For File Uploads)

Your app uses Supabase Storage for images and files:

1. Go to **Storage** in Supabase Dashboard
2. Create these buckets:
   - `voucher-images` (for voucher uploads)
   - `company-logos` (for company branding)
   - `program-thumbnails` (for program images)
   - `program-brochures` (for PDF brochures)

3. For each bucket, set the appropriate policies:
   - Go to the bucket
   - Click "Policies"
   - Add policies for SELECT, INSERT, UPDATE, DELETE based on your needs

## Step 8: Configure Authentication (Optional)

In Supabase Dashboard > Authentication > URL Configuration:

1. **Site URL**: `http://localhost:3000` (for development)
2. **Redirect URLs**: Add:
   - `http://localhost:3000/**`
   - Your production URL when ready

## Troubleshooting

### "Invalid API key" error
- Double-check your environment variables
- Make sure there are no extra spaces or quotes
- Restart your dev server after changing `.env.local`

### "relation does not exist" error
- You haven't run the migrations yet
- Follow Step 4 to apply database migrations

### "JWT expired" or auth errors
- Clear your browser cookies
- Check that your Supabase project is active (not paused)

### Connection timeout
- Check your internet connection
- Verify the Supabase URL is correct
- Check Supabase status: https://status.supabase.com

## Production Deployment

When deploying to production (Vercel, etc.):

1. Add environment variables in your hosting platform:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Update Authentication URLs in Supabase:
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/**`

3. Consider enabling additional security features:
   - Row Level Security (RLS) policies
   - Rate limiting
   - Email confirmations

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Need Help?

- Check the [Supabase Discord](https://discord.supabase.com)
- Review the [GitHub Issues](https://github.com/lovedesignwork/tconnext-islanddream/issues)
- Contact your development team

---

**Next Steps**: Once connected, you can start using the application features like booking management, agent management, and more!

