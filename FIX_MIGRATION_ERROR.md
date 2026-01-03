# 🔧 Fix Migration Error - Step by Step

## The Problem
The migration failed with error: **"function name 'generate_booking_number' is not unique"**

This happens because there's a conflict with function definitions in the migration.

---

## ✅ Solution - Follow These Steps

### Step 1: Clear the Error (Run Fix Script)

In your Supabase SQL Editor (where you see the error):

1. **Clear the current query** (select all and delete)
2. **Open the file** `fix-migration-error.sql` from your project
3. **Copy all contents** and paste into SQL Editor
4. **Click Run**

This will drop the conflicting function and recreate it properly.

---

### Step 2: Continue with Remaining Migrations

The error occurred around line 5578-5592 (near the end). Most migrations have already run successfully!

**Option A: Skip the problematic migration (Recommended)**

The function that failed is already created by the fix script above. You can now proceed to create your admin user.

**Option B: Run only the last few migrations**

If you want to be thorough, run these individual migrations in order:

1. `051_stripe_payment_intent.sql`
2. `052_fix_rls_helper_functions.sql`
3. `053_fix_agent_staff_rls.sql`

---

### Step 3: Create Your Admin User

1. **In SQL Editor**, clear the query
2. **Open the file** `create-admin-user.sql` from your project
3. **Copy all contents** and paste into SQL Editor
4. **Click Run**

You should see:
```
Admin user created successfully!
```

And then a table showing your user details.

---

### Step 4: Verify Everything Works

1. **Check Tables Created**
   - Go to **Database** → **Tables** in Supabase
   - You should see tables like: `users`, `companies`, `bookings`, `agents`, `programs`, etc.

2. **Check Storage Buckets**
   - Go to **Storage** → **Buckets**
   - You should see your 4 buckets:
     - ✅ voucher-images
     - ✅ company-logos
     - ✅ program-thumbnails
     - ✅ program-brochures

3. **Check Admin User**
   - Go to **Authentication** → **Users**
   - You should see your user with UUID: `172de6e1-6d61-4f2e-93d5-527119a01776`

---

### Step 5: Test Your Application

1. **Make sure dev server is running**
   ```bash
   npm run dev
   ```

2. **Open your app**: http://localhost:3001/login

3. **Login with your credentials**
   - Use the email and password you created in Supabase Auth

4. **You should see the dashboard!** 🎉

---

## 🔍 What Went Wrong?

The combined migration file had a conflict because:
- Migration `050_structured_booking_number.sql` tries to create `generate_booking_number` function
- But there might have been an earlier version of this function
- PostgreSQL doesn't allow creating functions with the same name and parameters

The fix script handles this by:
1. Dropping all versions of the function first
2. Then creating the correct version

---

## ✅ Quick Checklist

- [ ] Run `fix-migration-error.sql` in SQL Editor
- [ ] Run `create-admin-user.sql` in SQL Editor
- [ ] Verify tables exist in Database tab
- [ ] Verify storage buckets exist (4 buckets)
- [ ] Verify admin user exists in Authentication tab
- [ ] Test login at http://localhost:3001/login

---

## 🆘 Still Having Issues?

### Error: "relation does not exist"
- Some tables might not have been created
- Run the individual migration files from `supabase/migrations/` folder
- Start from `001_initial_schema.sql` and go in order

### Error: "user not found" when logging in
- Make sure you ran `create-admin-user.sql`
- Check the UUID matches your auth user UUID
- Verify in SQL Editor:
  ```sql
  SELECT * FROM users WHERE auth_id = '172de6e1-6d61-4f2e-93d5-527119a01776';
  ```

### Error: "permission denied"
- Check RLS policies are created
- Verify your user has `master_admin` role
- Check migration `002_rls_policies.sql` ran successfully

---

## 📝 Files Created for You

1. **fix-migration-error.sql** - Fixes the function conflict
2. **create-admin-user.sql** - Creates your admin user with your UUID
3. **FIX_MIGRATION_ERROR.md** - This guide

---

## 🎯 Next Steps After Fix

Once everything is working:

1. **Login to your app**
2. **Go to Settings** → Update company information
3. **Create your first program** (tour/activity)
4. **Add agents** (travel agencies)
5. **Start creating bookings!**

---

**Your Admin User UUID**: `172de6e1-6d61-4f2e-93d5-527119a01776`

**Your Supabase Project**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor

**Your App**: http://localhost:3001

---

Good luck! You're almost there! 🚀

