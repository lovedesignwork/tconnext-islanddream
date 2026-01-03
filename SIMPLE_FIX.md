# 🚨 Quick Fix - Tables Don't Exist

## The Problem
The error shows: **"relation 'users' does not exist"**

This means the main migration didn't create the database tables. This can happen if:
- The migration was too large and timed out
- There was an error early in the migration that stopped it
- The migration partially ran but didn't complete

---

## ✅ Solution: Run Complete Setup

I've created a simplified setup script that will:
1. Create the essential tables (companies, users)
2. Set up basic security policies
3. Create your admin user

### **Run This Now:**

1. **In your Supabase SQL Editor** (clear the current query)
2. **Open the file**: `complete-setup.sql` from your project
3. **Copy ALL contents** (Ctrl+A, Ctrl+C)
4. **Paste into SQL Editor**
5. **Click Run**

You should see:
```
✅ Setup completed successfully!
✅ Admin User Details: (your user info)
✅ Company Details: (company info)
```

---

## 🔄 Alternative: Run Full Migration Properly

If you want ALL features (recommended), we need to run the full migration differently:

### Option 1: Run Migrations One by One

Instead of running all 53 migrations at once, run them in smaller batches:

**Batch 1: Core Tables (Most Important)**
```bash
# In your project terminal
cd supabase/migrations
```

Then in Supabase SQL Editor, run these files one by one:
1. `001_initial_schema.sql` ← **Start here**
2. `002_rls_policies.sql`
3. `003_seed_data.sql`

After these 3, try creating your admin user again.

### Option 2: Use Supabase CLI

If you have database password, you can push migrations via CLI:

```bash
# In your project terminal
npx supabase db push --password YOUR_DATABASE_PASSWORD
```

---

## 🎯 Recommended Approach

**For now, to get started quickly:**

1. ✅ Run `complete-setup.sql` (this creates minimal tables)
2. ✅ Test login at http://localhost:3001/login
3. ✅ Once logged in, you can manually run more migrations as needed

**Later, for full features:**

Run the individual migration files from `supabase/migrations/` folder in order (001, 002, 003, etc.)

---

## 📋 What complete-setup.sql Does

Creates these essential tables:
- ✅ `companies` - Your company info
- ✅ `users` - User accounts and roles
- ✅ Basic RLS policies for security
- ✅ Your admin user with UUID: `172de6e1-6d61-4f2e-93d5-527119a01776`

**Missing features** (need full migration):
- Bookings, Programs, Agents, Drivers, Guides
- Invoices, Payments, Reports
- Advanced features

---

## 🔍 Check What Tables Exist

After running `complete-setup.sql`, verify in Supabase:

1. Go to **Database** → **Tables**
2. You should see:
   - ✅ companies
   - ✅ users

If you see these, you can login!

---

## 🚀 Next Steps

### Step 1: Run complete-setup.sql
This gets you logged in quickly.

### Step 2: Test Login
Go to http://localhost:3001/login and login with your credentials.

### Step 3: Run Full Migrations (When Ready)
To get all features, run the migration files from `supabase/migrations/` folder one by one in SQL Editor.

**Start with:**
1. `001_initial_schema.sql` - Creates all main tables
2. `002_rls_policies.sql` - Security policies
3. `003_seed_data.sql` - Sample data

Then continue with 004, 005, 006, etc. as needed.

---

## 🆘 Troubleshooting

### Still getting "relation does not exist"
- Make sure `complete-setup.sql` ran successfully
- Check Database → Tables in Supabase to see what exists
- Try refreshing your app (Ctrl+F5)

### Can't login after creating user
- Verify user exists: Go to Authentication → Users in Supabase
- Check the UUID matches: `172de6e1-6d61-4f2e-93d5-527119a01776`
- Make sure you're using the correct email/password

### "Permission denied" error
- RLS policies might not be set correctly
- Try disabling RLS temporarily:
  ```sql
  ALTER TABLE users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
  ```

---

## 📍 Your Info

- **Admin UUID**: `172de6e1-6d61-4f2e-93d5-527119a01776`
- **Company ID**: `00000000-0000-0000-0000-000000000001`
- **Supabase**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor
- **App**: http://localhost:3001/login

---

**Next Action**: Run `complete-setup.sql` in your SQL Editor right now! 🚀

This will at least get you logged in, then we can add more features later.

