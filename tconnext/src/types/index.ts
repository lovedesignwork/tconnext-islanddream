export * from './database'

// Auth context types
export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'master_admin' | 'staff'
  company_id: string | null
  company_slug?: string
  company_name?: string
  permissions: import('./database').UserPermissions
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

// Filter types for bookings
export interface BookingFilters {
  date_from?: string
  date_to?: string
  booking_date_from?: string
  booking_date_to?: string
  status?: string[]
  program_id?: string[]
  agent_id?: string[]
  search?: string
}

// Form types
export interface BookingFormData {
  activity_date: string
  program_id: string
  agent_id?: string
  agent_staff_id?: string
  customer_name: string
  customer_email?: string
  customer_whatsapp?: string
  adults: number
  children: number
  infants: number
  hotel_id?: string
  custom_pickup_location?: string
  room_number?: string
  pickup_time?: string
  notes?: string
  voucher_number?: string
  collect_money: number
  internal_remarks?: string
  status: import('./database').BookingStatus
  payment_type: import('./database').PaymentType
}

export interface AgentStaffFormData {
  agent_id: string
  full_name: string
  nickname?: string
  phone?: string
  status: 'active' | 'suspended'
}

export interface ProgramFormData {
  name: string
  nickname?: string
  description?: string
  duration?: string
  base_price: number
  pricing_type: import('./database').PricingType
  selling_price: number
  adult_selling_price: number
  child_selling_price: number
  status: import('./database').EntityStatus
}

export interface HotelFormData {
  name: string
  area: string
  address?: string
  pickup_notes?: string
}

export interface AgentFormData {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  whatsapp?: string
  status: import('./database').EntityStatus
  notes?: string
}

export interface DriverFormData {
  name: string
  phone?: string
  whatsapp?: string
  vehicle_info?: string
  status: import('./database').EntityStatus
}

export interface BoatFormData {
  name: string
  capacity: number
  captain_name?: string
  phone?: string
  status: import('./database').EntityStatus
  notes?: string
}

