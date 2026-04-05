<!-- app/pages/store/index.vue -->
<template>
  <div class="animate-fade-in min-h-screen bg-cream">

    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Storefront</h1>
          <p class="page-subtitle">{{ stats.total }} items · {{ stats.ready }} ready to sell</p>
        </div>
        <button class="header-action-btn" @click="router.push('/store/new')">
          <Plus :size="18" stroke-width="2" class="stroke-white" />
        </button>
      </div>

      <!-- Stats strip -->
      <div class="grid grid-cols-4 gap-2 mt-4">
        <button
          v-for="s in statusTabs"
          :key="s.value"
          :class="['rounded-xl p-2.5 text-center transition-all',
            filterStatus === s.value
              ? 'bg-white/20 ring-1 ring-white/30'
              : 'bg-white/5']"
          @click="filterStatus = filterStatus === s.value ? 'all' : s.value"
        >
          <p class="font-mono-dm text-lg text-white font-light leading-none">
            {{ s.count }}
          </p>
          <p class="text-2xs text-white/50 mt-0.5 uppercase tracking-wide">{{ s.label }}</p>
        </button>
      </div>
    </header>

    <!-- ── Toolbar ── -->
    <div class="px-4 pt-4 pb-3 flex items-center gap-2">
      <div class="search-bar flex-1">
        <Search :size="16" stroke-width="2" />
        <input v-model="searchQuery" placeholder="Search items…" />
      </div>

      <!-- View toggle -->
      <div class="flex rounded-xl overflow-hidden border border-cream-dark bg-surface flex-shrink-0">
        <button
          :class="['w-9 h-9 flex items-center justify-center transition-colors',
            viewMode === 'list' ? 'bg-ink' : '']"
          @click="viewMode = 'list'"
        >
          <List :size="16" stroke-width="2"
                :class="viewMode === 'list' ? 'stroke-white' : 'stroke-ink-muted'" />
        </button>
        <button
          :class="['w-9 h-9 flex items-center justify-center transition-colors',
            viewMode === 'kanban' ? 'bg-ink' : '']"
          @click="viewMode = 'kanban'"
        >
          <LayoutGrid :size="16" stroke-width="2"
                      :class="viewMode === 'kanban' ? 'stroke-white' : 'stroke-ink-muted'" />
        </button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="isLoading" class="px-4 space-y-3">
      <div v-for="i in 5" :key="i" class="h-24 skeleton rounded-2xl" />
    </div>

    <template v-else>

      <!-- ══════════════════════════════════════
        LIST VIEW
      ══════════════════════════════════════ -->
      <div v-if="viewMode === 'list'" class="px-4 pb-28 space-y-2.5">
        <div v-if="filtered.length === 0" class="empty-state mt-12">
          <ShoppingBag :size="40" stroke-width="1" class="stroke-ink-muted/40 mx-auto mb-3" />
          <p class="text-sm text-ink-muted text-center">
            {{ searchQuery ? 'No items match your search' : 'No store items yet' }}
          </p>
          <button class="btn btn-gold btn-md mx-auto mt-4" @click="router.push('/store/new')">
            <Plus :size="16" stroke-width="2" />
            Create first item
          </button>
        </div>

        <NuxtLink
          v-for="item in filtered"
          :key="item.id"
          :to="`/store/${item.id}`"
          class="card p-4 flex items-start gap-3 hover:shadow-card-md transition-all active:scale-[0.99]"
        >
          <!-- Thumbnail / placeholder -->
          <div class="w-14 h-14 rounded-xl bg-gold/10 border border-gold/20 flex items-center
                      justify-center flex-shrink-0 overflow-hidden">
            <img
              v-if="item.designImages.length > 0"
              :src="item.designImages[0]"
              :alt="item.title"
              class="w-full h-full object-cover"
            />
            <Shirt v-else :size="22" stroke-width="1.5" class="stroke-gold" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <p class="text-sm font-semibold text-ink truncate">{{ item.title }}</p>
              <span :class="['badge badge-sm flex-shrink-0', storeStatusBadgeClass(item.status)]">
                {{ STORE_ITEM_STATUS_LABELS[item.status] }}
              </span>
            </div>
            <p class="text-xs text-ink-muted capitalize mb-2">
              {{ item.category }}
              <template v-if="item.sizeLabel"> · {{ item.sizeLabel }}</template>
            </p>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xs text-ink-muted">
                  Cost <span class="font-mono-dm text-ink">{{ fmt(item.costPrice) }}</span>
                </span>
                <span v-if="item.sellingPrice > 0" class="text-xs text-ink-muted">
                  Price <span class="font-mono-dm text-gold font-semibold">{{ fmt(item.sellingPrice) }}</span>
                </span>
              </div>
              <span v-if="item.sellingPrice > 0 && item.costPrice > 0"
                    :class="['text-xs font-semibold font-mono-dm',
                      marginPercent(item) >= 30 ? 'text-success' :
                      marginPercent(item) >= 15 ? 'text-warning' : 'text-danger']">
                {{ marginPercent(item).toFixed(0) }}% margin
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- ══════════════════════════════════════
        KANBAN VIEW
      ══════════════════════════════════════ -->
      <div v-else class="pb-28">
        <!-- Horizontal scroll container -->
        <div class="flex gap-3 px-4 overflow-x-auto snap-x snap-mandatory pb-2
                    scrollbar-hide">
          <div
            v-for="col in kanbanColumns"
            :key="col.status"
            class="flex-shrink-0 w-[72vw] max-w-xs snap-start"
          >
            <!-- Column header -->
            <div class="flex items-center justify-between mb-2.5 px-0.5">
              <div class="flex items-center gap-2">
                <div :class="['w-2 h-2 rounded-full', col.dotClass]" />
                <p class="text-xs font-semibold text-ink">{{ col.label }}</p>
              </div>
              <span class="text-xs font-mono-dm text-ink-muted">{{ col.items.length }}</span>
            </div>

            <!-- Cards -->
            <div class="space-y-2.5">
              <NuxtLink
                v-for="item in col.items"
                :key="item.id"
                :to="`/store/${item.id}`"
                class="card p-3.5 block hover:shadow-card-md transition-all"
              >
                <!-- Thumbnail row -->
                <div class="flex items-center gap-2.5 mb-2.5">
                  <div class="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center
                              justify-center flex-shrink-0 overflow-hidden">
                    <img v-if="item.designImages.length > 0" :src="item.designImages[0]"
                         :alt="item.title" class="w-full h-full object-cover" />
                    <Shirt v-else :size="16" stroke-width="1.5" class="stroke-gold" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-ink truncate leading-tight">{{ item.title }}</p>
                    <p class="text-xs text-ink-muted capitalize">{{ item.category }}</p>
                  </div>
                </div>

                <!-- Pricing -->
                <div class="flex items-center justify-between">
                  <p class="text-sm font-mono-dm text-gold font-semibold">
                    {{ fmt(item.sellingPrice) }}
                  </p>
                  <span
                    v-if="item.sellingPrice > 0 && item.costPrice > 0"
                    :class="['text-xs font-mono-dm font-semibold',
                      marginPercent(item) >= 30 ? 'text-success' :
                      marginPercent(item) >= 15 ? 'text-warning' : 'text-danger']"
                  >
                    {{ marginPercent(item).toFixed(0) }}%
                  </span>
                </div>

                <!-- Materials count chip -->
                <div v-if="item.materialUsage.length > 0"
                     class="mt-2 flex items-center gap-1">
                  <Layers :size="11" stroke-width="2" class="stroke-ink-muted" />
                  <span class="text-2xs text-ink-muted">
                    {{ item.materialUsage.length }} material{{ item.materialUsage.length > 1 ? 's' : '' }}
                  </span>
                </div>
              </NuxtLink>

              <!-- Empty column placeholder -->
              <div v-if="col.items.length === 0"
                   class="rounded-2xl border-2 border-dashed border-cream-dark p-4 text-center">
                <p class="text-xs text-ink-muted">No items</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- FAB -->
    <button
      class="fixed bottom-24 right-4 w-14 h-14 rounded-2xl bg-ink shadow-lg flex items-center
             justify-center z-10 active:scale-95 transition-transform"
      @click="router.push('/store/new')"
    >
      <Plus :size="22" stroke-width="2" class="stroke-white" />
    </button>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Search, List, LayoutGrid, ShoppingBag, Shirt, Layers,
} from 'lucide-vue-next'
import { useStoreItems, STORE_ITEM_STATUS_LABELS, STORE_STATUS_FLOW } from '~/composables/useStoreItems'
import { useAuthStore } from '~/stores/auth'
import type { StoreItemStatus, StoreItem } from '~/types/models'

definePageMeta({ layout: 'default' })
useHead({ title: 'Storefront — eTailor' })

const router = useRouter()
const auth   = useAuthStore()
const {
  items, filtered, stats, isLoading,
  filterStatus, searchQuery, loadAll,
} = useStoreItems()

const viewMode = ref<'list' | 'kanban'>('list')

// ── Status tabs (header strip) ────────────────────────────────────────────────
const statusTabs = computed(() => [
  { value: 'in_production' as StoreItemStatus, label: 'Making', count: stats.value.inProduction },
  { value: 'ready'         as StoreItemStatus, label: 'Ready',  count: stats.value.ready },
  { value: 'draft'         as StoreItemStatus, label: 'Draft',  count: stats.value.draft },
  { value: 'sold'          as StoreItemStatus, label: 'Sold',   count: stats.value.sold },
])

// ── Kanban columns ────────────────────────────────────────────────────────────
const kanbanColumns = computed(() => [
  {
    status:   'draft'         as StoreItemStatus,
    label:    'Draft',
    dotClass: 'bg-ink-muted/40',
    items:    items.value.filter(i => i.status === 'draft'),
  },
  {
    status:   'in_production' as StoreItemStatus,
    label:    'In production',
    dotClass: 'bg-info',
    items:    items.value.filter(i => i.status === 'in_production'),
  },
  {
    status:   'ready'         as StoreItemStatus,
    label:    'Ready',
    dotClass: 'bg-success',
    items:    items.value.filter(i => i.status === 'ready'),
  },
  {
    status:   'sold'          as StoreItemStatus,
    label:    'Sold',
    dotClass: 'bg-gold',
    items:    items.value.filter(i => i.status === 'sold'),
  },
])

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `${auth.shop?.currencySymbol ?? ''}${n.toLocaleString()}`
}

function marginPercent(item: StoreItem): number {
  if (!item.sellingPrice || item.sellingPrice <= 0) return 0
  return ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
}

function storeStatusBadgeClass(status: StoreItemStatus): string {
  switch (status) {
    case 'draft':         return 'badge-pending'
    case 'in_production': return 'badge-cutting'
    case 'ready':         return 'badge-ready'
    case 'sold':          return 'badge-delivered'
    case 'archived':      return 'badge-cancelled'
    default:              return ''
  }
}

onMounted(loadAll)
</script>
