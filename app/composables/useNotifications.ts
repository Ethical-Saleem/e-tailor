// app/composables/useNotifications.ts
// ─────────────────────────────────────────────────────────────────────────────
// In-app notification engine. Checks for:
//   - Orders due today / overdue
//   - Low stock alerts
//   - Outstanding payment balances
// Runs on app mount and exposes a reactive alerts list.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, computed } from 'vue'
import { getDb } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

export type NotifType = 'overdue' | 'due_today' | 'due_soon' | 'low_stock' | 'outstanding'

export interface AppNotification {
  id:      string
  type:    NotifType
  title:   string
  desc:    string
  link?:   string
  urgent:  boolean
}

export function useNotifications() {
  const auth = useAuthStore()
  const db   = getDb()

  const notifications = ref<AppNotification[]>([])
  const isLoading     = ref(false)

  const urgentCount = computed(() => notifications.value.filter(n => n.urgent).length)
  const totalCount  = computed(() => notifications.value.length)

  async function refresh(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true

    const list: AppNotification[] = []
    const today    = dayjs().format('YYYY-MM-DD')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const in3days  = dayjs().add(3, 'day').format('YYYY-MM-DD')

    try {
      const [orders, materials] = await Promise.all([
        db.orders
          .where('shopId').equals(auth.shopId)
          .filter(o => !o.isDeleted && !['delivered', 'cancelled'].includes(o.status))
          .toArray(),
        db.materials
          .where('shopId').equals(auth.shopId)
          .filter(m => !m.isDeleted)
          .toArray(),
      ])

      // ── Overdue orders ──────────────────────────────────────────────────────
      const overdue = orders.filter(o => o.dueDate && o.dueDate < today)
      if (overdue.length > 0) {
        list.push({
          id:     'overdue',
          type:   'overdue',
          title:  `${overdue.length} overdue order${overdue.length > 1 ? 's' : ''}`,
          desc:   overdue.slice(0, 2).map(o => `${o.customerName} — ${o.orderNumber}`).join('; '),
          link:   '/orders',
          urgent: true,
        })
      }

      // ── Due today ──────────────────────────────────────────────────────────
      const dueToday = orders.filter(o => o.dueDate === today)
      if (dueToday.length > 0) {
        list.push({
          id:     'due-today',
          type:   'due_today',
          title:  `${dueToday.length} order${dueToday.length > 1 ? 's' : ''} due today`,
          desc:   dueToday.map(o => o.customerName).join(', '),
          link:   '/orders',
          urgent: true,
        })
      }

      // ── Due in 3 days ──────────────────────────────────────────────────────
      const dueSoon = orders.filter(o => o.dueDate && o.dueDate > today && o.dueDate <= in3days)
      if (dueSoon.length > 0) {
        list.push({
          id:     'due-soon',
          type:   'due_soon',
          title:  `${dueSoon.length} order${dueSoon.length > 1 ? 's' : ''} due in 3 days`,
          desc:   dueSoon.map(o => `${o.customerName} (${o.dueDate})`).join(', '),
          link:   '/orders',
          urgent: false,
        })
      }

      // ── Low stock ──────────────────────────────────────────────────────────
      const lowStock = materials.filter(m => m.currentStock <= m.minimumStock && m.minimumStock > 0)
      if (lowStock.length > 0) {
        list.push({
          id:     'low-stock',
          type:   'low_stock',
          title:  `${lowStock.length} material${lowStock.length > 1 ? 's' : ''} running low`,
          desc:   lowStock.slice(0, 3).map(m => m.name).join(', '),
          link:   '/materials',
          urgent: lowStock.some(m => m.currentStock === 0),
        })
      }

      // ── Outstanding balances ───────────────────────────────────────────────
      const withBalance = orders.filter(o => o.paymentStatus !== 'paid' && o.status === 'delivered')
      if (withBalance.length > 0) {
        const total = withBalance.reduce((s, o) => s + (o.total - o.amountPaid), 0)
        list.push({
          id:     'outstanding',
          type:   'outstanding',
          title:  `${withBalance.length} unpaid delivered order${withBalance.length > 1 ? 's' : ''}`,
          desc:   `${auth.shop?.currencySymbol}${total.toLocaleString()} outstanding`,
          link:   '/reports',
          urgent: false,
        })
      }

      notifications.value = list
    } catch (err) {
      console.error('[Notifications] Failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    notifications,
    urgentCount,
    totalCount,
    isLoading,
    refresh,
  }
}
