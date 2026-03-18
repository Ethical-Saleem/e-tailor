// app/composables/useOrders.ts
// ─────────────────────────────────────────────────────────────────────────────
// Order lifecycle management: create, update status, payments, timeline events
// ─────────────────────────────────────────────────────────────────────────────

import { ref, computed } from 'vue'
import { z } from 'zod'
import { getDb, generateId, nowISO, coerceBoolsFromIndexedDB } from '~/db/schema'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { useAuthStore } from '~/stores/auth'
import type {
  Order, OrderForm, OrderStatus, OrderPriority, OrderItem,
  OrderEvent, Payment, PaymentMethod, GarmentCategory,
} from '~/types/models'

// ── Zod schemas ───────────────────────────────────────────────────────────────
export const orderItemSchema = z.object({
  name:      z.string().min(1),
  category:  z.string(),
  quantity:  z.number().int().min(1),
  unitPrice: z.number().min(0),
  notes:     z.string().optional(),
})

export const orderFormSchema = z.object({
  customerId:           z.string().uuid(),
  items:                z.array(orderItemSchema).min(1, 'At least one item required'),
  measurementProfileId: z.string().uuid().optional(),
  priority:             z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate:              z.string().optional(),
  depositAmount:        z.number().min(0).default(0),
  discount:             z.number().min(0).default(0),
  discountType:         z.enum(['fixed', 'percent']).default('fixed'),
  styleNotes:           z.string().max(1000).optional(),
})

// ── Order status workflow ─────────────────────────────────────────────────────
export const STATUS_FLOW: OrderStatus[] = [
  'pending', 'cutting', 'sewing', 'finishing', 'ready', 'delivered',
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'Pending',
  cutting:   'Cutting',
  sewing:    'Sewing',
  finishing: 'Finishing',
  ready:     'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useOrders() {
  const auth = useAuthStore()
  const sync = useOfflineSync()
  const db   = getDb()

  const orders     = ref<Order[]>([])
  const isLoading  = ref(false)
  const filterStatus = ref<OrderStatus | 'all'>('all')
  const filterPayment = ref<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const searchQuery = ref('')

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = computed(() => {
    let list = orders.value

    if (filterStatus.value !== 'all') {
      list = list.filter(o => o.status === filterStatus.value)
    }
    if (filterPayment.value !== 'all') {
      list = list.filter(o => o.paymentStatus === filterPayment.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(o =>
        o.customerName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q),
      )
    }

    return list
  })

  // Group by status for kanban view
  const byStatus = computed(() => {
    const result = {} as Record<OrderStatus, Order[]>
    for (const status of [...STATUS_FLOW, 'cancelled' as OrderStatus]) {
      result[status] = filtered.value.filter(o => o.status === status)
    }
    return result
  })

  // Stats
  const stats = computed(() => ({
    total:      orders.value.length,
    active:     orders.value.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
    overdue:    orders.value.filter(o => isOverdue(o)).length,
    dueThisWeek: orders.value.filter(o => isDueThisWeek(o)).length,
    outstanding: orders.value.reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0),
  }))

  // ── Load ───────────────────────────────────────────────────────────────────
  async function loadAll(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true
    try {
      const rows = await db.orders
        .where('shopId')
        .equals(auth.shopId)
        .reverse()
        .sortBy('createdAt')

      console.log("order_rows:", rows)

      const coercedRes = rows.map((r) => coerceBoolsFromIndexedDB(r))
      console.log('Order Coerced:', coercedRes)
      orders.value = coercedRes
    } catch (err) {
      console.error('[Orders] Load failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function getById(id: string): Promise<Order | undefined> {
    const row = db.orders.get(id)
    return coerceBoolsFromIndexedDB(row)
  }

  async function getWithTimeline(id: string) {
    const [order, events] = await Promise.all([
      db.orders.get(id),
      db.orderEvents
        .where('[orderId+createdAt]')
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .reverse()
        .toArray(),
    ])
    return { order, events }
  }

  // ── Generate order number ──────────────────────────────────────────────────
  async function generateOrderNumber(): Promise<string> {
    const settings = auth.shop?.settings
    const prefix   = settings?.orderNumberPrefix ?? 'ORD'
    const format   = settings?.orderNumberFormat ?? 'YYYY-NNN'

    // Count existing orders this year
    const year   = new Date().getFullYear()
    const count  = await db.orders
      .where('shopId')
      .equals(auth.shopId!)
      .count()

    const seq = String(count + 1).padStart(4, '0')

    switch (format) {
      case 'NNN':        return `${prefix}-${seq}`
      case 'YYYY-NNN':   return `${prefix}-${year}-${seq}`
      case 'YYYY-MM-NNN': {
        const month = String(new Date().getMonth() + 1).padStart(2, '0')
        return `${prefix}-${year}-${month}-${seq}`
      }
      default:           return `${prefix}-${year}-${seq}`
    }
  }

  // ── Price calculator ───────────────────────────────────────────────────────
  function calcPricing(items: Pick<OrderItem, 'quantity' | 'unitPrice'>[], discount: number, discountType: 'fixed' | 'percent', taxRate: number) {
    const subtotal    = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const discountAmt = discountType === 'percent'
      ? subtotal * (discount / 100)
      : discount
    const taxable     = subtotal - discountAmt
    const tax         = taxable * (taxRate / 100)
    const total       = taxable + tax

    return { subtotal, discount: discountAmt, tax, total }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function create(form: OrderForm, customerName: string): Promise<Order> {
    const parsed = orderFormSchema.parse(form)

    const customer = await db.customers.get(parsed.customerId)
    if (!customer) throw new Error('Customer not found')

    const taxRate  = auth.shop?.settings.taxRate ?? 0
    const { subtotal, discount, tax, total } = calcPricing(
      parsed.items,
      parsed.discount,
      parsed.discountType,
      taxRate,
    )

    const defaultDeposit = total * ((auth.shop?.settings.defaultDepositPercent ?? 0) / 100)
    const depositAmount  = parsed.depositAmount ?? defaultDeposit

    const order: Order = {
      id:                   generateId(),
      shopId:               auth.shopId!,
      customerId:           parsed.customerId,
      customerName,
      customerPhone:        customer.phone,
      orderNumber:          await generateOrderNumber(),
      status:               'pending',
      priority:             parsed.priority,
      dueDate:              parsed.dueDate,
      deliveryDate:         undefined,
      items:                parsed.items.map(i => ({ ...i, id: generateId() })),
      measurementProfileId: parsed.measurementProfileId,
      customMeasurements:   undefined,
      materialUsage:        [],
      styleNotes:           parsed.styleNotes,
      designImages:         [],
      internalNotes:        undefined,
      subtotal,
      discount,
      discountType:         parsed.discountType,
      tax,
      total,
      depositAmount,
      amountPaid:           depositAmount,
      paymentStatus:        depositAmount >= total ? 'paid' : depositAmount > 0 ? 'partial' : 'unpaid',
      isDeleted:            false,
      createdAt:            nowISO(),
      updatedAt:            nowISO(),
    }

    await sync.writeRecord('orders', 'INSERT', order)

    // Log creation event
    await logEvent(order.id, 'created', undefined, 'pending', `Order ${order.orderNumber} created`)

    // Log deposit payment if any
    if (depositAmount > 0) {
      await recordPayment(order.id, depositAmount, 'cash', `Initial deposit`)
    }

    orders.value = [order, ...orders.value]

    // Update customer stats
    const { useCustomers } = await import('~/composables/useCustomers')
    // (recalculate in background)

    return order
  }

  // ── Update status ──────────────────────────────────────────────────────────
  async function updateStatus(id: string, newStatus: OrderStatus, note?: string): Promise<void> {
    const order = await db.orders.get(id)
    if (!order) throw new Error('Order not found')

    const oldStatus = order.status
    const updated: Order = {
      ...order,
      status:      newStatus,
      deliveryDate: newStatus === 'delivered' ? nowISO().slice(0, 10) : order.deliveryDate,
      updatedAt:   nowISO(),
    }

    await sync.writeRecord('orders', 'UPDATE', updated)
    await logEvent(id, 'status_changed', oldStatus, newStatus, note)

    // Update local list
    const idx = orders.value.findIndex(o => o.id === id)
    if (idx !== -1) orders.value[idx] = updated
  }

  // ── Advance to next status ─────────────────────────────────────────────────
  async function advanceStatus(id: string): Promise<void> {
    const order = await db.orders.get(id)
    if (!order) return

    const currentIdx = STATUS_FLOW.indexOf(order.status)
    if (currentIdx === -1 || currentIdx === STATUS_FLOW.length - 1) return

    await updateStatus(id, STATUS_FLOW[currentIdx + 1])
  }

  // ── Record payment ─────────────────────────────────────────────────────────
  async function recordPayment(
    orderId: string,
    amount: number,
    method: PaymentMethod = 'cash',
    note?: string,
  ): Promise<Payment> {
    const order = await db.orders.get(orderId)
    if (!order) throw new Error('Order not found')

    const payment: Payment = {
      id:        generateId(),
      shopId:    auth.shopId!,
      orderId,
      amount,
      method,
      reference: undefined,
      notes:     note,
      createdAt: nowISO(),
    }

    await sync.writeRecord('payments', 'INSERT', payment)

    // Update order payment status
    const newAmountPaid = order.amountPaid + amount
    const newStatus: Order['paymentStatus'] =
      newAmountPaid >= order.total ? 'paid' :
      newAmountPaid > 0 ? 'partial' : 'unpaid'

    const updatedOrder: Order = {
      ...order,
      amountPaid:    newAmountPaid,
      paymentStatus: newStatus,
      updatedAt:     nowISO(),
    }

    await sync.writeRecord('orders', 'UPDATE', updatedOrder)
    await logEvent(orderId, 'payment_received', undefined, String(amount),
      `${method} payment of ${amount}`)

    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) orders.value[idx] = updatedOrder

    return payment
  }

  // ── Log timeline event ─────────────────────────────────────────────────────
  async function logEvent(
    orderId: string,
    type: OrderEvent['eventType'],
    oldValue?: string,
    newValue?: string,
    note?: string,
  ): Promise<void> {
    const event: OrderEvent = {
      id:        generateId(),
      orderId,
      shopId:    auth.shopId!,
      eventType: type,
      oldValue,
      newValue,
      note,
      createdAt: nowISO(),
    }
    await sync.writeRecord('orderEvents', 'INSERT', event as unknown as Parameters<typeof sync.writeRecord>[2])
  }

  // ── Update order (general edit) ────────────────────────────────────────────
  async function update(id: string, changes: Partial<Order>): Promise<Order> {
    const existing = await db.orders.get(id)
    if (!existing) throw new Error('Order not found')

    const updated: Order = { ...existing, ...changes, updatedAt: nowISO() }

    // Recalculate if items changed
    if (changes.items) {
      const taxRate = auth.shop?.settings.taxRate ?? 0
      const { subtotal, discount, tax, total } = calcPricing(
        updated.items, updated.discount, updated.discountType, taxRate,
      )
      Object.assign(updated, { subtotal, tax, total })
    }

    await sync.writeRecord('orders', 'UPDATE', updated)

    const idx = orders.value.findIndex(o => o.id === id)
    if (idx !== -1) orders.value[idx] = updated

    return updated
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  async function cancel(id: string, reason?: string): Promise<void> {
    await updateStatus(id, 'cancelled', reason)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function remove(id: string): Promise<void> {
    await sync.writeRecord('orders', 'DELETE', { id, shopId: auth.shopId! } as Order)
    orders.value = orders.value.filter(o => o.id !== id)
  }

  return {
    // State
    orders,
    filtered,
    byStatus,
    stats,
    isLoading,
    filterStatus,
    filterPayment,
    searchQuery,
    // Actions
    loadAll,
    getById,
    getWithTimeline,
    create,
    update,
    updateStatus,
    advanceStatus,
    recordPayment,
    cancel,
    remove,
    calcPricing,
    generateOrderNumber,
    // Constants
    STATUS_FLOW,
    STATUS_LABELS,
    PRIORITY_LABELS,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isOverdue(order: Order): boolean {
  if (!order.dueDate) return false
  if (['delivered', 'cancelled'].includes(order.status)) return false
  return order.dueDate < nowISO().slice(0, 10)
}

function isDueThisWeek(order: Order): boolean {
  if (!order.dueDate) return false
  if (['delivered', 'cancelled'].includes(order.status)) return false
  const today = new Date()
  const due   = new Date(order.dueDate)
  const diff  = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 7
}

import Dexie from 'dexie'
