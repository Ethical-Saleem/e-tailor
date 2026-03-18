// app/types/models.ts
// ─────────────────────────────────────────────────────────────────────────────
// All domain models. These are the shapes used throughout the app (Dexie + UI).
// The Supabase tables mirror these exactly (snake_case column names).
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared ───────────────────────────────────────────────────────────────────

export type UUID = string
export type ISODate = string          // "YYYY-MM-DD"
export type ISOTimestamp = string     // "YYYY-MM-DDTHH:mm:ssZ"

export interface BaseRecord {
  id: UUID
  shopId: UUID
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
  isDeleted: boolean
  // Sync metadata (Dexie-only, not sent to Supabase)
  _syncStatus?: 'synced' | 'pending' | 'failed'
  _localVersion?: number
}

// ── Shop ─────────────────────────────────────────────────────────────────────

export interface Shop {
  id: UUID
  name: string
  ownerId: UUID
  phone?: string
  address?: string
  currency: string               // ISO 4217, e.g. "NGN"
  currencySymbol: string         // e.g. "₦"
  logoUrl?: string
  settings: ShopSettings
  createdAt: ISOTimestamp
  updatedAt: ISOTimestamp
}

export interface ShopSettings {
  orderNumberPrefix: string      // e.g. "ORD"
  orderNumberFormat: 'YYYY-NNN' | 'NNN' | 'YYYY-MM-NNN'
  defaultDepositPercent: number  // 0–100
  measurementUnit: 'inches' | 'cm' | 'both'
  workingDays: number[]          // 0=Sun ... 6=Sat
  whatsappEnabled: boolean
  whatsappNumber?: string
  taxRate: number                // 0–100
  invoiceFooter?: string
}

// ── Customer ─────────────────────────────────────────────────────────────────

export interface Customer extends BaseRecord {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  avatarUrl?: string
  tags: CustomerTag[]
  // Computed / denormalised for list views (updated on order save)
  totalOrders: number
  totalSpend: number
  lastOrderDate?: ISODate
  outstandingBalance: number
}

export type CustomerTag =
  | 'vip'
  | 'wedding'
  | 'corporate'
  | 'regular'
  | 'new'
  | string  // allow custom tags

// ── Measurement Profile ───────────────────────────────────────────────────────

export interface MeasurementProfile extends BaseRecord {
  customerId?: UUID
  label: string                  // "Wedding Gown - Nov 2024"
  category: GarmentCategory
  measurements: MeasurementMap   // flexible key → value
  unit: 'inches' | 'cm'
  notes?: string
  isTemplate: boolean            // shop-level reusable template
  designImages: string[]         // uploaded image URLs
  takenBy?: string               // staff name
  takenAt?: ISODate
}

// Measurement values are always stored as numbers (convert display unit in UI)
export type MeasurementMap = Record<string, number>

export type GarmentCategory =
  | 'shirt'
  | 'trouser'
  | 'suit'
  | 'dress'
  | 'gown'
  | 'skirt'
  | 'blouse'
  | 'jacket'
  | 'abaya'
  | 'ankara'
  | 'asoebi'
  | 'agbada'
  | 'custom'

// Standard measurement field sets per category
export const MEASUREMENT_FIELDS: Record<GarmentCategory, string[]> = {
  shirt:    ['chest', 'waist', 'shoulder', 'sleeve', 'length', 'neck', 'cuff'],
  trouser:  ['waist', 'hip', 'thigh', 'knee', 'calf', 'inseam', 'length', 'rise'],
  suit:     ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'trouser_waist', 'inseam'],
  dress:    ['bust', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'back_length'],
  gown:     ['bust', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'train', 'back_length'],
  skirt:    ['waist', 'hip', 'length'],
  blouse:   ['bust', 'waist', 'shoulder', 'sleeve', 'length'],
  jacket:   ['chest', 'waist', 'shoulder', 'sleeve', 'length'],
  abaya:    ['bust', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'neck'],
  ankara:   ['bust', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'back_length'],
  asoebi:   ['bust', 'waist', 'hip', 'shoulder', 'sleeve', 'length'],
  agbada:   ['chest', 'waist', 'shoulder', 'sleeve', 'length', 'trouser_waist', 'inseam'],
  custom:   [],
}

// ── Order ─────────────────────────────────────────────────────────────────────

export interface Order extends BaseRecord {
  customerId: UUID
  customerName: string           // denormalised for list views
  customerPhone?: string
  orderNumber: string            // e.g. "ORD-2024-0042"
  status: OrderStatus
  priority: OrderPriority
  dueDate?: ISODate
  deliveryDate?: ISODate
  items: OrderItem[]
  measurementProfileId?: UUID
  customMeasurements?: MeasurementMap   // overrides per order
  measurementCategory?: GarmentCategory
  materialUsage: MaterialUsageEntry[]
  styleNotes?: string
  designImages: string[]
  internalNotes?: string
  // Pricing
  subtotal: number
  discount: number
  discountType: 'fixed' | 'percent'
  tax: number
  total: number
  depositAmount: number
  amountPaid: number
  paymentStatus: PaymentStatus
}

export type OrderStatus =
  | 'pending'
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface OrderItem {
  id: string                     // local UUID
  name: string                   // "Wedding Gown"
  category: GarmentCategory
  quantity: number
  unitPrice: number
  notes?: string
}

export interface MaterialUsageEntry {
  materialId: UUID
  materialName: string
  quantity: number
  unit: string
  costAtTime: number
}

// ── Order Event (timeline) ────────────────────────────────────────────────────

export interface OrderEvent {
  id: UUID
  orderId: UUID
  shopId: UUID
  eventType: OrderEventType
  oldValue?: string
  newValue?: string
  note?: string
  createdBy?: string             // user name
  createdAt: ISOTimestamp
}

export type OrderEventType =
  | 'created'
  | 'status_changed'
  | 'payment_received'
  | 'note_added'
  | 'measurement_updated'
  | 'design_uploaded'
  | 'due_date_changed'
  | 'priority_changed'

// ── Material ──────────────────────────────────────────────────────────────────

export interface Material extends BaseRecord {
  name: string
  category: MaterialCategory
  unit: MaterialUnit
  sku?: string
  color?: string
  description?: string
  imageUrl?: string
  currentStock: number
  minimumStock: number           // low-stock threshold
  // Computed from price history
  currentUnitCost: number
  averageUnitCost: number
}

export type MaterialCategory =
  | 'fabric'
  | 'lace'
  | 'thread'
  | 'lining'
  | 'button'
  | 'zipper'
  | 'trim'
  | 'interlining'
  | 'tool'
  | 'other'

export type MaterialUnit =
  | 'yard'
  | 'meter'
  | 'piece'
  | 'roll'
  | 'kg'
  | 'spool'
  | 'pack'
  | 'set'

// ── Material Price History ────────────────────────────────────────────────────

export interface MaterialPriceEntry {
  id: UUID
  materialId: UUID
  shopId: UUID
  unitCost: number
  quantityPurchased: number
  totalCost: number
  supplier?: string
  purchaseDate: ISODate
  notes?: string
  receiptUrl?: string
  createdAt: ISOTimestamp
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface Payment {
  id: UUID
  shopId: UUID
  orderId: UUID
  amount: number
  method: PaymentMethod
  reference?: string
  notes?: string
  createdAt: ISOTimestamp
  // Sync
  _syncStatus?: 'synced' | 'pending' | 'failed'
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other'

// ── Sync Queue ────────────────────────────────────────────────────────────────

export interface SyncRecord {
  id?: number                    // Dexie auto-increment
  tableName: string
  recordId: UUID
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: Record<string, unknown>
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: ISOTimestamp
}

// ── Dashboard / Reports ───────────────────────────────────────────────────────

export interface DashboardStats {
  revenue: {
    thisMonth: number
    lastMonth: number
    changePercent: number
    trend: Array<{ label: string; value: number }>
  }
  orders: {
    active: number
    dueThisWeek: number
    overdue: number
    byStatus: Record<OrderStatus, number>
  }
  customers: {
    total: number
    newThisMonth: number
  }
  payments: {
    outstanding: number
    collectedThisMonth: number
  }
  materials: {
    lowStockCount: number
    inventoryValue: number
  }
  topCustomers: Array<{
    id: UUID
    name: string
    totalSpend: number
    orderCount: number
  }>
}

// ── Form schemas (used with Zod) ──────────────────────────────────────────────
// (Zod schemas are in their respective composables/pages — types here only)

export interface CustomerForm {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  tags: CustomerTag[]
}

export interface OrderForm {
  customerId: UUID
  items: Omit<OrderItem, 'id'>[]
  measurementProfileId?: UUID
  customMeasurements?: MeasurementMap
  measurementCategory?: GarmentCategory
  priority: OrderPriority
  dueDate?: ISODate
  depositAmount: number
  discount: number
  discountType: 'fixed' | 'percent'
  styleNotes?: string
}

export interface MaterialForm {
  name: string
  category: MaterialCategory
  unit: MaterialUnit
  sku?: string
  color?: string
  description?: string
  currentStock: number
  minimumStock: number
}

export interface PurchaseForm {
  materialId: UUID
  unitCost: number
  quantityPurchased: number
  supplier?: string
  purchaseDate: ISODate
  notes?: string
}
