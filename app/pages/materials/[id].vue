<!-- app/pages/materials/[id].vue -->
<template>
  <div class="animate-fade-in">

    <!-- ── LOADING ── -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <Loader2 :size="32" class="animate-spin stroke-gold" />
    </div>

    <!-- ── NOT FOUND ── -->
    <div v-else-if="!material" class="empty-state min-h-screen">
      <div class="empty-state-icon">
        <Package :size="28" stroke-width="1.5" class="stroke-ink-muted" />
      </div>
      <p class="empty-state-title">Material not found</p>
      <p class="empty-state-desc">This item may have been deleted.</p>
      <NuxtLink to="/materials" class="btn btn-primary btn-md mt-4">Back to Materials</NuxtLink>
    </div>

    <!-- ── MAIN ── -->
    <template v-else>

      <!-- Header -->
      <header class="page-header">
        <div class="flex items-start gap-3">
          <button class="header-action-btn flex-shrink-0" @click="$router.back()">
            <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="page-title leading-tight truncate">{{ material.name }}</h1>
            <p class="page-subtitle capitalize mt-0.5">
              {{ material.category }}
              <span v-if="material.color"> · {{ material.color }}</span>
              <span v-if="material.sku" class="font-mono-dm"> · {{ material.sku }}</span>
            </p>
          </div>
          <button class="header-action-btn flex-shrink-0" @click="openEdit">
            <Pencil :size="17" stroke-width="1.8" class="stroke-white/70" />
          </button>
        </div>

        <!-- Stock + value strip -->
        <div class="flex gap-3 mt-5">
          <div class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
            <p :class="['font-mono-dm text-3xl font-medium leading-none mb-1', stockColor]">
              {{ material.currentStock }}
            </p>
            <p class="text-2xs text-white/40 uppercase tracking-wider">
              {{ material.unit }}s in stock
            </p>
          </div>
          <div class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
            <p class="font-mono-dm text-xl font-medium text-white leading-none mb-1">
              {{ fmt(material?.currentStock * material?.currentUnitCost) }}
            </p>
            <p class="text-2xs text-white/40 uppercase tracking-wider">Stock value</p>
          </div>
        </div>

        <!-- Stock level bar -->
        <div class="mt-3">
          <div class="flex justify-between text-2xs text-white/40 mb-1.5">
            <span>{{ stockStatusLabel }}</span>
            <span>Min: {{ material.minimumStock }} {{ material.unit }}s</span>
          </div>
          <div class="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-700', stockBarColor]"
              :style="{ width: stockBarWidth }"
            />
          </div>
        </div>
      </header>

      <div class="px-4 pt-4 pb-28 space-y-4">

        <!-- ── Quick action: Stock In ── -->
        <button
          class="w-full card flex items-center gap-3.5 px-4 py-3.5 hover:shadow-card-md transition-all group"
          @click="stockInDrawer = true"
        >
          <div class="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <PackagePlus :size="18" stroke-width="1.8" class="stroke-success" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-ink">Record Stock In</p>
            <p class="text-xs text-ink-muted">Add a new purchase with price & supplier</p>
          </div>
          <ChevronRight :size="16" stroke-width="2" class="stroke-ink-subtle group-hover:stroke-ink-muted transition-colors" />
        </button>

        <!-- ── Low stock alert ── -->
        <div v-if="isLowStock" class="alert alert-warning">
          <AlertTriangle :size="16" stroke-width="2" class="stroke-warning flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-xs font-semibold text-ink">
              {{ material.currentStock === 0 ? 'Out of stock' : 'Running low' }}
            </p>
            <p class="text-xs text-ink-muted">
              {{ material.currentStock === 0
                ? 'No stock remaining — add a purchase to restock.'
                : `Only ${material.currentStock} ${material.unit}s left. Minimum is ${material.minimumStock}.` }}
            </p>
          </div>
        </div>

        <!-- ── Cost summary ── -->
        <div class="card divide-y divide-cream-dark">
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-ink-muted">Current unit cost</span>
            <span class="font-mono-dm text-sm font-medium text-ink">
              {{ fmt(material?.currentUnitCost) }} / {{ material?.unit }}
            </span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-ink-muted">Average unit cost</span>
            <span class="font-mono-dm text-sm text-ink-muted">
              {{ fmt(material?.averageUnitCost) }} / {{ material?.unit }}
            </span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-ink-muted">Total stock value</span>
            <span class="font-mono-dm text-sm font-semibold text-ink">
              {{ fmt(material?.currentStock * material?.currentUnitCost) }}
            </span>
          </div>
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm text-ink-muted">Min. stock threshold</span>
            <span class="font-mono-dm text-sm text-ink">
              {{ material.minimumStock }} {{ material.unit }}s
            </span>
          </div>
        </div>

        <!-- ── Description ── -->
        <div v-if="material.description" class="card p-4">
          <p class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Description</p>
          <p class="text-sm text-ink leading-relaxed">{{ material.description }}</p>
        </div>

        <!-- ── Price history chart + table ── -->
        <div class="card">
          <div class="px-4 pt-4 pb-0 flex items-center justify-between">
            <p class="text-sm font-semibold text-ink">Price History</p>
            <span class="text-2xs text-ink-muted font-mono-dm">{{ priceHistory.length }} purchases</span>
          </div>

          <!-- Sparkline -->
          <div v-if="priceHistory.length >= 2" class="px-4 pt-3 pb-0">
            <svg width="100%" height="56" :viewBox="`0 0 ${sparkW} 56`" preserveAspectRatio="none">
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path :d="sparkAreaPath" fill="url(#priceGrad)" />
              <path :d="sparkLinePath" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle
                v-if="sparkPoints.length"
                :cx="sparkPoints[sparkPoints.length-1].x"
                :cy="sparkPoints[sparkPoints.length-1].y"
                r="4"
                fill="#c9a84c"
              />
            </svg>
            <!-- Min/max labels -->
            <div class="flex justify-between text-2xs text-ink-muted font-mono-dm mt-1 mb-2">
              <span>{{ fmt(sparkMin) }}</span>
              <span class="text-gold">{{ fmt(sparkMax) }}</span>
            </div>
          </div>

          <!-- Purchase list -->
          <div v-if="priceHistory.length > 0" class="divide-y divide-cream-dark">
            <div
              v-for="(entry, i) in priceHistory"
              :key="entry.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <!-- Index indicator -->
              <div
                :class="[
                  'w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-bold flex-shrink-0',
                  i === 0 ? 'bg-gold/15 text-gold' : 'bg-cream-dark text-ink-muted',
                ]"
              >
                {{ priceHistory.length - i }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-mono-dm text-sm font-medium text-ink">
                    {{ fmt(entry.unitCost) }}/{{ material.unit }}
                  </p>
                  <!-- Price change arrow vs previous -->
                  <span
                    v-if="i < priceHistory.length - 1"
                    :class="[
                      'text-2xs font-semibold',
                      entry.unitCost > priceHistory[i+1].unitCost ? 'text-danger' : 'text-success',
                    ]"
                  >
                    {{ entry.unitCost > priceHistory[i+1].unitCost ? '↑' : '↓' }}
                    {{ Math.abs(((entry.unitCost - priceHistory[i+1].unitCost) / priceHistory[i+1].unitCost) * 100).toFixed(0) }}%
                  </span>
                  <span v-if="i === 0" class="badge badge-ready text-2xs py-0.5">Latest</span>
                </div>
                <p class="text-xs text-ink-muted">
                  {{ entry.quantityPurchased }} {{ material.unit }}s
                  <span v-if="entry.supplier"> · {{ entry.supplier }}</span>
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs text-ink-muted">{{ formatDate(entry.purchaseDate) }}</p>
                <p class="font-mono-dm text-xs text-ink-muted">{{ fmt(entry.totalCost) }}</p>
              </div>
            </div>
          </div>

          <div v-else class="px-4 py-8 text-center">
            <p class="text-sm text-ink-muted">No purchase history yet.</p>
            <button class="btn btn-outline btn-sm mt-3" @click="stockInDrawer = true">
              Add first purchase
            </button>
          </div>
        </div>

        <!-- ── Manual stock adjustment ── -->
        <div class="card p-4">
          <p class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Manual Stock Adjustment</p>
          <p class="text-xs text-ink-muted mb-3 leading-relaxed">
            Use this to correct the stock level without recording a purchase — e.g. after a stocktake or to account for wastage.
          </p>
          <div class="flex items-center gap-2">
            <input
              v-model.number="adjustQty"
              type="number"
              min="0"
              step="0.5"
              :placeholder="`Current: ${material.currentStock}`"
              class="form-input flex-1 font-mono-dm"
            />
            <span class="text-sm text-ink-muted flex-shrink-0">{{ material.unit }}s</span>
            <button
              class="btn btn-outline btn-md flex-shrink-0"
              :disabled="adjustQty === null || adjustQty < 0 || isAdjusting"
              @click="applyAdjustment"
            >
              <Loader2 v-if="isAdjusting" :size="14" class="animate-spin" />
              <span v-else>Set</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Sticky delete footer -->
      <div class="fixed bottom-[76px] left-0 right-0 px-4 pb-2 pointer-events-none z-30">
        <button
          class="pointer-events-auto w-full btn btn-danger btn-md flex items-center justify-center gap-2 shadow-card-lg"
          @click="confirmDeleteOpen = true"
        >
          <Trash2 :size="16" stroke-width="1.8" />
          Delete Material
        </button>
      </div>

    </template>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- STOCK IN DRAWER                                             -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="stockInDrawer" class="overlay" @click.self="stockInDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[90vh]">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Record Purchase</h3>
                <p class="text-sm text-ink-muted">{{ material?.name }}</p>
              </div>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center" @click="stockInDrawer = false">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Quantity ({{ material?.unit }}s)</label>
                  <input
                    v-model.number="stockForm.quantity"
                    type="number" min="0" step="0.5"
                    class="form-input font-mono-dm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label class="form-label">Unit cost ({{ auth.currencySymbol }})</label>
                  <input
                    v-model.number="stockForm.unitCost"
                    type="number" min="0"
                    class="form-input font-mono-dm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <!-- Total cost preview -->
              <div
                v-if="stockForm.quantity > 0 && stockForm.unitCost > 0"
                class="bg-cream rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p class="text-xs text-ink-muted">Total purchase cost</p>
                  <p class="font-mono-dm text-lg font-semibold text-ink mt-0.5">
                    {{ fmt(stockForm.quantity * stockForm.unitCost) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-ink-muted">New stock level</p>
                  <p class="font-mono-dm text-lg font-semibold text-success mt-0.5">
                    {{ (material?.currentStock ?? 0) + stockForm.quantity }}
                    <span class="text-sm font-normal text-ink-muted">{{ material?.unit }}s</span>
                  </p>
                </div>
              </div>

              <div>
                <label class="form-label">Supplier (optional)</label>
                <input
                  v-model="stockForm.supplier"
                  class="form-input"
                  placeholder="e.g. Balogun Market, Alhaji Fabrics"
                />
              </div>

              <div>
                <label class="form-label">Purchase date</label>
                <input v-model="stockForm.purchaseDate" type="date" class="form-input" />
              </div>

              <div>
                <label class="form-label">Notes (optional)</label>
                <input
                  v-model="stockForm.notes"
                  class="form-input"
                  placeholder="e.g. Batch No. 4, slightly different shade"
                />
              </div>

              <p v-if="stockInError" class="form-error text-xs">{{ stockInError }}</p>

              <button
                class="btn btn-gold btn-lg btn-full"
                :disabled="isStockingIn || stockForm.quantity <= 0"
                @click="submitStockIn"
              >
                <Loader2 v-if="isStockingIn" :size="16" class="animate-spin" />
                <span>{{ isStockingIn ? 'Recording…' : `Add ${stockForm.quantity || 0} ${material?.unit}s` }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- EDIT DRAWER                                                  -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="editDrawer" class="overlay" @click.self="editDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[90vh]">
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-display text-2xl text-ink">Edit Material</h3>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center" @click="editDrawer = false">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="form-label">Name <span class="text-danger">*</span></label>
                <input v-model="editForm.name" class="form-input" :class="{ 'form-input-error': editErrors.name }" />
                <p v-if="editErrors.name" class="form-error">{{ editErrors.name }}</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Category</label>
                  <select v-model="editForm.category" class="form-input">
                    <option v-for="c in materialCategories" :key="c.value" :value="c.value">
                      {{ c.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Unit</label>
                  <select v-model="editForm.unit" class="form-input">
                    <option v-for="u in materialUnits" :key="u.value" :value="u.value">
                      {{ u.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Color</label>
                  <input v-model="editForm.color" placeholder="e.g. Ivory, Navy" class="form-input" />
                </div>
                <div>
                  <label class="form-label">SKU / Code</label>
                  <input v-model="editForm.sku" placeholder="Optional" class="form-input" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Min. stock alert</label>
                  <input v-model.number="editForm.minimumStock" type="number" min="0" class="form-input font-mono-dm" />
                </div>
              </div>

              <div>
                <label class="form-label">Description</label>
                <textarea v-model="editForm.description" rows="2" class="form-input resize-none" placeholder="Optional notes about this material…" />
              </div>

              <p v-if="editErrors.general" class="form-error text-xs">{{ editErrors.general }}</p>

              <button class="btn btn-gold btn-lg btn-full" :disabled="isEditSaving" @click="saveEdit">
                <Loader2 v-if="isEditSaving" :size="16" class="animate-spin" />
                <span>{{ isEditSaving ? 'Saving…' : 'Save Changes' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM DRAWER                                        -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="confirmDeleteOpen" class="overlay" @click.self="confirmDeleteOpen = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6">
            <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
              <Trash2 :size="24" stroke-width="1.5" class="stroke-danger" />
            </div>
            <h3 class="font-display text-2xl text-ink mb-2">Delete this material?</h3>
            <p class="text-sm text-ink-muted leading-relaxed mb-1">
              <strong class="text-ink">{{ material?.name }}</strong> and all its purchase history will be permanently removed.
            </p>
            <p class="text-sm text-ink-muted leading-relaxed mb-6">
              This will not affect existing orders that have already used this material. This cannot be undone.
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button class="btn btn-outline btn-lg" :disabled="isDeleting" @click="confirmDeleteOpen = false">
                Cancel
              </button>
              <button class="btn btn-danger btn-lg" :disabled="isDeleting" @click="executeDelete">
                <Loader2 v-if="isDeleting" :size="16" class="animate-spin" />
                <span>{{ isDeleting ? 'Deleting…' : 'Yes, delete' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, Pencil, Package, PackagePlus, ChevronRight,
  AlertTriangle, Trash2, Loader2, X,
} from 'lucide-vue-next'
import { useMaterials } from '~/composables/useMaterials'
import { useAuthStore } from '~/stores/auth'
import { useUIStore }   from '~/stores/ui'
import type { Material, MaterialPriceEntry } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })

const nuxtRoute = useRoute()
const router    = useRouter()
const auth      = useAuthStore()
const ui        = useUIStore()
const { getById, getPriceHistory, update, recordPurchase, adjustStock, remove } = useMaterials()

// ── Page state ─────────────────────────────────────────────────────────────────
const isLoading       = ref(true)
const material        = ref<Material | null>(null)
const priceHistory    = ref<MaterialPriceEntry[]>([])

// Drawers
const stockInDrawer   = ref(false)
const editDrawer      = ref(false)
const confirmDeleteOpen = ref(false)
const isStockingIn    = ref(false)
const isEditSaving    = ref(false)
const isDeleting      = ref(false)
const isAdjusting     = ref(false)
const stockInError    = ref('')

// Manual adjustment
const adjustQty = ref<number | null>(null)

// ── Stock form ─────────────────────────────────────────────────────────────────
const stockForm = reactive({
  quantity:     0,
  unitCost:     0,
  supplier:     '',
  purchaseDate: dayjs().format('YYYY-MM-DD'),
  notes:        '',
})

// ── Edit form ──────────────────────────────────────────────────────────────────
const editForm = reactive({
  name:         '',
  category:     'fabric' as Material['category'],
  unit:         'yard'   as Material['unit'],
  color:        '',
  sku:          '',
  description:  '',
  minimumStock: 0,
})
const editErrors = reactive({ name: '', general: '' })

// ── Stock display computed ─────────────────────────────────────────────────────
const isLowStock = computed(() =>
  material.value
    ? material.value.currentStock <= material.value.minimumStock && material.value.minimumStock > 0
    : false,
)

const stockColor = computed(() => {
  if (!material.value) return 'text-white'
  if (material.value.currentStock === 0) return 'text-danger'
  if (isLowStock.value) return 'text-warning'
  return 'text-success'
})

const stockBarColor = computed(() => {
  if (!material.value) return 'bg-success'
  if (material.value.currentStock === 0) return 'bg-danger'
  if (isLowStock.value) return 'bg-warning'
  return 'bg-success'
})

const stockBarWidth = computed(() => {
  if (!material.value || material.value.minimumStock === 0) return '80%'
  const pct = (material.value.currentStock / (material.value.minimumStock * 3)) * 100
  return `${Math.min(100, Math.max(2, pct))}%`
})

const stockStatusLabel = computed(() => {
  if (!material.value) return ''
  if (material.value.currentStock === 0) return 'Out of stock'
  if (isLowStock.value) return 'Low stock — reorder soon'
  return 'In stock'
})

// ── Price history sparkline ────────────────────────────────────────────────────
const sparkW = 320

const sparkPoints = computed(() => {
  const pts = [...priceHistory.value].reverse() // oldest first
  if (pts.length < 2) return []
  const costs = pts.map(p => p.unitCost)
  const min   = Math.min(...costs)
  const max   = Math.max(...costs)
  const range = max - min || 1
  return pts.map((p, i) => ({
    x: (i / (pts.length - 1)) * (sparkW - 10) + 5,
    y: 44 - ((p.unitCost - min) / range) * 36 + 4,
  }))
})

const sparkMin = computed(() =>
  priceHistory.value.length ? Math.min(...priceHistory.value.map(p => p.unitCost)) : 0,
)
const sparkMax = computed(() =>
  priceHistory.value.length ? Math.max(...priceHistory.value.map(p => p.unitCost)) : 0,
)

const sparkLinePath = computed(() => {
  const pts = sparkPoints.value
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2
    d += ` C ${cpx} ${pts[i-1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  return d
})

const sparkAreaPath = computed(() => {
  if (!sparkLinePath.value) return ''
  const pts = sparkPoints.value
  const last = pts[pts.length - 1]
  return `${sparkLinePath.value} L ${last.x} 52 L ${pts[0].x} 52 Z`
})

// ── Actions ────────────────────────────────────────────────────────────────────
async function submitStockIn() {
  stockInError.value = ''
  if (stockForm.quantity <= 0) { stockInError.value = 'Quantity must be greater than 0'; return }
  if (!material.value) return

  isStockingIn.value = true
  try {
    await recordPurchase({
      materialId:        material.value.id,
      unitCost:          stockForm.unitCost,
      quantityPurchased: stockForm.quantity,
      supplier:          stockForm.supplier || undefined,
      purchaseDate:      stockForm.purchaseDate,
      notes:             stockForm.notes || undefined,
    })
    // Refresh
    await load()
    stockInDrawer.value = false
    stockForm.quantity  = 0
    stockForm.unitCost  = 0
    stockForm.supplier  = ''
    stockForm.notes     = ''
    ui.success(`Added ${stockForm.quantity || 0} ${material.value.unit}s`)
  } catch (err) {
    stockInError.value = err instanceof Error ? err.message : 'Failed to record purchase'
  } finally {
    isStockingIn.value = false
  }
}

function openEdit() {
  if (!material.value) return
  editErrors.name    = ''
  editErrors.general = ''
  editForm.name         = material.value.name
  editForm.category     = material.value.category
  editForm.unit         = material.value.unit
  editForm.color        = material.value.color ?? ''
  editForm.sku          = material.value.sku ?? ''
  editForm.description  = material.value.description ?? ''
  editForm.minimumStock = material.value.minimumStock
  editDrawer.value = true
}

async function saveEdit() {
  editErrors.name    = ''
  editErrors.general = ''
  if (!editForm.name.trim()) { editErrors.name = 'Name is required'; return }
  if (!material.value) return

  isEditSaving.value = true
  try {
    const updated = await update(material.value.id, {
      name:         editForm.name.trim(),
      category:     editForm.category,
      unit:         editForm.unit,
      color:        editForm.color || undefined,
      sku:          editForm.sku || undefined,
      description:  editForm.description || undefined,
      minimumStock: editForm.minimumStock,
    })
    material.value   = updated
    editDrawer.value = false
    ui.success('Material updated')
    useHead({ title: `${updated.name} — eTailor` })
  } catch (err) {
    editErrors.general = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isEditSaving.value = false
  }
}

async function applyAdjustment() {
  if (adjustQty.value === null || adjustQty.value < 0 || !material.value) return
  isAdjusting.value = true
  try {
    await adjustStock(material.value.id, adjustQty.value)
    await load()
    adjustQty.value = null
    ui.success(`Stock set to ${adjustQty.value} ${material.value.unit}s`)
  } catch (err) {
    ui.error(err instanceof Error ? err.message : 'Adjustment failed')
  } finally {
    isAdjusting.value = false
  }
}

async function executeDelete() {
  if (!material.value) return
  isDeleting.value = true
  try {
    await remove(material.value.id)
    ui.success('Material deleted')
    await router.replace('/materials')
  } catch (err) {
    ui.error(err instanceof Error ? err.message : 'Failed to delete')
    isDeleting.value = false
    confirmDeleteOpen.value = false
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  const id = nuxtRoute.params.id as string
  const [m, history] = await Promise.all([
    getById(id),
    getPriceHistory(id),
  ])

  if (!m) { material.value = null; isLoading.value = false; return }

  console.log("materials:", m)
  console.log("history:", history)

  material.value     = m
  priceHistory.value = history
  useHead({ title: `${m.name} — eTailor` })
  isLoading.value = false
}

// ── Reference data ─────────────────────────────────────────────────────────────
const materialCategories = [
  { value: 'fabric',      label: 'Fabric' },
  { value: 'lace',        label: 'Lace' },
  { value: 'thread',      label: 'Thread' },
  { value: 'lining',      label: 'Lining' },
  { value: 'button',      label: 'Buttons' },
  { value: 'zipper',      label: 'Zippers' },
  { value: 'trim',        label: 'Trims' },
  { value: 'interlining', label: 'Interlining' },
  { value: 'tool',        label: 'Tools' },
  { value: 'other',       label: 'Other' },
]

const materialUnits = [
  { value: 'yard',  label: 'Yards' },
  { value: 'meter', label: 'Metres' },
  { value: 'piece', label: 'Pieces' },
  { value: 'spool', label: 'Spools' },
  { value: 'roll',  label: 'Rolls' },
  { value: 'kg',    label: 'Kilograms' },
  { value: 'pack',  label: 'Packs' },
  { value: 'set',   label: 'Sets' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { 
  if (!n) {
    return `${auth.currencySymbol}${0}`
  }
  return `${auth.currencySymbol}${n.toLocaleString()}`
 }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }

onMounted(load)
</script>
