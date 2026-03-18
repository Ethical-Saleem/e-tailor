// app/composables/useDashboard.ts
import { ref, computed } from 'vue'
import { getDb } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'
import type { DashboardStats, OrderStatus } from '~/types/models'
import dayjs from 'dayjs'

export function useDashboard() {
  const auth = useAuthStore()
  const db   = getDb()

  const dashStats       = ref<DashboardStats | null>(null)
  const isLoading       = ref(false)
  const revenueChartData = ref<Array<{ label: string; value: number }>>([])
  const topCustomers    = ref<DashboardStats['topCustomers']>([])

  async function loadDashboard(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true

    try {
      const [orders, customers, materials, payments] = await Promise.all([
        db.orders.where('shopId').equals(auth.shopId).toArray(),
        db.customers.where('shopId').equals(auth.shopId).filter(c => !c.isDeleted).toArray(),
        db.materials.where('shopId').equals(auth.shopId).filter(m => !m.isDeleted).toArray(),
        db.payments.where('shopId').equals(auth.shopId).toArray(),
      ])

      const now        = dayjs()
      const thisMonth  = now.format('YYYY-MM')
      const lastMonth  = now.subtract(1, 'month').format('YYYY-MM')
      const thisWeek   = now.format('YYYY-[W]WW')
      const today      = now.format('YYYY-MM-DD')
      const weekEnd    = now.add(7, 'day').format('YYYY-MM-DD')

      // ── Revenue ────────────────────────────────────────────────────────────
      const thisMonthPayments = payments.filter(p => p.createdAt.startsWith(thisMonth))
      const lastMonthPayments = payments.filter(p => p.createdAt.startsWith(lastMonth))
      const revenueThisMonth  = thisMonthPayments.reduce((s, p) => s + p.amount, 0)
      const revenueLastMonth  = lastMonthPayments.reduce((s, p) => s + p.amount, 0)
      const changePercent     = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 0

      // 6-month revenue trend
      const trend = Array.from({ length: 6 }, (_, i) => {
        const m = now.subtract(5 - i, 'month')
        const label = m.format('MMM')
        const key   = m.format('YYYY-MM')
        const value = payments
          .filter(p => p.createdAt.startsWith(key))
          .reduce((s, p) => s + p.amount, 0)
        return { label, value }
      })

      // ── Orders ──────────────────────────────────────────────────────────────
      const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
      const overdueOrders = activeOrders.filter(o => o.dueDate && o.dueDate < today)
      const dueThisWeek   = activeOrders.filter(o => o.dueDate && o.dueDate >= today && o.dueDate <= weekEnd)

      const byStatus = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1
        return acc
      }, {} as Record<OrderStatus, number>)

      // ── Customers ───────────────────────────────────────────────────────────
      const newThisMonth = customers.filter(c => c.createdAt.startsWith(thisMonth)).length

      // Top customers by spend
      const top = [...customers]
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 5)
        .map(c => ({ id: c.id, name: c.name, totalSpend: c.totalSpend, orderCount: c.totalOrders }))

      // ── Payments / outstanding ──────────────────────────────────────────────
      const outstanding = orders
        .filter(o => o.paymentStatus !== 'paid' && o.status !== 'cancelled')
        .reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0)

      const collectedThisMonth = revenueThisMonth

      // ── Materials ───────────────────────────────────────────────────────────
      const lowStockCount   = materials.filter(m => m.currentStock <= m.minimumStock).length
      const inventoryValue  = materials.reduce((s, m) => s + m.currentStock * m.currentUnitCost, 0)

      // ── Assemble ────────────────────────────────────────────────────────────
      dashStats.value = {
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          changePercent,
          trend,
        },
        orders: {
          active:      activeOrders.length,
          dueThisWeek: dueThisWeek.length,
          overdue:     overdueOrders.length,
          byStatus,
        },
        customers: {
          total:         customers.length,
          newThisMonth,
        },
        payments: {
          outstanding,
          collectedThisMonth,
        },
        materials: {
          lowStockCount,
          inventoryValue,
        },
        topCustomers: top,
      }

      revenueChartData.value = trend
      topCustomers.value     = top
    } catch (err) {
      console.error('[Dashboard] Load failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  // ── Report: orders by period ───────────────────────────────────────────────
  async function getOrderReport(from: string, to: string) {
    if (!auth.shopId) return null
    const orders = await db.orders
      .where('shopId').equals(auth.shopId)
      .filter(o => o.isDeleted !== 1 && o.createdAt.slice(0, 10) >= from && o.createdAt.slice(0, 10) <= to)
      .toArray()

    const payments = await db.payments
      .where('shopId').equals(auth.shopId)
      .filter(p => p.createdAt.slice(0, 10) >= from && p.createdAt.slice(0, 10) <= to)
      .toArray()

    return {
      totalOrders:   orders.length,
      totalRevenue:  orders.reduce((s, o) => s + o.total, 0),
      totalCollected: payments.reduce((s, p) => s + p.amount, 0),
      totalOutstanding: orders.reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0),
      deliveredCount: orders.filter(o => o.status === 'delivered').length,
      cancelledCount: orders.filter(o => o.status === 'cancelled').length,
      avgOrderValue:  orders.length > 0 ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
      byStatus:       orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  }

  return {
    dashStats,
    revenueChartData,
    topCustomers,
    isLoading,
    loadDashboard,
    getOrderReport,
  }
}
