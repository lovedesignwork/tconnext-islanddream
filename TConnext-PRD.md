# TConnext - Product Requirements Document

## Overview

TConnext is a multi-tenant SaaS platform for tour operators to manage their bookings, agents, drivers, boats, and customer communications. Each tour company gets their own isolated environment with subdomain access.

**Target Users**: Tour operators in Phuket (initially), expandable to other regions.

**Tech Stack**: Supabase (database + auth), Vercel (hosting), React, Next.js

**Live URL Structure**: `{companyname}.tconnext.com`

---

## User Roles & Hierarchy

### 1. Super Admin (Platform Owner)
- Creates and manages company accounts (tenants)
- Each company's data is completely isolated
- Can view subscription status across all companies
- Access: Main TConnext admin panel

### 2. Master Admin (Company Owner)
- Full access to their company's data only
- Manages staff accounts and permissions
- Handles all setup configurations (programs, agents, drivers, boats)
- Manages company settings and branding

### 3. Staff
- Limited access based on Master Admin permissions
- Typically handles day-to-day booking operations
- Cannot access "Setup" sections by default (configurable)

### 4. Drivers (External Access)
- Access via unique link + 4-6 digit PIN
- View-only access to their assigned pickup list for the day
- Can download PDF version

### 5. Customers (Public)
- Access direct booking page: `{companyname}.tconnext.com/direct`
- No login required, one-time booking flow

---

## Core Panels & Features

### 1. Dashboard (Booking Management)

The main operational view showing all bookings in a table format.

#### Booking Fields:
| Field | Type | Description |
|-------|------|-------------|
| Booking Number | Auto-generated | Format: `{COMPANY-INITIALS}-{6-digit-number}` (e.g., IDE-000001) |
| Booking Date | Date | When the tour happens |
| Booking Source | Dropdown | Agent name or "Direct Website" |
| Program | Dropdown | Selected tour program |
| Customer Name | Text | Guest name |
| Adult | Number | Number of adults |
| Child | Number | Number of children |
| Infant | Number | Number of infants |
| Pickup Location | Dropdown/Search | Hotel name (linked to area for driver assignment) |
| Pickup Time | Time | Set by admin, not customer |
| Notes | Text | Customer-facing notes (allergies, dietary, etc.) |
| Collect Money | Number | Amount to collect from customer (THB), 0 if prepaid |
| Internal Remarks | Text | Admin-only notes, not visible to customer |
| Attachments | File upload | Pay receipts, vouchers, etc. |
| Status | Dropdown | Confirmed, Pending, Cancelled, Completed |
| Created At | Timestamp | Auto-generated |
| Updated At | Timestamp | Auto-generated |

#### Dashboard Actions:
- **Add Booking**: Manual entry form
- **Edit Booking**: Inline or modal edit
- **Delete Booking**: Double confirmation required, soft delete (recoverable)
- **Send Pickup Time Email**: Button appears when pickup time is set, sends notification to customer
- **Sort**: Click column headers to sort ascending/descending
- **Filter**: Multi-select filters for date range, booking source, program, status
- **Search**: Quick search by customer name or booking number
- **Export**: CSV/Excel export of filtered results

#### Booking Number Logic:
- Extract initials from company name (e.g., "Island Dream Exploration" → "IDE")
- Sequential numbering per company, never resets
- Format: `{INITIALS}-{000001}` padded to 6 digits

---

### 2. Programs Panel

Manage tour programs/packages offered by the company.

#### Program Fields:
| Field | Type | Description |
|-------|------|-------------|
| Program ID | Auto-generated | Internal reference |
| Program Name | Text | Display name |
| Description | Rich Text | Program details |
| Duration | Text | e.g., "Full Day", "Half Day", "2D1N" |
| Base Price | Number | Default selling price |
| Status | Toggle | Active / Suspended |
| Created At | Timestamp | Auto-generated |

#### Availability Management:
- **Calendar View**: Visual calendar showing slots per day
- **Daily Settings**:
  - Open/Closed toggle
  - Available slots (number)
  - Booked count (auto-calculated from bookings)
  - Remaining slots (auto-calculated)
- **Bulk Edit**: Select date range and apply same settings
- **Public Availability Page**: `{companyname}.tconnext.com/slot`
  - Shows all active programs with availability by date
  - Read-only view for agents to check before booking
  - Clean, mobile-friendly design

#### Program Actions:
- **Create**: Add new program
- **Edit**: Modify program details
- **Suspend**: Temporarily disable (keeps all historical data, just hidden from booking dropdowns)
- **Delete**: Soft delete with double confirmation

---

### 3. Agents Panel

Manage booking sources (travel agents, partners).

#### Agent Fields:
| Field | Type | Description |
|-------|------|-------------|
| Agent ID | Auto-generated | Internal reference |
| Agent Name | Text | Company/agent name |
| Contact Person | Text | Primary contact |
| Email | Email | For invoices |
| Phone | Text | Contact number |
| WhatsApp | Text | WhatsApp number |
| Status | Toggle | Active / Suspended |
| Notes | Text | Internal notes about this agent |
| Created At | Timestamp | Auto-generated |

#### Agent Pricing (per Program):
Each agent can have custom pricing for each program:
| Field | Description |
|-------|-------------|
| Program | Linked program |
| Selling Price | What customer pays |
| Agent Price | What agent pays (your revenue) |
| Commission | Auto-calculated (Selling - Agent Price) |

This creates a pricing matrix: Agent × Program = Custom Price

#### Agent Financial Tracking:
- Total bookings (count)
- Total revenue (sum of agent prices)
- Outstanding balance (sum of "Collect Money" amounts for this agent)

---

### 4. Drivers Panel

Manage drivers and their daily pickup assignments.

#### Driver Fields:
| Field | Type | Description |
|-------|------|-------------|
| Driver ID | Auto-generated | Internal reference |
| Driver Name | Text | Full name |
| Phone | Text | Contact number |
| WhatsApp | Text | WhatsApp number |
| Vehicle Info | Text | Car model, plate number |
| Status | Toggle | Active / Suspended |
| Access PIN | Auto-generated | 4-6 digit PIN for driver portal |
| Unique Link | Auto-generated | Personal access URL |

#### Pickup Location Setup (Shared Resource):
Hotels/pickup points are shared across the system:
| Field | Type | Description |
|-------|------|-------------|
| Hotel Name | Text | Property name |
| Area | Dropdown | Zone/district (e.g., Patong, Kata, Karon, Phuket Town) |
| Address | Text | Full address |
| Pickup Notes | Text | Where to meet, landmarks, etc. |

#### Daily Driver Assignment:
- **View**: Calendar or date picker to select day
- **Auto-Assignment Logic**:
  1. Group all bookings for the day by pickup area
  2. Assign driver to cover specific areas
  3. Within each driver's assignment, sort by logical pickup route (same area together)
- **Manual Override**: Admin can drag-drop reassign customers between drivers
- **Driver Load View**: See how many pax each driver has

#### Driver Portal (External Access):
- URL: `{companyname}.tconnext.com/driver/{unique-id}`
- Requires PIN entry
- Shows:
  - Today's date (can view tomorrow too)
  - List of pickups sorted by time/area
  - Customer name, hotel, pax count, pickup time, notes
  - Contact button (click to WhatsApp/call customer)
- **PDF Download**: Formatted pickup list for printing

#### Pickup List PDF Format:
```
[Company Logo]
[Company Name]
Driver Pickup List - [Date]
Driver: [Name]

| # | Time  | Customer    | Pax | Hotel        | Room | Notes      |
|---|-------|-------------|-----|--------------|------|------------|
| 1 | 07:30 | John Smith  | 2A  | Patong Beach | 302  | Vegetarian |
| 2 | 07:45 | Jane Doe    | 2A1C| Holiday Inn  | 115  | -          |

Total Passengers: X Adults, X Children, X Infants

[Company Contact Info]
```

---

### 5. Boats Panel

Manage boats and daily passenger assignments.

#### Boat Fields:
| Field | Type | Description |
|-------|------|-------------|
| Boat ID | Auto-generated | Internal reference |
| Boat Name | Text | Vessel name |
| Capacity | Number | Maximum passengers |
| Captain Name | Text | Captain/crew contact |
| Phone | Text | Contact number |
| Status | Toggle | Active / Suspended |
| Notes | Text | Internal notes |

#### Daily Boat Assignment:
- **View**: Calendar or date picker
- **Auto-Assignment Logic**:
  1. Group bookings by program (each program may use different boats)
  2. Fill boats to capacity, create overflow to additional boats
  3. Show remaining capacity per boat
- **Manual Override**: Admin can reassign customers between boats
- **Boat Load View**: Visual capacity indicator per boat

#### Boat Manifest PDF:
Similar to driver pickup list but grouped by boat:
```
[Company Logo]
[Company Name]
Boat Manifest - [Date]
Boat: [Name] | Captain: [Name] | Capacity: [X]

Program: [Program Name]

| # | Customer    | Pax  | Pickup Hotel | Notes      |
|---|-------------|------|--------------|------------|
| 1 | John Smith  | 2A   | Patong Beach | Vegetarian |

Total: X/[Capacity] (X Adults, X Children, X Infants)

[Company Contact Info]
```

---

### 6. Invoices Panel

Generate and manage invoices for agents.

#### Invoice Generation:
1. Select Agent
2. Select Date Range
3. System pulls all bookings for that agent in range
4. Auto-calculates totals based on agent pricing

#### Invoice Fields:
| Field | Type | Description |
|-------|------|-------------|
| Invoice Number | Auto-generated | Format: `INV-{COMPANY}-{YYYYMM}-{001}` |
| Agent | Reference | Linked agent |
| Date Range | Date range | Bookings included |
| Booking Count | Number | Auto-calculated |
| Total Amount | Number | Sum of agent prices |
| Status | Dropdown | Draft, Sent, Paid, Overdue |
| Created At | Timestamp | Auto-generated |
| Sent At | Timestamp | When email was sent |
| Paid At | Timestamp | When marked as paid |

#### Invoice Line Items (auto-populated):
| Booking # | Date | Program | Pax | Amount |
|-----------|------|---------|-----|--------|

#### Invoice Actions:
- **Preview**: View formatted invoice before sending
- **Send Email**: Sends PDF to agent's email
- **Download PDF**: Manual download
- **Mark as Paid**: Update status
- **Delete**: Soft delete

#### Invoice PDF Format:
Professional invoice with:
- Company branding (logo, colors)
- Company details (name, address, tax ID, bank details)
- Agent details
- Line items table
- Totals
- Payment terms/instructions

---

### 7. Reports Panel

Overview dashboard for company owner/admin.

#### Filters:
- Date range (presets: Today, This Week, This Month, Custom)
- Booking Source (multi-select)
- Program (multi-select)
- Status (multi-select)

#### Metrics Displayed:
- Total Bookings (count)
- Total Passengers (Adults + Children + Infants breakdown)
- Revenue Summary (by agent pricing)
- Outstanding Collections (sum of "Collect Money" not yet collected)
- Bookings by Source (pie chart)
- Bookings by Program (bar chart)
- Daily Bookings Trend (line chart)

#### Export:
- Full data export with all filters applied (CSV/Excel)

---

### 8. Direct Booking Page (Public)

Customer-facing booking page at `{companyname}.tconnext.com/direct`

#### Single Page Flow:

**Section 1: Tour Selection**
- Program dropdown (active programs only)
- Date picker (only shows dates with available slots)
- Shows remaining slots for selected date

**Section 2: Guest Details**
- Number of Adults (number input)
- Number of Children (number input)
- Number of Infants (number input)
- Pickup Hotel (searchable dropdown)
- Notes (text area - allergies, dietary, etc.)

**Section 3: Contact Information**
- Full Name (required)
- Email (required)
- WhatsApp Number (required, with country code)

**Section 4: Payment**
- Order Summary (program, date, pax, total)
- Stripe Payment Element
- Pay Now button

#### On Successful Payment:
1. Create booking with source "Direct Website"
2. Reduce available slot count
3. Send confirmation email to customer with:
   - Booking reference number
   - Tour details
   - Note: "Pickup time will be confirmed separately"
4. Notify admin (optional: email/dashboard notification)

#### Stripe Integration:
- Stripe Connect for multi-tenant (each company has own Stripe account)
- Or: Single Stripe account with metadata for reconciliation
- Webhook handling for payment confirmation

---

### 9. Settings Panel

Company-specific configuration (Master Admin only).

#### Company Profile:
- Company Name
- Company Initials (for booking numbers, auto-suggested but editable)
- Address
- Phone
- Email
- Tax ID / Business Registration Number

#### Branding:
- Logo Upload (used on PDFs, invoices, public pages)
- Primary Color (hex picker)
- Secondary Color (hex picker)

#### Payment Settings:
- Bank Name
- Account Name
- Account Number
- Additional Payment Instructions

#### Stripe Settings:
- Stripe Public Key
- Stripe Secret Key
- Webhook Secret
- Test Mode toggle

#### Email Settings:
- From Name
- Reply-To Email
- Email Footer Text

#### Staff Management:
- View all staff accounts
- Create new staff
- Edit staff details
- Set permissions (see Permission Matrix below)
- Suspend/Delete staff

---

## Permission Matrix

Staff permissions are toggleable per panel. Each panel has two levels:
- **View**: Can see the panel and data
- **Manage**: Can add, edit, delete (where applicable)

| Panel | View | Manage | Setup |
|-------|------|--------|-------|
| Dashboard (Bookings) | ☐ | ☐ | - |
| Programs | ☐ | ☐ | ☐ |
| Agents | ☐ | ☐ | ☐ |
| Drivers | ☐ | ☐ | ☐ |
| Boats | ☐ | ☐ | ☐ |
| Invoices | ☐ | ☐ | - |
| Reports | ☐ | - | - |
| Settings | - | - | - |

**Notes**:
- "Setup" permission controls access to create/edit/delete core entities (programs, agents, drivers, boats)
- "Manage" for bookings = add/edit/delete bookings
- Settings is Master Admin only, never delegated
- Default staff: View Bookings + Manage Bookings only

---

## Data Architecture

### Multi-Tenancy Approach:
- Single database with `company_id` on all tables
- Row Level Security (RLS) in Supabase enforces data isolation
- Each query automatically filtered by authenticated user's company

### Core Tables:

```
companies
├── id (uuid, PK)
├── name
├── slug (subdomain)
├── initials
├── settings (jsonb - branding, payment, etc.)
├── subscription_status
├── created_at
└── updated_at

users
├── id (uuid, PK, links to Supabase Auth)
├── company_id (FK)
├── role (super_admin, master_admin, staff)
├── permissions (jsonb)
├── name
├── email
├── created_at
└── updated_at

programs
├── id (uuid, PK)
├── company_id (FK)
├── name
├── description
├── duration
├── base_price
├── status (active, suspended, deleted)
├── created_at
└── updated_at

program_availability
├── id (uuid, PK)
├── program_id (FK)
├── date
├── is_open (boolean)
├── total_slots
├── created_at
└── updated_at

agents
├── id (uuid, PK)
├── company_id (FK)
├── name
├── contact_person
├── email
├── phone
├── whatsapp
├── status
├── notes
├── created_at
└── updated_at

agent_pricing
├── id (uuid, PK)
├── agent_id (FK)
├── program_id (FK)
├── selling_price
├── agent_price
├── created_at
└── updated_at

hotels (pickup_locations)
├── id (uuid, PK)
├── company_id (FK)
├── name
├── area
├── address
├── pickup_notes
├── created_at
└── updated_at

drivers
├── id (uuid, PK)
├── company_id (FK)
├── name
├── phone
├── whatsapp
├── vehicle_info
├── status
├── access_pin (hashed)
├── unique_link_id
├── created_at
└── updated_at

boats
├── id (uuid, PK)
├── company_id (FK)
├── name
├── capacity
├── captain_name
├── phone
├── status
├── notes
├── created_at
└── updated_at

bookings
├── id (uuid, PK)
├── company_id (FK)
├── booking_number
├── booking_date
├── agent_id (FK, nullable - null for direct bookings)
├── program_id (FK)
├── customer_name
├── customer_email
├── customer_whatsapp
├── adults
├── children
├── infants
├── hotel_id (FK)
├── pickup_time
├── notes
├── collect_money
├── internal_remarks
├── status
├── is_direct_booking (boolean)
├── stripe_payment_id
├── driver_id (FK, nullable)
├── boat_id (FK, nullable)
├── pickup_email_sent (boolean)
├── created_at
└── updated_at

booking_attachments
├── id (uuid, PK)
├── booking_id (FK)
├── file_url
├── file_name
├── file_type
├── created_at
└── updated_at

invoices
├── id (uuid, PK)
├── company_id (FK)
├── invoice_number
├── agent_id (FK)
├── date_from
├── date_to
├── total_amount
├── status
├── sent_at
├── paid_at
├── created_at
└── updated_at

invoice_items
├── id (uuid, PK)
├── invoice_id (FK)
├── booking_id (FK)
├── amount
├── created_at
└── updated_at
```

---

## API Endpoints (High Level)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`

### Bookings
- `GET /api/bookings` (with filters)
- `POST /api/bookings`
- `PUT /api/bookings/:id`
- `DELETE /api/bookings/:id`
- `POST /api/bookings/:id/send-pickup-email`

### Programs
- `GET /api/programs`
- `POST /api/programs`
- `PUT /api/programs/:id`
- `DELETE /api/programs/:id`
- `GET /api/programs/:id/availability`
- `PUT /api/programs/:id/availability` (bulk update)

### Agents
- `GET /api/agents`
- `POST /api/agents`
- `PUT /api/agents/:id`
- `DELETE /api/agents/:id`
- `GET /api/agents/:id/pricing`
- `PUT /api/agents/:id/pricing`

### Drivers
- `GET /api/drivers`
- `POST /api/drivers`
- `PUT /api/drivers/:id`
- `DELETE /api/drivers/:id`
- `GET /api/drivers/:id/pickups?date=YYYY-MM-DD`
- `POST /api/drivers/assign` (auto-assign for date)
- `PUT /api/drivers/assign` (manual reassign)

### Boats
- `GET /api/boats`
- `POST /api/boats`
- `PUT /api/boats/:id`
- `DELETE /api/boats/:id`
- `GET /api/boats/manifest?date=YYYY-MM-DD`
- `POST /api/boats/assign` (auto-assign for date)
- `PUT /api/boats/assign` (manual reassign)

### Invoices
- `GET /api/invoices`
- `POST /api/invoices/generate`
- `GET /api/invoices/:id`
- `POST /api/invoices/:id/send`
- `PUT /api/invoices/:id/mark-paid`
- `DELETE /api/invoices/:id`

### Reports
- `GET /api/reports/summary` (with filters)
- `GET /api/reports/export` (CSV)

### Public (No Auth)
- `GET /api/public/:companySlug/availability`
- `GET /api/public/:companySlug/programs`
- `POST /api/public/:companySlug/booking` (direct booking)
- `POST /api/public/:companySlug/payment-webhook` (Stripe)

### Driver Portal (PIN Auth)
- `POST /api/driver-portal/auth`
- `GET /api/driver-portal/pickups`

### Super Admin
- `GET /api/admin/companies`
- `POST /api/admin/companies`
- `PUT /api/admin/companies/:id`
- `GET /api/admin/companies/:id/stats`

---

## Email Templates Needed

1. **Booking Confirmation (Direct)**: Sent to customer after successful payment
2. **Pickup Time Notification**: Sent when admin clicks "Send Pickup Time"
3. **Invoice**: Sent to agent with PDF attachment
4. **Staff Invitation**: Sent when Master Admin creates staff account
5. **Password Reset**: Standard reset flow

---

## PDF Templates Needed

1. **Driver Pickup List**: Daily pickup schedule for one driver
2. **Boat Manifest**: Daily passenger list for one boat
3. **Invoice**: Professional invoice for agent billing
4. **Booking Confirmation**: Receipt for direct bookings (optional)

---

## Third-Party Integrations

1. **Supabase**: Database, Auth, Storage (for attachments), Real-time (optional)
2. **Stripe**: Payment processing for direct bookings
3. **Resend / SendGrid**: Transactional emails
4. **Vercel**: Hosting, serverless functions, subdomain routing

---

## Development Phases

### Phase 1: Foundation (MVP)
- Multi-tenant setup with subdomain routing
- Authentication (Super Admin, Master Admin, Staff)
- Company settings and branding
- Programs CRUD + availability management
- Basic booking management (add, edit, delete, list, filter)
- Hotels/Pickup locations management

### Phase 2: Agents & Pricing
- Agents CRUD
- Agent pricing matrix
- Booking source tracking
- "Collect Money" tracking

### Phase 3: Operations
- Drivers management
- Driver auto-assignment
- Driver portal (external access)
- Pickup list PDF generation
- Boats management
- Boat auto-assignment
- Boat manifest PDF

### Phase 4: Billing & Communication
- Invoice generation
- Invoice PDF
- Invoice email sending
- Pickup time email notification
- Email templates setup

### Phase 5: Public Features
- Public availability page (/slot)
- Direct booking page (/direct)
- Stripe integration
- Payment confirmation flow
- Customer confirmation emails

### Phase 6: Polish
- Reports dashboard
- Export functionality
- Staff permission fine-tuning
- Mobile responsiveness
- Performance optimization

---

## UI/UX Notes

- Clean, minimal interface (not cluttered)
- Primary navigation: Sidebar with icons + labels
- Mobile-friendly but desktop-first (operators work from computers mostly)
- Tables should be responsive with horizontal scroll on mobile
- Use modals for quick actions (add booking, edit)
- Use slide-out panels for detailed views
- Calendar views for availability and assignments
- Drag-and-drop for manual driver/boat reassignment
- Toast notifications for actions (saved, deleted, sent)
- Double confirmation dialogs for destructive actions

---

## Security Considerations

- All API routes protected by auth middleware
- Company data isolation via RLS
- Driver PINs hashed in database
- Stripe keys stored encrypted
- File uploads scanned and stored in Supabase Storage with signed URLs
- Rate limiting on public endpoints (booking, availability)
- CSRF protection on all forms

---

## Future Considerations (Not in Initial Scope)

- Mobile app for drivers
- Customer booking modification/cancellation
- Integration with OTAs (Viator, GetYourGuide)
- Multi-language support
- Automated pickup time assignment based on hotel location
- SMS notifications (via Twilio)
- Calendar sync (Google Calendar)
- Accounting software integration

---

## Success Metrics

- Booking creation time < 30 seconds
- Page load time < 2 seconds
- Driver portal loads in < 3 seconds on mobile
- Zero data leakage between companies
- 99.9% uptime

---

*Document Version: 1.0*
*Last Updated: November 2025*
*Author: John (Platform Owner)*
