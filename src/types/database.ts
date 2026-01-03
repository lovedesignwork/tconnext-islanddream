export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'master_admin' | 'staff'
export type CompanyRegion = 'Phuket' | 'Phang Nga' | 'Both'
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'void'
export type PaymentType = 'regular' | 'foc' | 'insp'
export type EntityStatus = 'active' | 'suspended' | 'deleted'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type AgentType = 'partner' | 'direct'
export type PricingType = 'single' | 'adult_child'

export interface CompanySettings {
  // Root-level logo URLs (saved by upload-logo API)
  logo_url?: string
  logo_url_dark?: string
  
  branding?: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
  }
  payment?: {
    bank_name?: string
    account_name?: string
    account_number?: string
    payment_instructions?: string
  }
  stripe?: {
    public_key?: string
    secret_key?: string
    webhook_secret?: string
    test_mode?: boolean
  }
  email?: {
    from_name?: string
    reply_to?: string
    footer_text?: string
  }
  pickup?: {
    contact_info?: string
    pickup_email_template?: string
    come_direct_email_template?: string
  }
  availability?: {
    days_to_display?: number
    contact_phone?: string
    contact_email?: string
    contact_whatsapp?: string
  }
  invoice?: {
    logo_url?: string
    payment_footer?: string
    tax_percentage?: number
  }
  // Direct booking page settings
  booking?: {
    thank_you_message?: string
    failed_payment_message?: string
    contact_for_manual_booking?: string
    page_header_text?: string
    page_footer_text?: string
    allow_cash_on_tour?: boolean
    stripe_payments_enabled?: boolean
    cash_booking_message?: string
  }
  // OP Report auto email settings
  op_report_auto_email?: {
    send_time?: string  // HH:MM format (e.g., "23:30" or "00:30")
    recipient_emails?: string[]  // Array of email addresses
  }
}

// Page lock settings - which pages require PIN protection
export interface PageLockSettings {
  // Main navigation pages
  dashboard?: boolean
  slots?: boolean
  pickup?: boolean
  set_boat?: boolean
  op_report?: boolean
  invoices?: boolean
  finance?: boolean
  reports?: boolean
  // Setup pages
  programs?: boolean
  agents?: boolean
  drivers?: boolean
  guides?: boolean
  restaurants?: boolean
  boats?: boolean
  hotels?: boolean
}

// Granular permissions for team members
export interface TeamMemberPermissions {
  dashboard?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  slots?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  pickup?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  set_boat?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  op_report?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  invoices?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  finance?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  reports?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  programs?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  agents?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  drivers?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  guides?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  restaurants?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  boats?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  hotels?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
  settings?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
}

export type TeamMemberStatus = 'active' | 'suspended'

export interface ComeDirectLocation {
  name?: string
  address?: string
  google_maps_url?: string
  contact_info?: string
}

export interface UserPermissions {
  dashboard?: { view?: boolean; manage?: boolean }
  programs?: { view?: boolean; manage?: boolean; setup?: boolean }
  agents?: { view?: boolean; manage?: boolean; setup?: boolean }
  drivers?: { view?: boolean; manage?: boolean; setup?: boolean }
  boats?: { view?: boolean; manage?: boolean; setup?: boolean }
  invoices?: { view?: boolean; manage?: boolean }
  finance?: { view?: boolean; manage?: boolean }
  reports?: { view?: boolean }
}

export type SubscriptionPaymentMethod = 'stripe' | 'bank_transfer' | 'cash' | 'other'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          initials: string
          settings: CompanySettings
          subscription_status: string
          region: CompanyRegion
          pricing_pin: string | null
          pricing_pin_enabled: boolean
          tax_id: string | null
          address: string | null
          phone: string | null
          page_locks: PageLockSettings
          // Staff management fields
          company_code: number
          staff_sequence: number
          // Stripe Connect fields
          stripe_account_id: string | null
          stripe_connected: boolean
          stripe_onboarding_complete: boolean
          stripe_connected_at: string | null
          // Owner and billing fields
          owner_name: string | null
          owner_email: string | null
          owner_phone: string | null
          monthly_price: number
          trial_ends_at: string | null
          subscription_started_at: string | null
          next_billing_date: string | null
          billing_notes: string | null
          suspended_at: string | null
          suspended_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          initials?: string
          settings?: CompanySettings
          subscription_status?: string
          region?: CompanyRegion
          pricing_pin?: string | null
          pricing_pin_enabled?: boolean
          tax_id?: string | null
          address?: string | null
          phone?: string | null
          page_locks?: PageLockSettings
          company_code?: number
          staff_sequence?: number
          stripe_account_id?: string | null
          stripe_connected?: boolean
          stripe_onboarding_complete?: boolean
          stripe_connected_at?: string | null
          owner_name?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          monthly_price?: number
          trial_ends_at?: string | null
          subscription_started_at?: string | null
          next_billing_date?: string | null
          billing_notes?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          initials?: string
          settings?: CompanySettings
          subscription_status?: string
          region?: CompanyRegion
          pricing_pin?: string | null
          pricing_pin_enabled?: boolean
          tax_id?: string | null
          address?: string | null
          phone?: string | null
          page_locks?: PageLockSettings
          company_code?: number
          staff_sequence?: number
          stripe_account_id?: string | null
          stripe_connected?: boolean
          stripe_onboarding_complete?: boolean
          stripe_connected_at?: string | null
          owner_name?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          monthly_price?: number
          trial_ends_at?: string | null
          subscription_started_at?: string | null
          next_billing_date?: string | null
          billing_notes?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          auth_id: string
          company_id: string | null
          role: UserRole
          permissions: UserPermissions
          name: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          company_id?: string | null
          role: UserRole
          permissions?: UserPermissions
          name: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          company_id?: string | null
          role?: UserRole
          permissions?: UserPermissions
          name?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          company_id: string
          name: string
          nickname: string | null
          description: string | null
          duration: string | null
          base_price: number
          default_slots: number
          booking_cutoff_time: string | null
          color: string | null
          pricing_type: PricingType
          selling_price: number
          adult_selling_price: number
          child_selling_price: number
          status: EntityStatus
          // Direct booking fields
          slug: string | null
          thumbnail_url: string | null
          direct_booking_enabled: boolean
          short_description: string | null
          brochure_images: string[] | null
          itinerary_html: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          nickname?: string | null
          description?: string | null
          duration?: string | null
          base_price?: number
          default_slots?: number
          booking_cutoff_time?: string | null
          color?: string | null
          pricing_type?: PricingType
          selling_price?: number
          adult_selling_price?: number
          child_selling_price?: number
          status?: EntityStatus
          slug?: string | null
          thumbnail_url?: string | null
          direct_booking_enabled?: boolean
          short_description?: string | null
          brochure_images?: string[] | null
          itinerary_html?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          nickname?: string | null
          description?: string | null
          duration?: string | null
          base_price?: number
          default_slots?: number
          booking_cutoff_time?: string | null
          color?: string | null
          pricing_type?: PricingType
          selling_price?: number
          adult_selling_price?: number
          child_selling_price?: number
          status?: EntityStatus
          slug?: string | null
          thumbnail_url?: string | null
          direct_booking_enabled?: boolean
          short_description?: string | null
          brochure_images?: string[] | null
          itinerary_html?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      program_availability: {
        Row: {
          id: string
          program_id: string
          date: string
          is_open: boolean
          total_slots: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          date: string
          is_open?: boolean
          total_slots?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          date?: string
          is_open?: boolean
          total_slots?: number
          created_at?: string
          updated_at?: string
        }
      }
      hotels: {
        Row: {
          id: string
          company_id: string
          name: string
          area: string
          address: string | null
          pickup_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          area: string
          address?: string | null
          pickup_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          area?: string
          address?: string | null
          pickup_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          company_id: string
          name: string
          unique_code: string | null
          contact_person: string | null
          email: string | null
          phone: string | null
          whatsapp: string | null
          status: EntityStatus
          agent_type: AgentType
          notes: string | null
          tax_id: string | null
          address: string | null
          tax_applied: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          unique_code?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          status?: EntityStatus
          agent_type?: AgentType
          notes?: string | null
          tax_id?: string | null
          address?: string | null
          tax_applied?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          unique_code?: string | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          status?: EntityStatus
          agent_type?: AgentType
          notes?: string | null
          tax_id?: string | null
          address?: string | null
          tax_applied?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      agent_pricing: {
        Row: {
          id: string
          agent_id: string
          program_id: string
          selling_price: number
          agent_price: number
          adult_agent_price: number | null
          child_agent_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          program_id: string
          selling_price: number
          agent_price: number
          adult_agent_price?: number | null
          child_agent_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          program_id?: string
          selling_price?: number
          agent_price?: number
          adult_agent_price?: number | null
          child_agent_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          company_id: string
          name: string
          nickname: string | null
          phone: string | null
          whatsapp: string | null
          vehicle_info: string | null
          car_capacity: number | null
          status: EntityStatus
          access_pin: string
          unique_link_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          nickname?: string | null
          phone?: string | null
          whatsapp?: string | null
          vehicle_info?: string | null
          car_capacity?: number | null
          status?: EntityStatus
          access_pin: string
          unique_link_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          nickname?: string | null
          phone?: string | null
          whatsapp?: string | null
          vehicle_info?: string | null
          car_capacity?: number | null
          status?: EntityStatus
          access_pin?: string
          unique_link_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      boats: {
        Row: {
          id: string
          company_id: string
          name: string
          capacity: number
          captain_name: string | null
          phone: string | null
          status: EntityStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          capacity: number
          captain_name?: string | null
          phone?: string | null
          status?: EntityStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          capacity?: number
          captain_name?: string | null
          phone?: string | null
          status?: EntityStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_staff: {
        Row: {
          id: string
          agent_id: string
          full_name: string
          nickname: string | null
          phone: string | null
          status: 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          full_name: string
          nickname?: string | null
          phone?: string | null
          status?: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          full_name?: string
          nickname?: string | null
          phone?: string | null
          status?: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          company_id: string
          booking_number: string
          activity_date: string
          agent_id: string | null
          agent_staff_id: string | null
          program_id: string
          customer_name: string
          customer_email: string | null
          customer_whatsapp: string | null
          adults: number
          children: number
          infants: number
          hotel_id: string | null
          room_number: string | null
          pickup_time: string | null
          notes: string | null
          voucher_number: string | null
          voucher_image_url: string | null
          custom_pickup_location: string | null
          collect_money: number
          internal_remarks: string | null
          status: BookingStatus
          payment_type: PaymentType
          is_direct_booking: boolean
          booking_source: string | null
          stripe_payment_id: string | null
          driver_id: string | null
          boat_id: string | null
          guide_id: string | null
          restaurant_id: string | null
          pickup_email_sent: boolean
          deleted_at: string | null
          void_reason: string | null
          is_come_direct: boolean
          invoice_id: string | null
          last_modified_by: string | null
          last_modified_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          booking_number: string
          activity_date: string
          agent_id?: string | null
          agent_staff_id?: string | null
          program_id: string
          customer_name: string
          customer_email?: string | null
          customer_whatsapp?: string | null
          adults?: number
          children?: number
          infants?: number
          hotel_id?: string | null
          room_number?: string | null
          pickup_time?: string | null
          notes?: string | null
          voucher_number?: string | null
          voucher_image_url?: string | null
          custom_pickup_location?: string | null
          collect_money?: number
          internal_remarks?: string | null
          status?: BookingStatus
          payment_type?: PaymentType
          is_direct_booking?: boolean
          booking_source?: string | null
          stripe_payment_id?: string | null
          driver_id?: string | null
          boat_id?: string | null
          guide_id?: string | null
          restaurant_id?: string | null
          pickup_email_sent?: boolean
          deleted_at?: string | null
          void_reason?: string | null
          is_come_direct?: boolean
          invoice_id?: string | null
          last_modified_by?: string | null
          last_modified_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          booking_number?: string
          activity_date?: string
          agent_id?: string | null
          agent_staff_id?: string | null
          program_id?: string
          customer_name?: string
          customer_email?: string | null
          customer_whatsapp?: string | null
          adults?: number
          children?: number
          infants?: number
          hotel_id?: string | null
          room_number?: string | null
          pickup_time?: string | null
          notes?: string | null
          voucher_number?: string | null
          voucher_image_url?: string | null
          custom_pickup_location?: string | null
          collect_money?: number
          internal_remarks?: string | null
          status?: BookingStatus
          payment_type?: PaymentType
          is_direct_booking?: boolean
          booking_source?: string | null
          stripe_payment_id?: string | null
          driver_id?: string | null
          boat_id?: string | null
          guide_id?: string | null
          restaurant_id?: string | null
          pickup_email_sent?: boolean
          deleted_at?: string | null
          void_reason?: string | null
          is_come_direct?: boolean
          invoice_id?: string | null
          last_modified_by?: string | null
          last_modified_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      booking_attachments: {
        Row: {
          id: string
          booking_id: string
          file_url: string
          file_name: string
          file_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          file_url: string
          file_name: string
          file_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string
          invoice_number: string
          agent_id: string
          date_from: string
          date_to: string
          total_amount: number
          status: InvoiceStatus
          notes: string | null
          internal_notes: string | null
          payment_type_id: string | null
          sent_at: string | null
          paid_at: string | null
          last_modified_by: string | null
          last_modified_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_number: string
          agent_id: string
          date_from: string
          date_to: string
          total_amount?: number
          status?: InvoiceStatus
          notes?: string | null
          internal_notes?: string | null
          payment_type_id?: string | null
          sent_at?: string | null
          paid_at?: string | null
          last_modified_by?: string | null
          last_modified_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_number?: string
          agent_id?: string
          date_from?: string
          date_to?: string
          total_amount?: number
          status?: InvoiceStatus
          notes?: string | null
          internal_notes?: string | null
          payment_type_id?: string | null
          sent_at?: string | null
          paid_at?: string | null
          last_modified_by?: string | null
          last_modified_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_payment_types: {
        Row: {
          id: string
          company_id: string
          name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          booking_id: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          booking_id: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          booking_id?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      reference_hotels: {
        Row: {
          id: string
          name: string
          area: string
          province: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          area: string
          province?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          area?: string
          province?: string
          created_at?: string
        }
      }
      driver_pickup_locks: {
        Row: {
          id: string
          company_id: string
          driver_id: string
          activity_date: string
          is_locked: boolean
          locked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          driver_id: string
          activity_date: string
          is_locked?: boolean
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          driver_id?: string
          activity_date?: string
          is_locked?: boolean
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guides: {
        Row: {
          id: string
          company_id: string
          name: string
          nickname: string | null
          phone: string | null
          whatsapp: string | null
          languages: string[]
          status: EntityStatus
          notes: string | null
          unique_link_id: string | null
          access_pin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          nickname?: string | null
          phone?: string | null
          whatsapp?: string | null
          languages?: string[]
          status?: EntityStatus
          notes?: string | null
          unique_link_id?: string | null
          access_pin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          nickname?: string | null
          phone?: string | null
          whatsapp?: string | null
          languages?: string[]
          status?: EntityStatus
          notes?: string | null
          unique_link_id?: string | null
          access_pin?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          company_id: string
          name: string
          location: string | null
          capacity: number
          phone: string | null
          status: EntityStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          location?: string | null
          capacity?: number
          phone?: string | null
          status?: EntityStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          location?: string | null
          capacity?: number
          phone?: string | null
          status?: EntityStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      boat_assignment_locks: {
        Row: {
          id: string
          company_id: string
          boat_id: string
          activity_date: string
          program_id: string | null
          guide_id: string | null
          restaurant_id: string | null
          is_locked: boolean
          locked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          boat_id: string
          activity_date: string
          program_id?: string | null
          guide_id?: string | null
          restaurant_id?: string | null
          is_locked?: boolean
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          boat_id?: string
          activity_date?: string
          program_id?: string | null
          guide_id?: string | null
          restaurant_id?: string | null
          is_locked?: boolean
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_team_members: {
        Row: {
          id: string
          company_id: string
          auth_id: string | null
          name: string
          email: string | null
          staff_code: string | null
          username: string | null
          status: TeamMemberStatus
          permissions: TeamMemberPermissions
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          auth_id?: string | null
          name: string
          email?: string | null
          staff_code?: string | null
          username?: string | null
          status?: TeamMemberStatus
          permissions?: TeamMemberPermissions
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          auth_id?: string | null
          name?: string
          email?: string | null
          staff_code?: string | null
          username?: string | null
          status?: TeamMemberStatus
          permissions?: TeamMemberPermissions
          created_at?: string
          updated_at?: string
        }
      }
      subscription_payments: {
        Row: {
          id: string
          company_id: string
          amount: number
          payment_date: string
          payment_method: SubscriptionPaymentMethod
          stripe_payment_id: string | null
          period_start: string
          period_end: string
          notes: string | null
          recorded_by: string | null
          recorded_by_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          amount: number
          payment_date: string
          payment_method: SubscriptionPaymentMethod
          stripe_payment_id?: string | null
          period_start: string
          period_end: string
          notes?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          amount?: number
          payment_date?: string
          payment_method?: SubscriptionPaymentMethod
          stripe_payment_id?: string | null
          period_start?: string
          period_end?: string
          notes?: string | null
          recorded_by?: string | null
          recorded_by_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_activity_log: {
        Row: {
          id: string
          company_id: string
          action: string
          details: Record<string, unknown>
          performed_by: string | null
          performed_by_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          action: string
          details?: Record<string, unknown>
          performed_by?: string | null
          performed_by_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          action?: string
          details?: Record<string, unknown>
          performed_by?: string | null
          performed_by_name?: string | null
          created_at?: string
        }
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: Record<string, unknown>
          description: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Record<string, unknown>
          description?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Record<string, unknown>
          description?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types for easier usage
export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Program = Database['public']['Tables']['programs']['Row']
export type ProgramAvailability = Database['public']['Tables']['program_availability']['Row']
export type Hotel = Database['public']['Tables']['hotels']['Row']
export type Agent = Database['public']['Tables']['agents']['Row']
export type AgentPricing = Database['public']['Tables']['agent_pricing']['Row']
export type AgentStaff = Database['public']['Tables']['agent_staff']['Row']
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Boat = Database['public']['Tables']['boats']['Row']
export type Guide = Database['public']['Tables']['guides']['Row']
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingAttachment = Database['public']['Tables']['booking_attachments']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row'] & {
  due_date?: string | null;
  due_days?: number | null;
}
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoicePaymentType = Database['public']['Tables']['invoice_payment_types']['Row']
export type ReferenceHotel = Database['public']['Tables']['reference_hotels']['Row']
export type DriverPickupLock = Database['public']['Tables']['driver_pickup_locks']['Row']
export type BoatAssignmentLock = Database['public']['Tables']['boat_assignment_locks']['Row']
export type CompanyTeamMember = Database['public']['Tables']['company_team_members']['Row']
export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']
export type SubscriptionActivityLog = Database['public']['Tables']['subscription_activity_log']['Row']
export type PlatformSetting = Database['public']['Tables']['platform_settings']['Row']

// Extended types with relations
export type BookingWithRelations = Booking & {
  program?: Program
  hotel?: Hotel
  agent?: Agent
  agent_staff?: AgentStaff
  driver?: Driver
  boat?: Boat
  guide?: Guide
  restaurant?: Restaurant
  attachments?: BookingAttachment[]
}

export type AgentWithStaff = Agent & {
  staff?: AgentStaff[]
}

export type InvoiceWithRelations = Invoice & {
  agent?: Agent
  items?: (InvoiceItem & { booking?: Booking })[]
}

