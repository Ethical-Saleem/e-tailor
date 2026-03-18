<!-- app/pages/index.vue -->
<template>
  <div class="animate-fade-in">
    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <p class="font-display italic text-sm text-white/60 mb-1">Good {{ greeting }},</p>
          <h1 class="font-display text-3xl text-white leading-tight">
            {{ shopName }}
          </h1>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <button
            class="relative header-action-btn"
            @click="notificationsOpen = true"
          >
            <Bell :size="18" stroke-width="1.8" class="stroke-white/70" />
            <span v-if="alertCount > 0" class="notif-dot" />
          </button>
          <NuxtLink to="/settings" class="header-action-btn">
            <Settings :size="18" stroke-width="1.8" class="stroke-white/70" />
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="px-4 pt-5 pb-6 space-y-5">

      <!-- ── Stats grid ── -->
      <div class="grid grid-cols-2 gap-2.5">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="stat-card relative card p-3.5"
        >
          <div class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            {{ stat.label }}
          </div>
          <div :class="['font-mono-dm text-2xl leading-none mb-1', stat.valueClass ?? 'text-ink']">
            {{ stat.value }}
          </div>
          <div :class="['text-xs font-medium', stat.changeClass]">
            {{ stat.change }}
          </div>
          <div class="absolute top-3 right-3 opacity-10">
            <component :is="stat.icon" :size="28" stroke-width="1.5" class="stroke-ink" />
          </div>
        </div>
      </div>

      <!-- ── Quick actions ── -->
      <section>
        <h2 class="section-title mb-3">Quick Actions</h2>
        <div class="grid grid-cols-4 gap-2.5">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.label"
            :to="action.to"
            class="flex flex-col items-center gap-1.5 group"
          >
            <div class="w-14 h-14 rounded-2xl bg-surface border border-cream-dark shadow-card
                        flex items-center justify-center
                        group-hover:shadow-card-md group-hover:-translate-y-0.5 transition-all duration-150">
              <component :is="action.icon" :size="22" stroke-width="1.5" class="stroke-ink" />
            </div>
            <span class="text-[10px] text-ink-muted font-medium text-center leading-tight">
              {{ action.label }}
            </span>
          </NuxtLink>
        </div>
      </section>

      <!-- ── Alerts ── -->
      <template v-if="alerts.length > 0">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          :class="['alert', `alert-${alert.type}`]"
        >
          <AlertTriangle v-if="alert.type === 'warning'" :size="16" stroke-width="2" class="stroke-warning mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-xs font-semibold text-ink">{{ alert.title }}</p>
            <p class="text-xs text-ink-muted mt-0.5">{{ alert.desc }}</p>
          </div>
        </div>
      </template>

      <!-- ── Recent orders ── -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Recent Orders</h2>
          <NuxtLink to="/orders" class="section-link">See all →</NuxtLink>
        </div>

        <div v-if="isLoadingOrders" class="space-y-2.5">
          <div v-for="i in 3" :key="i" class="h-24 skeleton rounded-xl" />
        </div>

        <div v-else-if="recentOrders.length === 0" class="empty-state py-10">
          <div class="empty-state-icon"><ClipboardList :size="28" stroke-width="1.5" class="stroke-ink-muted" /></div>
          <p class="empty-state-title text-lg">No orders yet</p>
          <p class="empty-state-desc text-xs">Create your first order to get started</p>
          <NuxtLink to="/orders/new" class="btn btn-primary btn-md mt-4">New Order</NuxtLink>
        </div>

        <div v-else class="space-y-2.5">
          <OrderCard
            v-for="order in recentOrders"
            :key="order.id"
            :order="order"
            @click="$router.push(`/orders/${order.id}`)"
          />
        </div>
      </section>

      <!-- ── Revenue chart ── -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Revenue Trend</h2>
          <span class="text-xs text-ink-muted font-mono-dm">6 months</span>
        </div>
        <div class="card">
          <DashRevenueChart :data="revenueChartData" />
        </div>
      </section>

      <!-- ── Top customers ── -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Top Clients</h2>
          <NuxtLink to="/customers" class="section-link">View all →</NuxtLink>
        </div>
        <div class="card divide-y divide-cream-dark">
          <DashTopCustomerRow
            v-for="(c, idx) in topCustomers"
            :key="c.id"
            :rank="idx + 1"
            :customer="c"
            :max-spend="topCustomers[0]?.totalSpend ?? 1"
          />
          <div v-if="topCustomers.length === 0" class="px-4 py-6 text-center text-sm text-ink-muted">
            No customer data yet
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Bell, Settings, AlertTriangle, ClipboardList,
  DollarSign, ShoppingBag, Users, Clock,
  FilePlus, UserPlus, Package, BarChart3,
} from 'lucide-vue-next'
import { useOrdersStore } from '~/stores/orders'
import { useMaterialsStore } from '~/stores/materials'
import { useAuthStore } from '~/stores/auth'
import { useDashboard } from '~/composables/useDashboard'

useHead({ title: 'Dashboard — eTailor' })

const auth          = useAuthStore()
const ordersStore   = useOrdersStore()
const materialsStore = useMaterialsStore()
const { dashStats, revenueChartData, topCustomers, loadDashboard } = useDashboard()

const isLoadingOrders = ref(true)
const notificationsOpen = ref(false)

// Greeting
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

const shopName = computed(() => auth.shopName)

// Stats cards
const stats = computed(() => [
  {
    label: `Revenue · ${new Date().toLocaleString('default', { month: 'short' })}`,
    value: formatCurrency(dashStats.value?.revenue.thisMonth ?? 0),
    change: dashStats.value
      ? `${dashStats.value.revenue.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(dashStats.value.revenue.changePercent).toFixed(0)}% vs last month`
      : '—',
    changeClass: (dashStats.value?.revenue.changePercent ?? 0) >= 0 ? 'text-success' : 'text-danger',
    icon: DollarSign,
  },
  {
    label: 'Active Orders',
    value: String(dashStats.value?.orders.active ?? 0),
    change: `${dashStats.value?.orders.dueThisWeek ?? 0} due this week`,
    changeClass: 'text-ink-muted',
    icon: ShoppingBag,
  },
  {
    label: 'Customers',
    value: String(dashStats.value?.customers.total ?? 0),
    change: `+${dashStats.value?.customers.newThisMonth ?? 0} this month`,
    changeClass: 'text-success',
    icon: Users,
  },
  {
    label: 'Due This Week',
    value: String(dashStats.value?.orders.dueThisWeek ?? 0),
    change: dashStats.value?.orders.overdue
      ? `${dashStats.value.orders.overdue} overdue`
      : 'None overdue',
    changeClass: (dashStats.value?.orders.overdue ?? 0) > 0 ? 'text-danger' : 'text-ink-muted',
    valueClass: (dashStats.value?.orders.dueThisWeek ?? 0) > 5 ? 'text-warning' : 'text-ink',
    icon: Clock,
  },
])

// Quick actions
const quickActions = [
  { label: 'New Order',  to: '/orders/new',     icon: FilePlus },
  { label: 'Add Client', to: '/customers/new',  icon: UserPlus },
  { label: 'Stock In',   to: '/materials',      icon: Package },
  { label: 'Reports',    to: '/reports',        icon: BarChart3 },
]

// Alerts
const alerts = computed(() => {
  const list: Array<{ id: string; type: 'warning' | 'danger'; title: string; desc: string }> = []

  if ((dashStats.value?.orders.overdue ?? 0) > 0) {
    list.push({
      id: 'overdue',
      type: 'danger',
      title: `${dashStats.value!.orders.overdue} overdue order${dashStats.value!.orders.overdue > 1 ? 's' : ''}`,
      desc: 'These need immediate attention',
    })
  }

  if ((dashStats.value?.materials.lowStockCount ?? 0) > 0) {
    list.push({
      id: 'low-stock',
      type: 'warning',
      title: `${dashStats.value!.materials.lowStockCount} material${dashStats.value!.materials.lowStockCount > 1 ? 's' : ''} running low`,
      desc: 'Stock up to avoid order delays',
    })
  }

  return list
})

const alertCount = computed(() => alerts.value.length)

// Recent orders (last 5 active)
const recentOrders = computed(() =>
  ordersStore.orders
    .filter(o => !o.isDeleted)
    .slice(0, 5),
)

// Format currency
function formatCurrency(amount: number): string {
  const symbol = auth.shop?.currencySymbol
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(0)}k`
  return `${symbol}${amount}`
}

onMounted(async () => {
  await Promise.all([
    loadDashboard(),
    ordersStore.loadAll(),
  ])
  isLoadingOrders.value = false
})
</script>
