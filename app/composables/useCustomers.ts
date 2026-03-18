// app/composables/useCustomers.ts
// ─────────────────────────────────────────────────────────────────────────────
// All customer operations. Reads from IndexedDB, writes through sync engine.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, computed } from 'vue'
import { z } from 'zod'
import { getDb, generateId, nowISO, coerceBoolsFromIndexedDB } from '~/db/schema'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { useAuthStore } from '~/stores/auth'
import type { Customer, CustomerForm, CustomerTag, MeasurementProfile } from '~/types/models'

// ── Zod validation schema ─────────────────────────────────────────────────────
export const customerSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(120),
  phone:   z.string().max(30).optional().or(z.literal('')),
  email:   z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  notes:   z.string().max(1000).optional(),
  tags:    z.array(z.string()).default([]),
})

// ── Composable ────────────────────────────────────────────────────────────────
export function useCustomers() {
  const auth = useAuthStore()
  const sync = useOfflineSync()
  const db   = getDb()

  const customers  = ref<Customer[]>([])
  const isLoading  = ref(false)
  const searchQuery = ref('')
  const activeTag   = ref<CustomerTag | 'all'>('all')
  const sortBy      = ref<'name' | 'lastOrderDate' | 'totalSpend'>('name')

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = computed(() => {
    let list = customers.value

    // Search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q),
      )
    }

    // Tag filter
    if (activeTag.value !== 'all') {
      list = list.filter(c => c.tags.includes(activeTag.value as CustomerTag))
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy.value === 'name')          return a.name.localeCompare(b.name)
      if (sortBy.value === 'totalSpend')    return b.totalSpend - a.totalSpend
      if (sortBy.value === 'lastOrderDate') {
        return (b.lastOrderDate ?? '') > (a.lastOrderDate ?? '') ? 1 : -1
      }
      return 0
    })
  })

  // ── Load all customers ─────────────────────────────────────────────────────
  async function loadAll(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true
    console.log("Loading custoners...")
    try {
      const rows = await db.customers
        .where('shopId')
        .equals(auth.shopId) // Dexie stores booleans as 0/1 in indexes
        .sortBy('name')

      customers.value = rows.map((r) => coerceBoolsFromIndexedDB(r))
    } catch (err) {
      console.error('[Customers] Load failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  // ── Get single customer ────────────────────────────────────────────────────
  async function getById(id: string): Promise<Customer | undefined> {
    const row = db.customers.get(id)
    return coerceBoolsFromIndexedDB(row)
  }

  // ── Get customer with full data ────────────────────────────────────────────
  async function getWithDetails(id: string) {
    const customerRow = await db.customers.get(id)
    if (!customerRow) return null

    const [profileRows, orderRows] = await Promise.all([
      db.measurementProfiles
        .where('[shopId+customerId]')
        .equals([auth.shopId!, id])
        .filter(p => !p.isDeleted)
        .toArray(),
      db.orders
        .where('[customerId+status]')
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .filter(o => !o.isDeleted)
        .reverse()
        .sortBy('createdAt'),
    ])

    const customer = coerceBoolsFromIndexedDB(customerRow)
    const profiles = profileRows.map((r) => coerceBoolsFromIndexedDB(r))
    const orders = orderRows.map((r) => coerceBoolsFromIndexedDB(r))

    return { customer, profiles, orders }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function create(form: CustomerForm): Promise<Customer> {
    const parsed = customerSchema.parse(form)

    const customer: Customer = {
      id:                generateId(),
      shopId:            auth.shopId!,
      name:              parsed.name,
      phone:             parsed.phone || undefined,
      email:             parsed.email || undefined,
      address:           parsed.address,
      notes:             parsed.notes,
      avatarUrl:         undefined,
      tags:              parsed.tags as CustomerTag[],
      totalOrders:       0,
      totalSpend:        0,
      lastOrderDate:     undefined,
      outstandingBalance: 0,
      isDeleted:         false,
      createdAt:         nowISO(),
      updatedAt:         nowISO(),
    }

    await sync.writeRecord('customers', 'INSERT', customer)
    customers.value = [customer, ...customers.value]
    return customer
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async function update(id: string, form: Partial<CustomerForm>): Promise<Customer> {
    const existing = await db.customers.get(id)
    if (!existing) throw new Error('Customer not found')

    const parsed = customerSchema.partial().parse(form)
    const updated: Customer = {
      ...existing,
      ...parsed,
      updatedAt: nowISO(),
    }

    await sync.writeRecord('customers', 'UPDATE', updated)

    // Update local list
    const idx = customers.value.findIndex(c => c.id === id)
    if (idx !== -1) customers.value[idx] = updated

    return updated
  }

  // ── Soft delete ────────────────────────────────────────────────────────────
  async function remove(id: string): Promise<void> {
    await sync.writeRecord('customers', 'DELETE', { id, shopId: auth.shopId! } as Customer)
    customers.value = customers.value.filter(c => c.id !== id)
  }

  // ── Recalculate customer stats (called after order mutations) ───────────────
  async function recalculateStats(customerId: string): Promise<void> {
    const orders = await db.orders
      .where('[customerId+status]')
      .between([customerId, Dexie.minKey], [customerId, Dexie.maxKey])
      .filter(o => !o.isDeleted && o.status !== 'cancelled')
      .toArray()

    const totalOrders       = orders.length
    const totalSpend        = orders.reduce((s, o) => s + o.total, 0)
    const outstandingBalance = orders.reduce((s, o) => s + (o.total - o.amountPaid), 0)
    const lastOrderDate     = orders
      .map(o => o.createdAt.slice(0, 10))
      .sort()
      .reverse()[0]

    await db.customers.update(customerId, {
      totalOrders,
      totalSpend,
      outstandingBalance,
      lastOrderDate,
      updatedAt: nowISO(),
    })

    // Update in local list
    const idx = customers.value.findIndex(c => c.id === customerId)
    if (idx !== -1) {
      customers.value[idx] = {
        ...customers.value[idx],
        totalOrders,
        totalSpend,
        outstandingBalance,
        lastOrderDate,
      }
    }
  }

  // ── Import from CSV ────────────────────────────────────────────────────────
  async function importFromCSV(rows: Array<Record<string, string>>): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    for (const row of rows) {
      try {
        await create({
          name:  row.name || row.Name,
          phone: row.phone || row.Phone || '',
          email: row.email || row.Email || '',
          tags:  [],
        })
        imported++
      } catch (err) {
        errors.push(`Row ${imported + errors.length + 1}: ${err instanceof Error ? err.message : 'Invalid data'}`)
      }
    }

    return { imported, errors }
  }

  return {
    // State
    customers,
    filtered,
    isLoading,
    searchQuery,
    activeTag,
    sortBy,
    // Actions
    loadAll,
    getById,
    getWithDetails,
    create,
    update,
    remove,
    recalculateStats,
    importFromCSV,
  }
}

import Dexie from 'dexie'
