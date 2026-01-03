# 🚀 Setup Checklist - TConnext Island Dream

## ✅ Completed Steps

- [x] GitHub repository created and code pushed
- [x] Environment variables configured (`.env.local`)
- [x] Supabase project created
- [x] All 53 migrations combined into single file

---

## 📋 Next Steps (Do These Now)

### Step 1: Run Database Migrations

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run the Combined Migrations**
   - Open the file: `combined-migrations.sql` (in your project root)
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Wait for it to complete (~30 seconds)

   ✅ You should see "Success. No rows returned" when done

### Step 2: Create Storage Buckets

1. **Go to Storage**
   - In Supabase Dashboard, click **Storage** in the left sidebar
   - Click **Create a new bucket**

2. **Create these 4 buckets:**

   | Bucket Name | Public | File Size Limit |
   |-------------|--------|-----------------|
   | `voucher-images` | ✅ Yes | 5 MB |
   | `company-logos` | ✅ Yes | 2 MB |
   | `program-thumbnails` | ✅ Yes | 5 MB |
   | `program-brochures` | ✅ Yes | 10 MB |

   For each bucket:
   - Click "Create a new bucket"
   - Enter the bucket name
   - Check "Public bucket" ✅
   - Click "Create bucket"

### Step 3: Configure Storage Policies (Optional but Recommended)

For better security, you can add policies to each bucket:

1. Click on a bucket
2. Click **Policies** tab
3. Click **New Policy**
4. Choose a template or create custom policies

**Recommended policies:**
- **SELECT (read)**: Allow public access
- **INSERT (upload)**: Only authenticated users
- **UPDATE**: Only authenticated users
- **DELETE**: Only authenticated users

### Step 4: Start Your Application

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser

### Step 5: Create Your First Admin User

**Option A: Through Supabase Dashboard**

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add user** → **Create new user**
3. Enter:
   - Email: your-email@example.com
   - Password: (choose a strong password)
   - Auto Confirm User: ✅ Check this
4. Click **Create user**
5. Copy the User ID (UUID)

6. Go to **SQL Editor** and run:
```sql
-- Replace 'USER_UUID_HERE' with the actual UUID from step 5
INSERT INTO users (auth_id, company_id, role, permissions, name, email)
VALUES (
  'USER_UUID_HERE',
  '00000000-0000-0000-0000-000000000001',
  'master_admin',
  '{}',
  'Your Name',
  'your-email@example.com'
);
```

**Option B: Through the App**

1. Go to http://localhost:3000/login
2. Click "Sign Up" (if available)
3. Create your account
4. Then manually update the role in Supabase:
```sql
UPDATE users 
SET role = 'master_admin' 
WHERE email = 'your-email@example.com';
```

---

## 🎉 You're Done!

Once you complete all the steps above, you can:

- ✅ Login to your application
- ✅ Create bookings
- ✅ Manage agents, drivers, guides
- ✅ Generate invoices
- ✅ View reports and analytics
- ✅ Upload images and files

---

## 🔍 Verify Everything Works

### Test Database Connection
Visit: http://localhost:3000/api/test-supabase

You should see:
```json
{
  "success": true,
  "message": "Supabase connection successful"
}
```

### Test Authentication
1. Go to http://localhost:3000/login
2. Try logging in with your admin account
3. You should be redirected to the dashboard

### Test File Upload
1. Go to Settings → Company Settings
2. Try uploading a company logo
3. It should upload successfully

---

## 🐛 Troubleshooting

### "Relation does not exist" error
- ❌ Migrations not run yet
- ✅ Go back to Step 1 and run the migrations

### "Invalid API key" error
- ❌ Wrong environment variables
- ✅ Check `.env.local` has correct values
- ✅ Restart dev server: `npm run dev`

### "Storage bucket not found" error
- ❌ Storage buckets not created
- ✅ Go back to Step 2 and create the buckets

### Can't login / Authentication error
- ❌ User not created or wrong role
- ✅ Check user exists in Supabase Auth
- ✅ Verify user has `master_admin` role in `users` table

### App won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📚 Additional Resources

- [Supabase Dashboard](https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor)
- [Full Setup Guide](./SUPABASE_SETUP.md)
- [Quick Start](./QUICK_START.md)
- [Main README](./README.md)

---

## 🆘 Need Help?

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the [Next.js Documentation](https://nextjs.org/docs)
- Check GitHub Issues
- Contact your development team

---

**Current Status:**
- ✅ GitHub: Connected
- ✅ Supabase: Connected
- ⏳ Database: Pending (run migrations)
- ⏳ Storage: Pending (create buckets)
- ⏳ Admin User: Pending (create user)

**Next Action:** Run the database migrations (Step 1)

