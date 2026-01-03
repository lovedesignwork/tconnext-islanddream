# Quick Start Guide - TConnext Island Dream

## 🚀 Get Started in 5 Minutes

### 1. Create Supabase Project
Go to https://supabase.com/dashboard and create a new project.

### 2. Get Your Credentials
From **Project Settings** → **API**, copy:
- Project URL
- anon/public key  
- service_role key

### 3. Set Up Environment
```bash
# Create your environment file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
```

### 4. Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npm run db:push
```

### 5. Create Storage Buckets
In Supabase Dashboard → **Storage**, create:
- `voucher-images`
- `company-logos`
- `program-thumbnails`
- `program-brochures`

### 6. Start Development
```bash
npm install
npm run dev
```

Open http://localhost:3000 🎉

---

## 📚 Need More Details?

See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for the complete step-by-step guide.

## 🔑 Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 📦 Optional Services

### Email (Resend)
```env
RESEND_API_KEY=re_...
```

### Payments (Stripe)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push migrations to Supabase
npm run db:pull         # Pull schema from Supabase
npm run db:reset        # Reset local database
npm run db:gen-types    # Generate TypeScript types

# Supabase CLI
supabase status         # Check local Supabase status
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
```

## 🐛 Common Issues

### "Invalid API key"
- Check `.env.local` has correct values
- Restart dev server: `npm run dev`

### "Relation does not exist"
- Run migrations: `npm run db:push`

### Can't connect to Supabase
- Verify project URL is correct
- Check Supabase project is active (not paused)

## 📖 Documentation

- [Full Setup Guide](./SUPABASE_SETUP.md)
- [Main README](./README.md)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

## 🆘 Get Help

- Check GitHub Issues
- Review Supabase Dashboard logs
- Join Supabase Discord: https://discord.supabase.com

