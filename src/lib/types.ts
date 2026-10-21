export type BusinessCategory =
  | 'retail'
  | 'food_beverage'
  | 'services'
  | 'technology'
  | 'healthcare'
  | 'education'
  | 'manufacturing'
  | 'real_estate'
  | 'finance'
  | 'other'

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string
  category: BusinessCategory
  logo_url: string | null
  cover_url: string | null
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface BusinessPhoto {
  id: string
  business_id: string
  url: string
  caption: string | null
  created_at: string
}

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  business_id: string
  type: TransactionType
  amount: number
  currency: string
  description: string
  category: string
  date: string
  receipt_url: string | null
  created_at: string
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
  photoCount: number
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number
  quantity: number
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

export interface OrderItem {
  id?: string
  order_id?: string
  product_id: string | null
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id: string
  business_id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string
  customer_address: string | null
  total_amount: number
  status: OrderStatus
  notes: string | null
  created_at: string
  items?: OrderItem[]
  order_items?: OrderItem[]
}

