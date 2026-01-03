# 🚀 Vercel Deployment Guide

## ✅ What You've Done
- ✅ Code pushed to GitHub
- ✅ Vercel deployment connected
- ✅ Supabase project created
- ✅ Storage buckets created

---

## 🔧 Step 1: Add Environment Variables to Vercel

Your app needs these environment variables to connect to Supabase.

### **Go to Vercel Dashboard:**

1. **Open**: https://vercel.com/dashboard
2. **Find your project**: `tconnext-island-dream` (or similar name)
3. **Click on the project**
4. **Go to**: Settings → Environment Variables

### **Add These Variables:**

Click "Add New" for each variable:

#### Variable 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://glqbexyggoejlrjuqjor.supabase.co`
- **Environment**: Production, Preview, Development (check all 3)

#### Variable 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscWJleHlnZ29lamxyanVxam9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDkyNzcsImV4cCI6MjA4MzAyNTI3N30.VWWvQiRqIM9lbL5YMzmiU3CP7huhPHd3QhBseGMLLUc`
- **Environment**: Production, Preview, Development (check all 3)

#### Variable 3:
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscWJleHlnZ29lamxyanVxam9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ0OTI3NywiZXhwIjoyMDgzMDI1Mjc3fQ.-wJR01yzNbD-OGa6cF5Xmz0QGMV5QW2_8WskNpV01k8`
- **Environment**: Production, Preview, Development (check all 3)

#### Variable 4 (Optional but recommended):
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://your-app-name.vercel.app` (your actual Vercel URL)
- **Environment**: Production, Preview, Development (check all 3)

### **Click "Save" after adding each variable**

---

## 🔄 Step 2: Redeploy Your App

After adding environment variables:

1. **Go to**: Deployments tab in Vercel
2. **Click the three dots** (...) on the latest deployment
3. **Click "Redeploy"**
4. **Wait ~2-3 minutes** for deployment to complete

Or simply push a new commit to GitHub:
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

---

## 🗄️ Step 3: Set Up Database (IMPORTANT!)

Your database still needs to be set up. **Run this in Supabase SQL Editor:**

1. **Go to**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/sql/new
2. **Open file**: `complete-setup.sql` from your project
3. **Copy all contents** and paste into SQL Editor
4. **Click Run**

This creates:
- ✅ Companies table
- ✅ Users table
- ✅ Your admin user
- ✅ Security policies

---

## 🔐 Step 4: Update Supabase Auth URLs

Tell Supabase about your Vercel domain:

1. **Go to**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/url-configuration
2. **Site URL**: Enter your Vercel URL (e.g., `https://your-app.vercel.app`)
3. **Redirect URLs**: Add these:
   - `https://your-app.vercel.app/**`
   - `https://*.vercel.app/**` (for preview deployments)
4. **Click Save**

---

## 🎉 Step 5: Test Your Live App

1. **Open your Vercel URL**: `https://your-app-name.vercel.app`
2. **Go to login**: `https://your-app-name.vercel.app/login`
3. **Login** with the credentials you created in Supabase Auth
4. **You should see the dashboard!** 🎉

---

## 📋 Quick Checklist

- [ ] Add 3 environment variables to Vercel
- [ ] Redeploy from Vercel dashboard
- [ ] Run `complete-setup.sql` in Supabase SQL Editor
- [ ] Update Supabase Auth URLs with your Vercel domain
- [ ] Test login on your live Vercel URL

---

## 🔍 Find Your Vercel URL

If you don't know your Vercel URL:

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Look for the URL at the top (e.g., `your-project.vercel.app`)
4. Or check the "Domains" tab

---

## 🆘 Troubleshooting

### "Invalid API key" error on Vercel
- ❌ Environment variables not added or incorrect
- ✅ Add all 3 variables in Vercel Settings → Environment Variables
- ✅ Redeploy after adding variables

### "Relation does not exist" error
- ❌ Database not set up
- ✅ Run `complete-setup.sql` in Supabase SQL Editor

### Can't login / Redirect error
- ❌ Supabase Auth URLs not updated
- ✅ Add your Vercel URL to Supabase Auth URL Configuration

### App works locally but not on Vercel
- ❌ Environment variables only in `.env.local` (not in Vercel)
- ✅ Must add environment variables in Vercel dashboard

---

## 🔐 Security Note

The environment variables in Vercel are secure and encrypted. They're only accessible during build time and runtime, not exposed in the browser (except `NEXT_PUBLIC_*` variables which are meant to be public).

---

## 📍 Important Links

### Your Vercel Project
- Dashboard: https://vercel.com/dashboard
- Find your project and click on it

### Your Supabase Project
- Dashboard: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor
- SQL Editor: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/sql/new
- Auth Config: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/url-configuration

### Your GitHub Repo
- Repository: https://github.com/lovedesignwork/tconnext-islanddream

---

## 🎯 Summary

**To deploy to Vercel:**

1. ✅ Add environment variables in Vercel (Step 1)
2. ✅ Redeploy (Step 2)
3. ✅ Run database setup in Supabase (Step 3)
4. ✅ Update Auth URLs in Supabase (Step 4)
5. ✅ Test your live app (Step 5)

---

## 🚀 After Deployment

Once your app is live on Vercel:

1. **Share the URL** with your team
2. **Create more users** in Supabase Auth
3. **Run full migrations** for all features (bookings, programs, etc.)
4. **Customize** your company settings

---

## 📱 Custom Domain (Optional)

Want to use your own domain instead of `.vercel.app`?

1. Go to Vercel → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase Auth URLs with your custom domain

---

**Next Action**: Add the 3 environment variables to Vercel, then redeploy! 🚀

Your app will be live at: `https://your-project-name.vercel.app`

