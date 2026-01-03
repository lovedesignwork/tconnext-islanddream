# TConnext Application Links Documentation

Complete listing of all links, routes, and navigation paths in the TConnext application.

Last Updated: December 20, 2025

---

## Table of Contents
- [External Links](#external-links)
- [Public Routes](#public-routes)
- [Dashboard Routes (Authenticated)](#dashboard-routes-authenticated)
- [Admin Routes (Super Admin)](#admin-routes-super-admin)
- [Auth Routes](#auth-routes)
- [API Endpoints](#api-endpoints)
- [Dynamic Routes](#dynamic-routes)
- [Communication Links](#communication-links)
- [Subdomain Structure](#subdomain-structure)

---

## External Links

### Marketing & Sales
- **Main Website**: `https://tconnext.app`
- **Pricing/Signup**: `https://buy.tconnext.app`
- **Demo Access**: `https://demo.tconnext.app/login`

### Third-Party Services
- **Unsplash Images** (fallback): `https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop`

### Legal & Support
- **Email Support**: `mailto:support@tconnext.app`
- **Privacy Policy**: `/privacy`
- **Terms of Service**: `/terms`

---

## Public Routes
*Routes accessible without authentication*

### Landing & Marketing
- `/landing` - Main landing page (root domain shows this)
- `/signup` - Sign up form for new companies

### Online Booking (Public)
- `/booking` - Program selection page
  - Query param: `?subdomain={company-slug}`
- `/booking/{slug}` - Specific program booking page
  - Where `{slug}` is the program identifier
- `/booking/success` - Booking confirmation page
  - Query params: `?subdomain={company-slug}&payment={method}&ref={booking-number}`
- `/booking/failed` - Booking failure page
  - Query param: `?subdomain={company-slug}`

### Availability Check
- `/availability/{slug}` - Check program availability
  - Where `{slug}` is the program identifier

### Portal Links (Public Access)
- `/driver/{id}` - Driver portal for pickup management
  - Where `{id}` is the driver's unique link ID
- `/guide/{id}` - Guide portal for tour management
  - Where `{id}` is the guide's unique link ID
- `/direct` - Direct booking entry point

---

## Dashboard Routes (Authenticated)
*Routes requiring user authentication and company access*

### Main Operations
- `/dashboard` - Main bookings dashboard
  - View all bookings
  - Create new booking: `/dashboard/new`
  - Edit booking: `/dashboard/{id}/edit`
- `/slots` - Program slot management
- `/pickup` - Pickup/Drop-off coordination
- `/set-boat` - Boat assignment interface
- `/op-report` - Operations report
  - Query params: filtering options

### Financial Management
- `/invoices` - Invoice management
  - Query param: `?booking={booking-id}` to filter by booking
- `/finance` - Financial overview and tracking
- `/reports` - Business analytics and reports

### Setup & Configuration
*Setup submenu items*

#### Program & Resources
- `/programs` - Program setup and configuration
- `/agents` - Travel agent management
- `/drivers` - Driver setup and management
- `/guides` - Guide setup and management
- `/restaurants` - Restaurant/vendor setup
- `/boats` - Boat fleet management
- `/hotels` - Pickup location/hotel management

### Settings (Master Admin / Super Admin Only)
- `/settings` - General settings hub
  - Query params for different tabs:
    - `?tab=general` - Company general settings
    - `?tab=invoice` - Invoice configuration
    - `?tab=booking` - Online booking settings
    - `?tab=payment` - Payment gateway settings
    - `?tab=email` - Email notification settings
    - `?tab=pickup` - Pickup default settings
    - `?tab=op-report` - OP Report configuration
    - `?tab=security` - Security & PIN settings

---

## Admin Routes (Super Admin)
*Routes for platform administrators only*

### Admin Portal
*Access via: `admin.tconnext.com` or `superadmin.tconnext.com`*

- `/admin` - Admin dashboard
- `/admin/companies` - Company management
  - View all companies
  - Company details: `/admin/companies/{id}`
  - Company portal link: `https://{company-slug}.tconnext.com`
- `/admin/billing` - Billing & payment tracking
  - Filter: `?filter=overdue` for overdue payments
- `/admin/analytics` - Platform-wide analytics
- `/admin/settings` - Platform settings & branding

---

## Auth Routes

### Authentication
- `/login` - User login
  - Redirects to `/admin` for super_admin
  - Redirects to `/dashboard` for regular users
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form (from email link)

### Post-Login Redirects
- **Tenant Users**: `/{company-slug}.tconnext.app/login` → `/dashboard`
- **Super Admin**: `admin.tconnext.com/login` → `/admin`

---

## API Endpoints

### Public API
- `/api/signup` - Company registration
- `/api/branding` - Fetch platform branding
- `/api/auth/login` - User authentication
- `/api/auth/logout` - User logout

### Authenticated API

#### User Management
- `/api/auth/me` - Get current user info
- `/api/auth/create-team-member` - Create new team member

#### Booking Operations
- `/api/bookings/{id}/send-pickup-email` - Send pickup details via email

#### Financial
- `/api/invoices/send-email` - Send invoice email
- `/api/stripe/create-payment-intent` - Create Stripe payment
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/stripe/connect` - Stripe Connect setup
- `/api/stripe/connect/status` - Check Stripe connection status

#### Operations
- `/api/op-report/send-email` - Send OP report via email
- `/api/op-report/auto-send` - Automated OP report sending

#### Settings & Config
- `/api/settings/upload-logo` - Upload company logo
- `/api/proxy-image` - Image proxy for external images

#### Testing
- `/api/test-supabase` - Supabase connection test

### Admin API (Super Admin Only)
- `/api/admin/settings` - Platform settings management
- `/api/admin/upload` - File upload for admin
- `/api/admin/reset-password` - Admin password reset
- `/api/admin/merge-duplicate-agents` - Merge duplicate agent records

---

## Dynamic Routes

### Booking Links
Format: `https://{company-slug}.tconnext.app/booking/{program-slug}`

Example: `https://demo.tconnext.app/booking/phi-phi-island-tour`

### Portal Access Links

#### Driver Portal
Format: `/driver/{unique-link-id}`

Full URL: `https://{company-domain}/driver/{unique-link-id}`

Generated from: `window.location.origin + '/driver/' + guide.unique_link_id`

#### Guide Portal  
Format: `/guide/{unique-link-id}`

Full URL: `https://{company-domain}/guide/{unique-link-id}`

Generated from: `window.location.origin + '/guide/' + guide.unique_link_id`

### Success/Return URLs

#### Stripe Payment Return
Format: `{window.location.origin}/booking/success?subdomain={subdomain}&payment=stripe`

#### Cash Payment Success
Format: `/booking/success?subdomain={subdomain}&payment=cash&ref={booking-number}`

---

## Communication Links

### WhatsApp
Format: `https://wa.me/{phone-number}`

With message: `https://wa.me/{phone-number}?text={encoded-message}`

Used for:
- Customer support
- Pickup confirmations
- Booking assistance
- Driver/Guide contact

Example: `https://wa.me/66812345678?text=Hi, I had trouble completing my online booking. Can you help me?`

### Telephone
Format: `tel:{phone-number}`

Used for:
- Direct customer calls
- Driver contact
- Restaurant contact
- Guide contact
- Boat captain contact

### Email
Format: `mailto:{email-address}`

Used for:
- Support contact
- Booking confirmations
- Invoice delivery

---

## Subdomain Structure

### Production Domain Structure
Base domain: `tconnext.com`

#### Root Domain
- `tconnext.com` → Redirects to `/landing`
- `www.tconnext.com` → Redirects to `/landing`

#### Special Subdomains
- `admin.tconnext.com` → Admin portal (super admin only)
- `superadmin.tconnext.com` → Admin portal (alias)
- `buy.tconnext.com` → Sales/signup page
- `demo.tconnext.com` → Demo company instance

#### Company Subdomains
- `{company-slug}.tconnext.com` → Company-specific portal
  - Example: `phuket-tours.tconnext.com`
  - Example: `krabi-adventures.tconnext.com`

### Development/Preview
- Local: `localhost:3000?subdomain={company-slug}`
- Vercel: `{deployment}.vercel.app?subdomain={company-slug}`

---

## Navigation Structure

### Dashboard Sidebar Navigation

#### Main Operations Menu
1. Bookings (`/dashboard`)
2. Program Slots (`/slots`)
3. Pick-up / Drop-off (`/pickup`)
4. Set Boat (`/set-boat`)
5. OP Report (`/op-report`)
6. Invoices (`/invoices`)
7. Finance (`/finance`)
8. Reports (`/reports`)

#### Setup Menu (Collapsible)
1. Program Setup (`/programs`)
2. Agents Setup (`/agents`)
3. Driver Setup (`/drivers`)
4. Guide Setup (`/guides`)
5. Restaurant Setup (`/restaurants`)
6. Boat Setup (`/boats`)
7. Location Setup (`/hotels`)

#### Settings Menu (Admin Only - Collapsible)
1. General (`/settings?tab=general`)
2. Invoice (`/settings?tab=invoice`)
3. Online Booking (`/settings?tab=booking`)
4. Payment (`/settings?tab=payment`)
5. Email (`/settings?tab=email`)
6. Pickup (`/settings?tab=pickup`)
7. OP Report (`/settings?tab=op-report`)
8. Security (`/settings?tab=security`)

### Admin Sidebar Navigation

#### Main Menu
1. Dashboard (`/admin`)
2. Companies (`/admin/companies`)
3. Billing (`/admin/billing`)
4. Analytics (`/admin/analytics`)

#### Bottom Menu
1. Settings (`/admin/settings`)

---

## Page Lock Feature

Certain pages can be locked with PIN protection when enabled:

- `dashboard` - Main bookings page
- `slots` - Program slots
- `pickup` - Pickup coordination
- `set_boat` - Boat assignment
- `op_report` - Operations report
- `invoices` - Invoice management
- `finance` - Financial pages
- `reports` - Reports & analytics
- `programs` - Program setup
- `agents` - Agent management
- `drivers` - Driver management
- `guides` - Guide management
- `restaurants` - Restaurant setup
- `boats` - Boat setup
- `hotels` - Location setup

---

## Route Permissions

### Public Routes (No Auth Required)
- `/login`
- `/forgot-password`
- `/direct`
- `/driver/*`
- `/guide/*`
- `/booking/*`
- `/availability/*`
- `/signup`
- `/landing`

### Protected Routes (Auth Required)
All `/dashboard/*`, `/settings`, `/programs`, `/agents`, etc.

### Super Admin Routes (Super Admin Role Required)
- `/admin/*`

### API Public Routes
- `/api/public/*`
- `/api/auth/login`
- `/api/auth/forgot-password`
- `/api/driver-portal/*`
- `/api/signup`
- `/api/branding`

---

## Middleware Rules

### Authentication Check
All routes except public routes require authentication.

### Company Context
Company subdomain determines which company's data is accessed.
Users can only access their company's data (except super_admin).

### Role-Based Access
- **Super Admin**: Access to `/admin/*` routes
- **Master Admin**: Access to `/settings/*` routes
- **Regular Users**: Access based on permission settings

---

## External Resources & Assets

### Static Assets
- `/_next/static/*` - Next.js static files
- `/_next/image/*` - Next.js optimized images
- `/favicon.ico` - Favicon

### Custom Branding
- Company logos (uploaded via settings)
- Favicons (uploaded via admin settings)
- Platform branding (admin-controlled)

---

## Notes

### URL Generation Patterns
- Portal links use: `window.location.origin + '/driver/' + uniqueId`
- Return URLs capture: `window.location.origin + '/booking/success'`
- Stripe returns to same origin with payment status

### Query Parameters
- `subdomain` - Company identifier for multi-tenant routing
- `tab` - Settings tab selector
- `filter` - Data filtering (billing, reports)
- `booking` - Booking ID reference
- `payment` - Payment method indicator
- `ref` - Booking reference number

### Redirects
- Root domain (`/`) → `/landing`
- Super admin subdomain root → `/admin`
- Buy subdomain root → `/signup`
- Post-login → `/dashboard` or `/admin` based on role
- Unauthorized → `/login` with error param

---

## Development Reference

### Router Methods Used
- `router.push(path)` - Client-side navigation
- `router.replace(path)` - Replace current history entry
- `window.location.href = path` - Full page navigation
- `window.open(url, target)` - Open in new window/tab

### Link Components
- `<Link href="...">` from Next.js for internal navigation
- `<a href="...">` for external links and special protocols (tel:, mailto:, https://)

---

*This document is auto-generated based on the codebase structure. For updates, regenerate from source code.*

