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

2. **Set up Supabase** - Follow the detailed guide:

📖 **See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete Supabase connection instructions**

Quick summary:
- Create a Supabase project
- Copy `.env.example` to `.env.local`
- Add your Supabase credentials
- Run database migrations
- Create storage buckets

3. (Optional) Configure additional services:

```env
# Email (using Resend)
RESEND_API_KEY=your_resend_api_key

# Stripe for payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

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
