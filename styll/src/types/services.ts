import type { Database } from './database'

export type Service = Database['public']['Tables']['services']['Row']
export type StaffService = Database['public']['Tables']['staff_services']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInventory = Database['public']['Tables']['product_inventory']['Row']

export interface ServiceWithStaff extends Service {
  staff?: Array<{
    id: string
    profile?: { full_name: string; avatar_url: string | null }
  }>
}

export interface ProductWithInventory extends Product {
  inventory?: ProductInventory | null
}

export interface NewService {
  name: string
  description?: string
  price: number
  duration_minutes: number
  category?: string
  display_order?: number
}

export interface NewProduct {
  name: string
  brand?: string
  price_sell: number
  price_cost?: number
  sku?: string
  category?: string
}
