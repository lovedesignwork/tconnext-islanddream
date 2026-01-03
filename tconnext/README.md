# TConnext - Tour Booking Management Platform

A single-tenant booking management platform for tour operators to manage bookings, agents, drivers, boats, and customer communications.

## Features

- **Booking Management**: Full CRUD with filters, search, export, and email notifications
- **Programs & Availability**: Tour programs with calendar-based availability management
- **Agent Management**: Agent profiles with custom pricing matrix per program
- **Driver Portal**: External access for drivers with PIN authentication
- **Guide Portal**: External access for guides with assignments
- **Boat Management**: Track boats and capacity for tour assignments
- **Invoicing**: Generate and send invoices to agents
- **Reports**: Dashboard with charts and statistics
- **Direct Booking**: Public booking page for customers
- **Availability Display**: Public page showing tour availability

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Auth with role management
- **Storage**: Supabase Storage for attachments/logos
- **Styling**: Tailwind CSS + shadcn/ui components
- **Email**: Resend for transactional emails
- **Charts**: Recharts for data visualization

## Roles

| Role | Description |
|------|-------------|
| `master_admin` | Full access to all features and settings |
| `staff` | Limited access based on assigned permissions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- (Optional) Resend account for emails
- (Optional) Stripe account for payments

### Installation

1. Clone the repository and install dependencies:

```bash
cd tconnext
npm install
```

2. Copy the environment example file and configure:

```bash
cp .env.example .env.local
```

3. Set up your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-at-least-32-chars-long

# Optional
RESEND_API_KEY=your_resend_api_key
```

4. Set up the database:
   - Go to your Supabase project SQL Editor
   - Run the migrations in order from `supabase/migrations/`
   - Update `003_seed_data.sql` with your company info before running

5. Create the master admin user:
   - Create a user in Supabase Auth dashboard
   - Run this SQL with the auth user ID:
   ```sql
   INSERT INTO users (auth_id, company_id, role, permissions, name, email)
   VALUES (
     'YOUR_AUTH_USER_ID',
     '00000000-0000-0000-0000-000000000001',
     'master_admin',
     '{}',
     'Admin Name',
     'admin@yourcompany.com'
   );
   ```

6. Run the development server:

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
tconnext/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, forgot password
│   │   ├── (dashboard)/     # Main dashboard pages
│   │   ├── (public)/        # Public pages (booking, driver portal, etc.)
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── layout/          # Sidebar, header, page header
│   │   ├── providers/       # Auth, theme providers
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/        # Supabase clients
│   │   ├── auth.ts          # Auth utilities
│   │   ├── email.ts         # Email templates
│   │   └── utils.ts         # Helper functions
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
└── public/                  # Static files
```

## URL Structure

- `/login` - Login page
- `/dashboard` - Main bookings view
- `/slots` - Program availability calendar
- `/pickup` - Driver pickup assignments
- `/set-boat` - Boat assignments
- `/op-report` - Operations report
- `/invoices` - Invoice management
- `/finance` - Financial tracking
- `/reports` - Analytics
- `/settings` - Company settings
- `/driver/[id]` - Driver portal (external access)
- `/guide/[id]` - Guide portal (external access)
- `/booking/[slug]` - Public booking page
- `/availability/[slug]` - Public availability display

## New Customer Setup

See the **NEW-CUSTOMER-CHECKLIST.md** in the parent directory for step-by-step setup instructions.

## License

Private - All rights reserved.
