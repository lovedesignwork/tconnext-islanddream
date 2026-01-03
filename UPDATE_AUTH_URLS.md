# 🔐 Update Supabase Auth URLs for Your Custom Domain

## Your Custom Domain
✅ **https://www.islanddreamexploration.live/**

---

## 🎯 Update Supabase Authentication URLs

### **Go to Supabase Auth Configuration:**

👉 **Direct Link**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/url-configuration

### **Update These Settings:**

#### 1. **Site URL**
Replace the current value with:
```
https://www.islanddreamexploration.live
```

#### 2. **Redirect URLs** (Add these)
Click "Add URL" for each:
```
https://www.islanddreamexploration.live/**
https://islanddreamexploration.live/**
https://*.vercel.app/**
```

**Why these URLs?**
- First one: Your main domain with www
- Second one: Without www (in case someone visits without it)
- Third one: For Vercel preview deployments

#### 3. **Click "Save"**

---

## 🔄 Update Environment Variable in Vercel

Since you're using a custom domain, update the app URL:

1. **Go to**: https://vercel.com/dashboard
2. **Click your project**: tconnext-island-dream
3. **Go to**: Settings → Environment Variables
4. **Find**: `NEXT_PUBLIC_APP_URL` (or add it if it doesn't exist)
5. **Set value to**: `https://www.islanddreamexploration.live`
6. **Save** and **Redeploy**

---

## ✅ Verify Everything Works

### Test Your Live App:

1. **Visit**: https://www.islanddreamexploration.live/
2. **Go to login**: https://www.islanddreamexploration.live/login
3. **Login** with your credentials:
   - Email: (the one you created in Supabase Auth)
   - Password: (your password)
4. **You should see the dashboard!** 🎉

---

## 🔍 Check Your Admin User

Your admin user should be ready with:
- **UUID**: `172de6e1-6d61-4f2e-93d5-527119a01776`
- **Role**: `master_admin`
- **Company ID**: `00000000-0000-0000-0000-000000000001`

To verify in Supabase:
1. Go to **Authentication** → **Users**
2. You should see your user
3. Go to **Database** → **Table Editor** → **users** table
4. You should see your admin user entry

---

## 🎨 What You Can Do Now

Once logged in to https://www.islanddreamexploration.live/, you can:

### 1. **Update Company Settings**
- Go to Settings → Company
- Update company name, email, phone
- Upload company logo
- Set timezone and currency

### 2. **Run Full Migrations (Optional)**
For complete features, run the full migrations from `supabase/migrations/` folder:
- Bookings management
- Programs (tours/activities)
- Agents (travel agencies)
- Drivers and Guides
- Invoicing
- Reports

To do this:
1. Go to Supabase SQL Editor
2. Run each migration file from `001_initial_schema.sql` onwards
3. This adds all the advanced features

### 3. **Start Using the App**
With just the basic setup, you can:
- Manage users and team members
- Update company information
- Access the dashboard

With full migrations, you get:
- Complete booking management
- Agent management
- Driver/Guide portals
- Invoice generation
- Financial reports
- And much more!

---

## 🚀 Next Steps

### Immediate (Required):
- [ ] Update Supabase Auth URLs with your domain
- [ ] Test login at https://www.islanddreamexploration.live/login
- [ ] Verify you can access the dashboard

### Soon (Recommended):
- [ ] Run full database migrations for all features
- [ ] Create additional team members
- [ ] Customize company branding
- [ ] Set up programs and agents

### Optional:
- [ ] Set up email service (Resend) for notifications
- [ ] Configure Stripe for payments
- [ ] Add custom branding and logo

---

## 📍 Your Important Links

### Your Live App
- **Main URL**: https://www.islanddreamexploration.live/
- **Login**: https://www.islanddreamexploration.live/login
- **Dashboard**: https://www.islanddreamexploration.live/dashboard

### Supabase
- **Auth Config**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/url-configuration
- **SQL Editor**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/sql/new
- **Database Tables**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/database/tables
- **Auth Users**: https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/users

### Vercel
- **Dashboard**: https://vercel.com/dashboard
- **Your Project**: Find tconnext-island-dream

### GitHub
- **Repository**: https://github.com/lovedesignwork/tconnext-islanddream

---

## 🆘 Troubleshooting

### Can't login / Redirect error
**Problem**: Auth redirect URLs not updated
**Solution**: 
1. Go to Supabase Auth URL Configuration
2. Add your domain: `https://www.islanddreamexploration.live/**`
3. Save and try again

### "Invalid credentials" error
**Problem**: User not created or wrong password
**Solution**:
1. Check Supabase → Authentication → Users
2. Verify your user exists
3. Try resetting password in Supabase Auth

### "Relation does not exist" error
**Problem**: Some tables missing
**Solution**:
1. You ran `complete-setup.sql` ✅
2. If you need more features, run full migrations
3. Go to SQL Editor and run files from `supabase/migrations/` folder

### Page shows blank or error
**Problem**: Environment variables not set in Vercel
**Solution**:
1. Check Vercel → Settings → Environment Variables
2. Ensure all 3 variables are added
3. Redeploy if you just added them

---

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Custom Domain | ✅ Connected | islanddreamexploration.live |
| Vercel Deployment | ✅ Live | Auto-deploys from GitHub |
| Supabase Database | ✅ Setup | Basic tables created |
| Admin User | ✅ Created | UUID: 172de6e1-6d61-4f2e-93d5-527119a01776 |
| Storage Buckets | ✅ Created | 4 buckets ready |
| Auth URLs | ⏳ Pending | Update with your domain |
| Full Features | ⏳ Optional | Run full migrations for all features |

---

## 🎉 You're Almost Done!

**Last step**: Update the Auth URLs in Supabase, then test your login!

**Your live app**: https://www.islanddreamexploration.live/

---

## 📝 Summary

**What you've accomplished:**
1. ✅ GitHub repository created
2. ✅ Vercel deployment with custom domain
3. ✅ Supabase project connected
4. ✅ Database setup completed
5. ✅ Admin user created
6. ✅ Storage buckets created

**What's left:**
1. ⏳ Update Supabase Auth URLs (2 minutes)
2. ⏳ Test login on your live site
3. ⏳ (Optional) Run full migrations for all features

**You're 95% done!** 🚀

---

**Next Action**: 
Update Supabase Auth URLs with your domain:
👉 https://supabase.com/dashboard/project/glqbexyggoejlrjuqjor/auth/url-configuration

Then visit: https://www.islanddreamexploration.live/login

