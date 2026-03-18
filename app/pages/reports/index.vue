<!-- app/pages/reports/index.vue -->
<template>
  <div class="animate-fade-in">
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">{{ periodLabel }}</p>
        </div>
        <button class="header-action-btn" @click="exportCSV">
          <Download :size="18" stroke-width="1.8" class="stroke-white/70" />
        </button>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24 space-y-4">

      <!-- Period selector -->
      <div class="tabs">
        <button
          v-for="p in periods"
          :key="p.value"
          :class="['tab', period === p.value ? 'active' : '']"
          @click="period = p.value; loadReport()"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Custom date range -->
      <div v-if="period === 'custom'" class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">From</label>
          <input v-model="customFrom" type="date" class="form-input" @change="loadReport" />
        </div>
        <div>
          <label class="form-label">To</label>
          <input v-model="customTo" type="date" class="form-input" @change="loadReport" />
        </div>
      </div>

      <!-- Big revenue number -->
      <div class="card-ink p-5">
        <p class="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Total Revenue</p>
        <p class="font-display text-5xl text-white font-light leading-none mb-1">
          {{ fmt(report?.totalRevenue ?? 0) }}
        </p>
        <p class="text-sm text-gold-light font-medium">
          {{ fmt(report?.totalCollected ?? 0) }} collected
          <span class="text-white/40 font-normal"> · {{ fmt(report?.totalOutstanding ?? 0) }} outstanding</span>
        </p>
        <!-- Order stats row -->
        <div class="grid grid-cols-3 gap-2 mt-4">
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-xl text-white">{{ report?.totalOrders ?? 0 }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Orders</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-xl text-white">{{ report?.deliveredCount ?? 0 }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Delivered</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-xl text-white">{{ fmt(report?.avgOrderValue ?? 0) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Avg Order</p>
          </div>
        </div>
      </div>

      <!-- Revenue chart -->
      <div class="card">
        <div class="p-4 pb-0">
          <p class="text-sm font-semibold text-ink">Revenue by Period</p>
        </div>
        <div class="p-4">
          <svg width="100%" height="120" viewBox="0 0 320 120">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.9"/>
                <stop offset="100%" stop-color="#c9a84c" stop-opacity="0.3"/>
              </linearGradient>
            </defs>
            <g v-for="(bar, i) in chartBars" :key="i">
              <rect
                :x="bar.x"
                :y="120 - bar.height - 20"
                :width="bar.w"
                :height="bar.height"
                rx="4"
                :fill="i === chartBars.length - 1 ? 'url(#barGrad)' : '#f0ebe0'"
              />
              <text
                :x="bar.x + bar.w / 2"
                :y="118"
                font-size="9"
                text-anchor="middle"
                :fill="i === chartBars.length - 1 ? '#c9a84c' : '#7a6652'"
                font-family="DM Mono"
                :font-weight="i === chartBars.length - 1 ? '500' : '400'"
              >{{ bar.label }}</text>
              <text
                v-if="bar.height > 12"
                :x="bar.x + bar.w / 2"
                :y="120 - bar.height - 24"
                font-size="8"
                text-anchor="middle"
                :fill="i === chartBars.length - 1 ? '#c9a84c' : '#7a6652'"
                font-family="DM Mono"
              >{{ fmtK(bar.value) }}</text>
            </g>
          </svg>
        </div>
      </div>

      <!-- Orders by status -->
      <div class="card p-4">
        <p class="text-sm font-semibold text-ink mb-3">Orders by Status</p>
        <div class="space-y-2.5" v-if="report">
          <div v-for="(count, status) in report.byStatus" :key="status" class="progress-row">
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-ink font-medium capitalize">{{ STATUS_LABELS[status as OrderStatus] ?? status }}</span>
              <span class="font-mono-dm text-ink-muted">{{ count }} · {{ pct(count, report.totalOrders) }}%</span>
            </div>
            <div class="h-1.5 bg-cream-dark rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="statusBarColor(status as OrderStatus)"
                :style="{ width: `${pct(count, report.totalOrders)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Top customers -->
      <div class="card p-4">
        <p class="text-sm font-semibold text-ink mb-3">Top Customers</p>
        <div class="space-y-3">
          <div v-for="(c, i) in topCustomers" :key="c.id" class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <span class="font-display text-sm text-gold">{{ i + 1 }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-ink truncate">{{ c.name }}</p>
              <div class="mt-1 h-1 bg-cream-dark rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
                  :style="{ width: `${(c.totalSpend / (topCustomers[0]?.totalSpend || 1)) * 100}%` }"
                />
              </div>
            </div>
            <p class="font-mono-dm text-sm text-ink flex-shrink-0">{{ fmt(c.totalSpend) }}</p>
          </div>
          <p v-if="topCustomers.length === 0" class="text-sm text-ink-muted text-center py-2">No data yet</p>
        </div>
      </div>

      <!-- Materials summary -->
      <div class="card p-4">
        <p class="text-sm font-semibold text-ink mb-3">Inventory Summary</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-cream rounded-xl p-3 text-center">
            <p class="font-mono-dm text-xl text-ink">{{ fmt(dashStats?.materials.inventoryValue ?? 0) }}</p>
            <p class="text-2xs text-ink-muted uppercase tracking-wide mt-1">Total Value</p>
          </div>
          <div class="bg-cream rounded-xl p-3 text-center">
            <p :class="['font-mono-dm text-xl', (dashStats?.materials.lowStockCount ?? 0) > 0 ? 'text-danger' : 'text-success']">
              {{ dashStats?.materials.lowStockCount ?? 0 }}
            </p>
            <p class="text-2xs text-ink-muted uppercase tracking-wide mt-1">Low Stock</p>
          </div>
        </div>
      </div>

      <!-- Export buttons -->
      <div class="grid grid-cols-2 gap-3">
        <button class="btn btn-outline btn-md flex items-center justify-center gap-2" @click="exportCSV">
          <Download :size="16" stroke-width="1.8" />
          Export CSV
        </button>
        <button class="btn btn-primary btn-md flex items-center justify-center gap-2" @click="printReport">
          <Printer :size="16" stroke-width="1.8" />
          Print PDF
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Printer } from 'lucide-vue-next'
import { useDashboard } from '~/composables/useDashboard'
import { STATUS_LABELS } from '~/composables/useOrders'
import { useAuthStore } from '~/stores/auth'
import type { OrderStatus } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
useHead({ title: 'Reports — eTailor' })

const auth = useAuthStore()
const { dashStats, topCustomers, revenueChartData, loadDashboard, getOrderReport } = useDashboard()

const period     = ref<'week' | 'month' | '3months' | 'year' | 'custom'>('month')
const customFrom = ref(dayjs().subtract(30, 'day').format('YYYY-MM-DD'))
const customTo   = ref(dayjs().format('YYYY-MM-DD'))
const report     = ref<Awaited<ReturnType<typeof getOrderReport>>>(null)

const periods = [
  { value: 'week',    label: 'This Week' },
  { value: 'month',   label: 'This Month' },
  { value: '3months', label: '3 Months' },
  { value: 'year',    label: 'This Year' },
  { value: 'custom',  label: 'Custom' },
]

const periodLabel = computed(() => {
  const now = dayjs()
  switch (period.value) {
    case 'week':    return `${now.startOf('week').format('MMM D')} – ${now.endOf('week').format('MMM D, YYYY')}`
    case 'month':   return now.format('MMMM YYYY')
    case '3months': return `${now.subtract(3, 'month').format('MMM')} – ${now.format('MMM YYYY')}`
    case 'year':    return now.format('YYYY')
    default:        return `${customFrom.value} – ${customTo.value}`
  }
})

function getPeriodDates(): { from: string; to: string } {
  const now  = dayjs()
  const today = now.format('YYYY-MM-DD')
  switch (period.value) {
    case 'week':    return { from: now.startOf('week').format('YYYY-MM-DD'), to: today }
    case 'month':   return { from: now.startOf('month').format('YYYY-MM-DD'), to: today }
    case '3months': return { from: now.subtract(3, 'month').format('YYYY-MM-DD'), to: today }
    case 'year':    return { from: now.startOf('year').format('YYYY-MM-DD'), to: today }
    default:        return { from: customFrom.value, to: customTo.value }
  }
}

async function loadReport() {
  const { from, to } = getPeriodDates()
  report.value = await getOrderReport(from, to)
}

// Chart bars (revenueChartData or fallback)
const chartBars = computed(() => {
  const data = revenueChartData.value
  if (!data.length) return []
  const max = Math.max(...data.map(d => d.value), 1)
  const totalWidth = 320
  const gap = 8
  const barWidth = (totalWidth - gap * (data.length - 1)) / data.length
  return data.map((d, i) => ({
    x:      i * (barWidth + gap),
    w:      barWidth,
    height: Math.max(2, (d.value / max) * 90),
    label:  d.label,
    value:  d.value,
  }))
})

function statusBarColor(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending:   'bg-warning',
    cutting:   'bg-purple-500',
    sewing:    'bg-info',
    finishing: 'bg-pink-500',
    ready:     'bg-success',
    delivered: 'bg-gold',
    cancelled: 'bg-danger',
  }
  return map[status] ?? 'bg-ink-muted'
}

function pct(count: number, total: number): number {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

async function exportCSV() {
  const { from, to } = getPeriodDates()
  const db = (await import('~/db/schema')).getDb()
  const orders = await db.orders
    .where('shopId').equals(auth.shopId!)
    .filter(o => !o.isDeleted && (o.createdAt.slice(0, 10) >= from) && (o.createdAt.slice(0, 10) <= to))
    .toArray()

  const rows = [
    ['Order #', 'Customer', 'Status', 'Items', 'Total', 'Paid', 'Balance', 'Due Date', 'Created'],
    ...orders.map(o => [
      o.orderNumber, o.customerName, o.status,
      o.items.map(i => i.name).join('; '),
      o.total, o.amountPaid, o.total - o.amountPaid,
      o.dueDate ?? '', o.createdAt.slice(0, 10),
    ]),
  ]

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `etailor-orders-${from}-to-${to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printReport() {
  window.print()
}

function fmt(n: number)  { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

onMounted(async () => {
  await loadDashboard()
  await loadReport()
})
</script>
