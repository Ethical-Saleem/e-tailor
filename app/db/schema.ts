// app/db/schema.ts
// ─────────────────────────────────────────────────────────────────────────────
// Local IndexedDB database via Dexie.js
// This is the offline-first source of truth for ALL data.
// Supabase is purely a backup/sync target.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table } from 'dexie'
import type {
  Shop,
  Customer,
  MeasurementProfile,
  Order,
  OrderEvent,
  Material,
  MaterialPriceEntry,
  Payment,
  SyncRecord,
} from '~/types/models'

// ── Sync meta (last synced timestamps per table) ──────────────────────────────
interface SyncMeta {
  key: string          // table name
  lastSyncedAt: string // ISO timestamp
  lastSyncedVersion: number
}

// ── App settings (local only) ─────────────────────────────────────────────────
interface AppSetting {
  key: string
  value: unknown
}

// ── Database class ────────────────────────────────────────────────────────────
class eTailorDatabase extends Dexie {
  // Tables
  shops!: Table<Shop, string>
  customers!: Table<Customer, string>
  measurementProfiles!: Table<MeasurementProfile, string>
  orders!: Table<Order, string>
  orderEvents!: Table<OrderEvent, string>
  materials!: Table<Material, string>
  materialPriceHistory!: Table<MaterialPriceEntry, string>
  payments!: Table<Payment, string>
  // Sync infrastructure
  syncQueue!: Table<SyncRecord, number>
  syncMeta!: Table<SyncMeta, string>
  appSettings!: Table<AppSetting, string>

  constructor() {
    super('eTailor')
    this._defineSchema()
  }

  private _defineSchema() {
    // ── Version 1 ── Initial schema ──────────────────────────────────────────
    this.version(1).stores({
      // shops: indexed by id and ownerId
      shops: 'id, ownerId',

      // customers: compound + individual indexes for flexible querying
      customers: [
        'id',
        'shopId',
        'name',
        'phone',
        'updatedAt',
        'isDeleted',
        '[shopId+isDeleted]',
        '[shopId+updatedAt]',
        '_syncStatus',
      ].join(', '),

      // measurementProfiles
      measurementProfiles: [
        'id',
        'shopId',
        'customerId',
        'category',
        'isTemplate',
        'isDeleted',
        '[shopId+customerId]',
        '[shopId+isTemplate]',
        'updatedAt',
      ].join(', '),

      // orders: rich indexing for kanban / list / calendar views
      orders: [
        'id',
        'shopId',
        'customerId',
        'orderNumber',
        'status',
        'priority',
        'dueDate',
        'paymentStatus',
        'isDeleted',
        '[shopId+status]',
        '[shopId+isDeleted]',
        '[shopId+dueDate]',
        '[customerId+status]',
        'updatedAt',
        '_syncStatus',
      ].join(', '),

      // orderEvents: append-only log
      orderEvents: [
        'id',
        'orderId',
        'shopId',
        'eventType',
        'createdAt',
        '[orderId+createdAt]',
      ].join(', '),

      // materials
      materials: [
        'id',
        'shopId',
        'name',
        'category',
        'isDeleted',
        '[shopId+category]',
        '[shopId+isDeleted]',
        'updatedAt',
        '_syncStatus',
      ].join(', '),

      // materialPriceHistory: time-series
      materialPriceHistory: [
        'id',
        'materialId',
        'shopId',
        'purchaseDate',
        '[materialId+purchaseDate]',
      ].join(', '),

      // payments
      payments: [
        'id',
        'shopId',
        'orderId',
        'createdAt',
        '[shopId+createdAt]',
        '[orderId+createdAt]',
        '_syncStatus',
      ].join(', '),

      // sync queue: fifo with status
      syncQueue: [
        '++id',
        'tableName',
        'recordId',
        'operation',
        'status',
        'createdAt',
        '[status+createdAt]',
      ].join(', '),

      // sync meta: one row per table
      syncMeta: 'key',

      // app settings: key-value
      appSettings: 'key',
    })

    // Future migrations go here:
    // this.version(2).stores({ ... }).upgrade(tx => { ... })
  }
}

const BOOLEAN_FIELDS = ['isTemplate', 'isDeleted'] as const

export function coerceBoolsForIndexedDB<T extends object>(record: T): T {
  const result = { ...record } as Record<string, unknown>
  for (const field of BOOLEAN_FIELDS) {
    if (field in result) {
      result[field] = result[field] ? 1 : 0
    }
  }
  return result as T
}

export function coerceBoolsFromIndexedDB<T extends object>(record: T): T {
  const result = { ...record } as Record<string, unknown>
  for (const field of BOOLEAN_FIELDS) {
    if (field in result) {
      result[field] = result[field] === 1 || result[field] === true
    }
  }
  return result as T
}

// ── Singleton instance ────────────────────────────────────────────────────────
// Exported and used via useDb() composable (client-only)
let _db: eTailorDatabase | null = null

export function getDb(): eTailorDatabase {
  if (!_db) {
    _db = new eTailorDatabase()
  }
  return _db
}

// ── Helper: generate UUID ─────────────────────────────────────────────────────
export function generateId(): string {
  return crypto.randomUUID()
}

// ── Helper: now as ISO string ─────────────────────────────────────────────────
export function nowISO(): string {
  return new Date().toISOString()
}

// ── Helper: convert Supabase snake_case row to camelCase model ────────────────
export function toCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camel] = val
  }
  return result as T
}

// ── Helper: convert camelCase model to Supabase snake_case ───────────────────
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    // Skip internal Dexie-only fields
    if (key.startsWith('_')) continue
    const snake = key.replace(/([A-Z])/g, c => `_${c.toLowerCase()}`)
    result[snake] = val
  }
  return result
}

export type { eTailorDatabase }
