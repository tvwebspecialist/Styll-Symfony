// ─── Database types (auto-generated from Supabase schema) ────────────────────
export type { Database, Json } from './database.types'
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database.types'

import type { Tables, TablesInsert, TablesUpdate } from './database.types'

// ─── Area 1: Business ─────────────────────────────────────────────────────────
export type Tenant                = Tables<'tenants'>
export type TenantInsert          = TablesInsert<'tenants'>
export type TenantUpdate          = TablesUpdate<'tenants'>

export type Location              = Tables<'locations'>
export type LocationInsert        = TablesInsert<'locations'>

export type SubscriptionPlan      = Tables<'subscription_plans'>
export type TenantSubscription    = Tables<'tenant_subscriptions'>
export type TenantSubscriptionInsert = TablesInsert<'tenant_subscriptions'>

// ─── Area 2: Utenti e Staff ───────────────────────────────────────────────────
export type Profile               = Tables<'profiles'>
export type ProfileInsert         = TablesInsert<'profiles'>
export type ProfileUpdate         = TablesUpdate<'profiles'>

export type StaffMember           = Tables<'staff_members'>
export type StaffMemberInsert     = TablesInsert<'staff_members'>
export type StaffMemberUpdate     = TablesUpdate<'staff_members'>

export type StaffLocation         = Tables<'staff_locations'>

// ─── Area 3: Catalogo ─────────────────────────────────────────────────────────
export type Service               = Tables<'services'>
export type ServiceInsert         = TablesInsert<'services'>
export type ServiceUpdate         = TablesUpdate<'services'>

export type StaffService          = Tables<'staff_services'>

export type Product               = Tables<'products'>
export type ProductInsert         = TablesInsert<'products'>
export type ProductUpdate         = TablesUpdate<'products'>

export type ProductInventory      = Tables<'product_inventory'>
export type ProductInventoryUpdate = TablesUpdate<'product_inventory'>

// ─── Area 4: Appuntamenti ─────────────────────────────────────────────────────
export type WorkingHours          = Tables<'working_hours'>
export type WorkingHoursInsert    = TablesInsert<'working_hours'>

export type WorkingHourOverride   = Tables<'working_hour_overrides'>
export type WorkingHourOverrideInsert = TablesInsert<'working_hour_overrides'>

export type Appointment           = Tables<'appointments'>
export type AppointmentInsert     = TablesInsert<'appointments'>
export type AppointmentUpdate     = TablesUpdate<'appointments'>

export type AppointmentService    = Tables<'appointment_services'>
export type AppointmentServiceInsert = TablesInsert<'appointment_services'>

export type AppointmentProduct    = Tables<'appointment_products'>
export type AppointmentProductInsert = TablesInsert<'appointment_products'>

export type Payment               = Tables<'payments'>
export type PaymentInsert         = TablesInsert<'payments'>

// ─── Area 5: CRM ──────────────────────────────────────────────────────────────
export type Client                = Tables<'clients'>
export type ClientInsert          = TablesInsert<'clients'>
export type ClientUpdate          = TablesUpdate<'clients'>

export type ClientNote            = Tables<'client_notes'>
export type ClientNoteInsert      = TablesInsert<'client_notes'>

// ─── Area 6: Loyalty ──────────────────────────────────────────────────────────
export type LoyaltyConfig         = Tables<'loyalty_configs'>
export type LoyaltyConfigInsert   = TablesInsert<'loyalty_configs'>

export type Reward                = Tables<'rewards'>
export type RewardInsert          = TablesInsert<'rewards'>
export type RewardUpdate          = TablesUpdate<'rewards'>

export type ClientLoyalty         = Tables<'client_loyalty'>
export type ClientLoyaltyUpdate   = TablesUpdate<'client_loyalty'>

export type LoyaltyTransaction    = Tables<'loyalty_transactions'>
export type LoyaltyTransactionInsert = TablesInsert<'loyalty_transactions'>

export type RewardRedemption      = Tables<'reward_redemptions'>
export type RewardRedemptionInsert = TablesInsert<'reward_redemptions'>
