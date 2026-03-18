<!-- app/pages/more/index.vue -->
<template>
  <div class="animate-fade-in">

    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <p class="font-display italic text-sm text-white/50 mb-0.5">{{ auth.shopName }}</p>
          <h1 class="page-title">More</h1>
        </div>
        <!-- Avatar / initials -->
        <div class="w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center mt-1 flex-shrink-0">
          <span class="font-display text-xl text-gold-light leading-none">
            {{ shopInitial }}
          </span>
        </div>
      </div>

      <!-- Quick stats strip -->
      <div class="flex gap-3 mt-5 overflow-x-auto scrollbar-hide pb-0.5">
        <div
          v-for="stat in headerStats"
          :key="stat.label"
          class="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-center min-w-[80px]"
        >
          <p :class="['font-mono-dm text-lg leading-none mb-0.5', stat.valueClass ?? 'text-white']">
            {{ stat.value }}
          </p>
          <p class="text-2xs text-white/40 uppercase tracking-wider font-medium">{{ stat.label }}</p>
        </div>
      </div>
    </header>

    <div class="px-4 pt-5 pb-28 space-y-4">

      <!-- ── TOOLS ─────────────────────────────────────────────────────────── -->
      <section>
        <p class="text-2xs font-semibold text-ink-muted uppercase tracking-widest mb-3">Tools</p>
        <div class="card divide-y divide-cream-dark">
          <MoreNavItem
            v-for="item in toolItems"
            :key="item.to"
            v-bind="item"
          />
        </div>
      </section>

      <!-- ── BUSINESS ──────────────────────────────────────────────────────── -->
      <section>
        <p class="text-2xs font-semibold text-ink-muted uppercase tracking-widest mb-3">Business</p>
        <div class="card divide-y divide-cream-dark">
          <MoreNavItem
            v-for="item in businessItems"
            :key="item.to"
            v-bind="item"
          />
        </div>
      </section>

      <!-- ── ACCOUNT ───────────────────────────────────────────────────────── -->
      <section>
        <p class="text-2xs font-semibold text-ink-muted uppercase tracking-widest mb-3">Account</p>
        <div class="card divide-y divide-cream-dark">
          <MoreNavItem
            v-for="item in accountItems"
            :key="item.to"
            v-bind="item"
          />
        </div>
      </section>

      <!-- ── SYNC STATUS ────────────────────────────────────────────────────── -->
      <section>
        <p class="text-2xs font-semibold text-ink-muted uppercase tracking-widest mb-3">Sync</p>
        <div class="card p-4">
          <div class="flex items-center gap-3 mb-3">
            <div :class="['w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', syncIconBg]">
              <component :is="syncIcon" :size="18" stroke-width="1.8" :class="syncIconColor" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ink">{{ syncLabel }}</p>
              <p class="text-xs text-ink-muted truncate">{{ syncSubLabel }}</p>
            </div>
            <button
              v-if="syncStatus === 'error'"
              class="btn btn-outline btn-sm text-xs flex-shrink-0"
              @click="retryFailed"
            >
              Retry
            </button>
            <button
              v-else-if="syncStatus === 'pending'"
              class="btn btn-outline btn-sm text-xs flex-shrink-0"
              @click="processQueue"
            >
              Sync now
            </button>
          </div>
          <!-- Pending count bar -->
          <div v-if="pendingCount > 0" class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-cream-dark rounded-full overflow-hidden">
              <div class="h-full bg-warning rounded-full animate-pulse-dot" style="width: 60%" />
            </div>
            <span class="text-2xs text-ink-muted font-mono-dm flex-shrink-0">
              {{ pendingCount }} pending
            </span>
          </div>
          <div v-else-if="syncStatus === 'synced'" class="flex items-center gap-1.5 text-xs text-ink-muted">
            <CheckCircle2 :size="12" stroke-width="2" class="stroke-success" />
            <span>All data backed up to cloud</span>
          </div>
        </div>
      </section>

      <section>
        <button class="btn btn-danger btn-md btn-full" @click="auth.signOut()">
          Sign out of {{ auth.shopName }}
        </button>
      </section>

      <!-- ── APP INFO ───────────────────────────────────────────────────────── -->
      <div class="text-center space-y-1 pb-2">
        <p class="font-display text-2xl text-ink-muted font-light">
          e<span class="text-gold">Tailor</span>
        </p>
        <p class="text-xs text-ink-subtle">Version 1.0.0</p>
        <p class="text-xs text-ink-subtle">Built for tailors, by design</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Ruler, Package, BarChart3, Settings, HelpCircle,
  Download, RefreshCw, CheckCircle2, WifiOff,
  AlertCircle, Loader2, LogOut, Shield,
} from 'lucide-vue-next'
import { useAuthStore }    from '~/stores/auth'
import { useOrdersStore }  from '~/stores/orders'
import { useMaterialsStore } from '~/stores/materials'
import { useOfflineSync }  from '~/composables/useOfflineSync'

definePageMeta({ layout: 'default' })
useHead({ title: 'More — eTailor' })

const auth           = useAuthStore()
const ordersStore    = useOrdersStore()
const materialsStore = useMaterialsStore()
const {
  syncStatus, syncLabel: rawSyncLabel, pendingCount,
  processQueue, retryFailed, isOnline,
} = useOfflineSync()

// ── Shop initial for avatar ────────────────────────────────────────────────────
const shopInitial = computed(() =>
  auth.shopName?.charAt(0)?.toUpperCase() ?? 'E',
)

// ── Header stats strip ────────────────────────────────────────────────────────
const headerStats = computed(() => [
  {
    label:      'Active',
    value:      String(ordersStore.activeOrders.length),
    valueClass: 'text-white',
  },
  {
    label:      'Overdue',
    value:      String(ordersStore.overdueCount),
    valueClass: ordersStore.overdueCount > 0 ? 'text-danger' : 'text-white',
  },
  {
    label:      'Low Stock',
    value:      String(materialsStore.lowStockCount),
    valueClass: materialsStore.lowStockCount > 0 ? 'text-warning' : 'text-white',
  },
  {
    label:      'Materials',
    value:      String(materialsStore.materials.length),
    valueClass: 'text-white',
  },
])

// ── Nav item groups ───────────────────────────────────────────────────────────

const toolItems = computed(() => [
  {
    to:          '/measurements',
    icon:        Ruler,
    label:       'Measurements',
    description: 'Profiles, templates & comparisons',
    iconBg:      'bg-info/10',
    iconColor:   'stroke-info',
  },
  {
    to:          '/materials',
    icon:        Package,
    label:       'Materials & Stock',
    description: 'Inventory, prices & low-stock alerts',
    iconBg:      'bg-warning/10',
    iconColor:   'stroke-warning',
    badge:       materialsStore.lowStockCount > 0 ? String(materialsStore.lowStockCount) : undefined,
    badgeColor:  'bg-warning',
  },
])

const businessItems = computed(() => [
  {
    to:          '/reports',
    icon:        BarChart3,
    label:       'Reports & Analytics',
    description: 'Revenue, orders & customer insights',
    iconBg:      'bg-success/10',
    iconColor:   'stroke-success',
  },
])

const accountItems = [
  {
    to:          '/settings',
    icon:        Settings,
    label:       'Shop Settings',
    description: 'Name, currency, order prefix & more',
    iconBg:      'bg-cream-dark',
    iconColor:   'stroke-ink-muted',
  },
]

// ── Sync section ──────────────────────────────────────────────────────────────
const syncIcon = computed(() => {
  switch (syncStatus.value) {
    case 'synced':  return CheckCircle2
    case 'syncing': return Loader2
    case 'pending': return RefreshCw
    case 'offline': return WifiOff
    case 'error':   return AlertCircle
  }
})

const syncIconBg = computed(() => {
  switch (syncStatus.value) {
    case 'synced':  return 'bg-success/10'
    case 'syncing': return 'bg-info/10'
    case 'pending': return 'bg-warning/10'
    case 'offline': return 'bg-cream-dark'
    case 'error':   return 'bg-danger/10'
  }
})

const syncIconColor = computed(() => {
  switch (syncStatus.value) {
    case 'synced':  return 'stroke-success'
    case 'syncing': return 'stroke-info animate-spin'
    case 'pending': return 'stroke-warning'
    case 'offline': return 'stroke-ink-muted'
    case 'error':   return 'stroke-danger'
  }
})

const syncLabel = computed(() => {
  switch (syncStatus.value) {
    case 'synced':  return 'All data synced'
    case 'syncing': return 'Syncing changes…'
    case 'pending': return 'Changes pending sync'
    case 'offline': return 'Working offline'
    case 'error':   return 'Sync error'
  }
})

const syncSubLabel = computed(() => {
  switch (syncStatus.value) {
    case 'synced':  return rawSyncLabel.value
    case 'syncing': return `Uploading ${pendingCount.value} change${pendingCount.value !== 1 ? 's' : ''}…`
    case 'pending': return `${pendingCount.value} change${pendingCount.value !== 1 ? 's' : ''} will sync when online`
    case 'offline': return 'All changes saved locally — will sync on reconnect'
    case 'error':   return 'Tap retry to attempt again'
  }
})

onMounted(() => {
  ordersStore.loadAll()
  materialsStore.loadAll()
})
</script>
