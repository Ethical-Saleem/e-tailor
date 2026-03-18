<!-- app/pages/orders/index.vue -->
<template>
  <div class="animate-fade-in">
    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="page-title">Orders</h1>
          <p class="page-subtitle">{{ stats.active }} active · {{ stats.overdue }} overdue</p>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <button class="header-action-btn" @click="toggleView">
            <LayoutList v-if="viewMode === 'kanban'" :size="18" stroke-width="1.8" class="stroke-white/70" />
            <Trello      v-else                       :size="18" stroke-width="1.8" class="stroke-white/70" />
          </button>
          <NuxtLink to="/orders/new" class="header-action-btn">
            <Plus :size="18" stroke-width="2" class="stroke-white/70" />
          </NuxtLink>
        </div>
      </div>
    </header>

    <div class="px-4 pt-4">

      <!-- ── View toggle tabs ── -->
      <div class="tabs mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab', viewMode === tab.value ? 'active' : '']"
          @click="viewMode = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ── Filter chips ── -->
      <div class="chips mb-4">
        <button
          v-for="chip in statusChips"
          :key="chip.value"
          :class="['chip', filterStatus === chip.value ? 'chip-active' : 'chip-inactive']"
          @click="filterStatus = chip.value"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- ── Outstanding balance summary ── -->
      <div v-if="stats.outstanding > 0" class="flex items-center justify-between bg-surface rounded-xl border border-cream-dark px-4 py-3 mb-4 shadow-card">
        <div>
          <p class="text-xs text-ink-muted font-semibold uppercase tracking-wider">Outstanding Balance</p>
          <p class="font-mono-dm text-base text-danger font-medium mt-0.5">{{ fmt(stats.outstanding) }}</p>
        </div>
        <NuxtLink to="/reports" class="btn btn-outline btn-sm text-xs">View Report</NuxtLink>
      </div>

      <!-- ── LIST VIEW ── -->
      <template v-if="viewMode === 'list'">
        <div v-if="isLoading" class="space-y-2.5 pb-6">
          <div v-for="i in 5" :key="i" class="h-28 skeleton rounded-xl" />
        </div>

        <div v-else-if="filtered.length === 0" class="empty-state pb-10">
          <div class="empty-state-icon">
            <ClipboardList :size="28" stroke-width="1.5" class="stroke-ink-muted" />
          </div>
          <p class="empty-state-title text-xl">No orders found</p>
          <p class="empty-state-desc">Try changing your filters or create a new order</p>
          <NuxtLink to="/orders/new" class="btn btn-primary btn-md mt-4">New Order</NuxtLink>
        </div>

        <div v-else class="space-y-2.5 pb-6">
          <OrderCard
            v-for="order in filtered"
            :key="order.id"
            :order="order"
            @click="$router.push(`/orders/${order.id}`)"
          />
        </div>
      </template>

      <!-- ── KANBAN VIEW ── -->
      <template v-else-if="viewMode === 'kanban'">
        <div class="flex gap-3 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
          <div
            v-for="status in kanbanColumns"
            :key="status"
            class="flex-shrink-0 w-52"
          >
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
                {{ STATUS_LABELS[status] }}
              </span>
              <span class="text-2xs font-semibold bg-cream-dark text-ink-muted px-2 py-0.5 rounded-full">
                {{ byStatus[status]?.length ?? 0 }}
              </span>
            </div>

            <div class="space-y-2">
              <NuxtLink
                v-for="order in byStatus[status]"
                :key="order.id"
                :to="`/orders/${order.id}`"
                class="block card p-3 hover:shadow-card-md transition-shadow duration-150"
              >
                <p class="font-mono-dm text-2xs text-ink-muted mb-0.5">{{ order.orderNumber }}</p>
                <p class="text-sm font-semibold text-ink mb-1 truncate">{{ order.customerName }}</p>
                <p class="text-xs text-ink-muted mb-2 truncate">{{ order.items.map(i => i.name).join(', ') }}</p>
                <div class="flex items-center justify-between">
                  <span v-if="order.dueDate" class="text-2xs text-ink-muted">
                    {{ formatDue(order.dueDate) }}
                  </span>
                  <span class="font-mono-dm text-xs text-gold font-medium">{{ fmt(order.total) }}</span>
                </div>
                <!-- Priority indicator -->
                <div v-if="order.priority === 'urgent' || order.priority === 'high'" class="mt-2">
                  <span :class="['badge text-2xs', order.priority === 'urgent' ? 'badge-danger' : 'badge-warning']">
                    {{ order.priority }}
                  </span>
                </div>
              </NuxtLink>

              <!-- Empty column placeholder -->
              <div v-if="!byStatus[status]?.length" class="h-20 rounded-xl border-2 border-dashed border-cream-dark flex items-center justify-center">
                <p class="text-xs text-ink-subtle">Empty</p>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  LayoutList, Trello, Plus, ClipboardList,
} from 'lucide-vue-next'
import { useOrdersStore } from '~/stores/orders'
import { useOrders, STATUS_LABELS, STATUS_FLOW } from '~/composables/useOrders'
import type { OrderStatus } from '~/types/models'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

useHead({ title: 'Orders — eTailor' })

const auth = useAuthStore()
const { orders, filtered, byStatus, stats, isLoading, loadAll, filterStatus } = useOrders()

const viewMode = ref<'list' | 'kanban'>('list')

const tabs = [
  { label: 'List',    value: 'list' },
  { label: 'Kanban',  value: 'kanban' },
]

const statusChips = computed(() => [
  { label: `All (${orders.value.length})`,                      value: 'all' as const },
  { label: `Pending (${byStatus.value.pending?.length ?? 0})`,  value: 'pending' as OrderStatus },
  { label: `In Progress (${inProgressCount.value})`,            value: 'cutting' as OrderStatus },
  { label: `Ready (${byStatus.value.ready?.length ?? 0})`,      value: 'ready' as OrderStatus },
  { label: `Delivered (${byStatus.value.delivered?.length ?? 0})`, value: 'delivered' as OrderStatus },
])

const inProgressCount = computed(() =>
  (byStatus.value.cutting?.length ?? 0) +
  (byStatus.value.sewing?.length ?? 0) +
  (byStatus.value.finishing?.length ?? 0),
)

const kanbanColumns: OrderStatus[] = ['pending', 'cutting', 'sewing', 'finishing', 'ready', 'delivered']

function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'kanban' : 'list'
}

function fmt(amount: number): string {
  return `${auth.shop?.currencySymbol}${amount.toLocaleString()}`
}

function formatDue(date: string): string {
  const d = dayjs(date)
  const diff = d.diff(dayjs(), 'day')
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff <= 7) return `${diff}d left`
  return d.format('MMM D')
}

onMounted(() => loadAll())
</script>
