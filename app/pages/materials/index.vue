<!-- app/pages/materials/index.vue -->
<template>
  <div class="animate-fade-in">
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="page-title">Materials</h1>
          <p class="page-subtitle">{{ materials.length }} items · {{ fmt(totalValue) }} value</p>
        </div>
        <button class="header-action-btn" @click="addDrawer = true">
          <Plus :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24">
      <!-- Low stock alert -->
      <div v-if="lowStock.length > 0" class="alert alert-warning mb-4">
        <AlertTriangle :size="16" stroke-width="2" class="stroke-warning flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-xs font-semibold text-ink">
            {{ lowStock.length }} item{{ lowStock.length > 1 ? 's' : '' }} running low
          </p>
          <p class="text-xs text-ink-muted">{{ lowStock.map(m => m.name).join(', ') }}</p>
        </div>
      </div>

      <!-- Inventory value card -->
      <div class="card-ink p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1">Inventory Value</p>
            <p class="font-display text-3xl text-white font-light">{{ fmt(totalValue) }}</p>
          </div>
          <div class="text-right">
            <p class="font-mono-dm text-lg text-gold">{{ materials.length }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide">Total Items</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div v-for="cat in topCategories" :key="cat.name" class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ cat.count }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">{{ cat.name }}</p>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar mb-3">
        <Search :size="16" stroke-width="2" />
        <input v-model="searchQuery" placeholder="Search materials…" />
      </div>

      <!-- Category chips -->
      <div class="chips mb-4">
        <button
          v-for="cat in categoryChips"
          :key="cat.value"
          :class="['chip', filterCategory === cat.value ? 'chip-active' : 'chip-inactive']"
          @click="filterCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Materials list -->
      <div v-if="isLoading" class="space-y-2.5">
        <div v-for="i in 5" :key="i" class="h-28 skeleton rounded-xl" />
      </div>

      <div v-else-if="filtered.length === 0" class="empty-state py-10">
        <div class="empty-state-icon"><Package :size="28" stroke-width="1.5" class="stroke-ink-muted" /></div>
        <p class="empty-state-title text-xl">No materials yet</p>
        <p class="empty-state-desc">Add fabrics, threads, and other materials to track your inventory</p>
        <button class="btn btn-primary btn-md mt-4" @click="addDrawer = true">Add Material</button>
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="m in filtered"
          :key="m.id"
          class="card p-4 cursor-pointer hover:shadow-card-md transition-all duration-150"
          @click="selectedMaterial = m; detailDrawer = true"
        >
          <!-- Top row -->
          <div class="flex items-start justify-between mb-2.5">
            <div class="min-w-0 flex-1 pr-2">
              <p class="text-sm font-semibold text-ink">{{ m.name }}</p>
              <p class="text-2xs text-ink-muted uppercase tracking-wider font-medium mt-0.5">
                {{ m.category }} {{ m.color ? `· ${m.color}` : '' }}
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p :class="['font-mono-dm text-lg font-medium', stockClass(m)]">
                {{ m.currentStock }}
              </p>
              <p class="text-2xs text-ink-muted">{{ m.unit }}{{ m.currentStock !== 1 ? 's' : '' }}</p>
            </div>
          </div>

          <!-- Price and stock badge row -->
          <div class="flex items-center justify-between mb-2">
            <p class="font-mono-dm text-xs text-ink-muted">
              {{ m.currentUnitCost > 0 ? `${fmt(m.currentUnitCost)}/${m.unit}` : 'No price set' }}
            </p>
            <span v-if="m.currentStock <= m.minimumStock && m.minimumStock > 0" :class="[
              'badge text-2xs py-0.5',
              m.currentStock === 0 ? 'badge-cancelled' : 'badge-pending'
            ]">
              {{ m.currentStock === 0 ? 'Out of stock' : 'Low stock' }}
            </span>
            <span v-else class="badge badge-ready text-2xs py-0.5">In Stock</span>
          </div>

          <!-- Stock bar -->
          <div class="stock-bar-track">
            <div
              :class="['stock-bar-fill', stockBarClass(m)]"
              :style="{ width: `${Math.min(100, m.minimumStock > 0 ? (m.currentStock / (m.minimumStock * 3)) * 100 : 80)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Add Material Drawer ── -->
    <Transition name="fade">
      <div v-if="addDrawer" class="overlay" @click.self="addDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[85vh]">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0 pr-3">
                <h3 class="font-display text-2xl text-ink mb-1">Add Material</h3>
                <p class="text-sm text-ink-muted mb-5">Add to your inventory</p>
              </div>
              <div class="flex-shrink-0">
                <button
                  class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                  @click="addDrawer = false"
                >
                  <X :size="16" stroke-width="2" class="stroke-ink-muted" />
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="form-label">Name</label>
                <input v-model="addForm.name" placeholder="e.g. French Lace Ivory" class="form-input" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Category</label>
                  <select v-model="addForm.category" class="form-input">
                    <option v-for="c in materialCategories" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Unit</label>
                  <select v-model="addForm.unit" class="form-input">
                    <option v-for="u in materialUnits" :key="u.value" :value="u.value">{{ u.label }}</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Color</label>
                  <input v-model="addForm.color" placeholder="e.g. Ivory, Navy" class="form-input" />
                </div>
                <div>
                  <label class="form-label">SKU / Code</label>
                  <input v-model="addForm.sku" placeholder="Optional" class="form-input" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Opening stock</label>
                  <input v-model.number="addForm.currentStock" type="number" min="0" class="form-input font-mono-dm" />
                </div>
                <div>
                  <label class="form-label">Min. stock (alert)</label>
                  <input v-model.number="addForm.minimumStock" type="number" min="0" class="form-input font-mono-dm" />
                </div>
              </div>
              <!-- Initial purchase price -->
              <div class="bg-cream rounded-xl p-3">
                <p class="form-label mb-2">Initial cost price (optional)</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="form-label text-2xs">Unit cost ({{ auth.shop?.currencySymbol }})</label>
                    <input v-model.number="addForm.unitCost" type="number" min="0" class="form-input font-mono-dm" />
                  </div>
                  <div>
                    <label class="form-label text-2xs">Supplier</label>
                    <input v-model="addForm.supplier" placeholder="Optional" class="form-input" />
                  </div>
                </div>
              </div>

              <p v-if="addError" class="form-error">{{ addError }}</p>

              <button class="btn btn-gold btn-lg btn-full" :disabled="isAdding" @click="submitAdd">
                <Loader2 v-if="isAdding" :size="16" class="animate-spin" />
                <span>{{ isAdding ? 'Adding…' : 'Add Material' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Material Detail / Stock-In Drawer ── -->
    <Transition name="fade">
      <div v-if="detailDrawer && selectedMaterial" class="overlay" @click.self="detailDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[85vh]">
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0 pr-3">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-display text-2xl text-ink">{{ selectedMaterial.name }}</h3>
                    <p class="text-sm text-ink-muted capitalize">{{ selectedMaterial.category }} · {{ selectedMaterial.color }}</p>
                  </div>
                  <p :class="['font-mono-dm text-2xl font-medium', stockClass(selectedMaterial)]">
                    {{ selectedMaterial.currentStock }} <span class="text-sm text-ink-muted font-normal">{{ selectedMaterial.unit }}s</span>
                  </p>
                </div>
              </div>
              <div class="flex-shrink-0">
                <button
                  class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                  @click="detailDrawer = false"
                >
                  <X :size="16" stroke-width="2" class="stroke-ink-muted" />
                </button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="tabs mb-4">
              <button :class="['tab', detailTab === 'overview' ? 'active' : '']" @click="detailTab = 'overview'">Overview</button>
              <button :class="['tab', detailTab === 'stockin' ? 'active' : '']" @click="detailTab = 'stockin'">Stock In</button>
              <button :class="['tab', detailTab === 'history' ? 'active' : '']" @click="detailTab = 'history'; loadPriceHistory()">History</button>
            </div>

            <!-- Overview -->
            <div v-if="detailTab === 'overview'" class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-cream rounded-xl p-3 text-center">
                  <p class="font-mono-dm text-lg text-ink">{{ fmt(selectedMaterial.currentUnitCost) }}</p>
                  <p class="text-2xs text-ink-muted uppercase tracking-wide">Current cost/{{ selectedMaterial.unit }}</p>
                </div>
                <div class="bg-cream rounded-xl p-3 text-center">
                  <p class="font-mono-dm text-lg text-ink">{{ fmt(selectedMaterial.averageUnitCost) }}</p>
                  <p class="text-2xs text-ink-muted uppercase tracking-wide">Avg cost/{{ selectedMaterial.unit }}</p>
                </div>
              </div>
              <div class="bg-cream rounded-xl p-3">
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Total value</span>
                  <span class="font-mono-dm font-medium text-ink">{{ fmt(selectedMaterial.currentStock * selectedMaterial.currentUnitCost) }}</span>
                </div>
                <div class="flex justify-between text-sm mt-1.5">
                  <span class="text-ink-muted">Min. stock alert</span>
                  <span class="font-mono-dm text-ink">{{ selectedMaterial.minimumStock }} {{ selectedMaterial.unit }}s</span>
                </div>
              </div>
            </div>

            <!-- Stock In -->
            <div v-else-if="detailTab === 'stockin'" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Quantity ({{ selectedMaterial.unit }}s)</label>
                  <input v-model.number="stockForm.quantity" type="number" min="0" step="0.5" class="form-input font-mono-dm" />
                </div>
                <div>
                  <label class="form-label">Unit cost ({{ auth.shop?.currencySymbol }})</label>
                  <input v-model.number="stockForm.unitCost" type="number" min="0" class="form-input font-mono-dm" />
                </div>
              </div>
              <div>
                <label class="form-label">Supplier</label>
                <input v-model="stockForm.supplier" placeholder="Optional" class="form-input" />
              </div>
              <div>
                <label class="form-label">Purchase date</label>
                <input v-model="stockForm.purchaseDate" type="date" class="form-input" />
              </div>
              <div v-if="stockForm.quantity > 0 && stockForm.unitCost > 0" class="bg-cream rounded-xl p-3">
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Total cost</span>
                  <span class="font-mono-dm font-semibold text-ink">{{ fmt(stockForm.quantity * stockForm.unitCost) }}</span>
                </div>
                <div class="flex justify-between text-sm mt-1.5">
                  <span class="text-ink-muted">New stock level</span>
                  <span class="font-mono-dm text-success">{{ selectedMaterial.currentStock + stockForm.quantity }} {{ selectedMaterial.unit }}s</span>
                </div>
              </div>
              <button class="btn btn-gold btn-lg btn-full" :disabled="isStockingIn" @click="submitStockIn">
                <Loader2 v-if="isStockingIn" :size="16" class="animate-spin" />
                <span>{{ isStockingIn ? 'Recording…' : 'Record Stock In' }}</span>
              </button>
            </div>

            <!-- Price History -->
            <div v-else-if="detailTab === 'history'">
              <div v-if="priceHistory.length > 0">
                <!-- Sparkline -->
                <div class="bg-cream rounded-xl p-3 mb-3">
                  <p class="text-2xs text-ink-muted uppercase tracking-wide font-semibold mb-2">Price trend</p>
                  <svg width="100%" height="50" viewBox="0 0 300 50" class="overflow-visible">
                    <polyline
                      :points="sparklinePoints"
                      fill="none"
                      stroke="#c9a84c"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <circle
                      v-if="priceHistory.length > 0"
                      :cx="300"
                      :cy="sparklineLastY"
                      r="4"
                      fill="#c9a84c"
                    />
                  </svg>
                </div>
                <!-- List -->
                <div class="space-y-2">
                  <div v-for="entry in priceHistory" :key="entry.id" class="flex items-center justify-between p-3 bg-cream rounded-xl">
                    <div>
                      <p class="text-sm font-medium text-ink">{{ fmt(entry.unitCost) }}/{{ selectedMaterial.unit }}</p>
                      <p class="text-xs text-ink-muted">{{ entry.quantityPurchased }} {{ selectedMaterial.unit }}s · {{ entry.supplier ?? 'Unknown supplier' }}</p>
                    </div>
                    <p class="text-xs font-mono-dm text-ink-muted">{{ formatDate(entry.purchaseDate) }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-6">
                <p class="text-sm text-ink-muted">No purchase history yet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, AlertTriangle, Package, Loader2 } from 'lucide-vue-next'
import { useMaterials } from '~/composables/useMaterials'
import { useAuthStore } from '~/stores/auth'
import type { Material, MaterialPriceEntry } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
useHead({ title: 'Materials — eTailor' })

const auth = useAuthStore()
const {
  materials, filtered, lowStock, totalValue, isLoading,
  filterCategory, searchQuery, loadAll, create, recordPurchase, getPriceHistory,
} = useMaterials()

const addDrawer    = ref(false)
const detailDrawer = ref(false)
const selectedMaterial = ref<Material | null>(null)
const detailTab    = ref<'overview' | 'stockin' | 'history'>('overview')
const priceHistory = ref<MaterialPriceEntry[]>([])
const isAdding     = ref(false)
const isStockingIn = ref(false)
const addError     = ref('')

const addForm = reactive({
  name: '', category: 'fabric', unit: 'yard', color: '', sku: '',
  currentStock: 0, minimumStock: 0, unitCost: 0, supplier: '',
})

const stockForm = reactive({
  quantity: 0, unitCost: 0, supplier: '', purchaseDate: dayjs().format('YYYY-MM-DD'),
})

const topCategories = computed(() => {
  const counts: Record<string, number> = {}
  materials.value.forEach(m => { counts[m.category] = (counts[m.category] ?? 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
})

const categoryChips = [
  { value: 'all',         label: 'All' },
  { value: 'fabric',      label: 'Fabric' },
  { value: 'lace',        label: 'Lace' },
  { value: 'thread',      label: 'Thread' },
  { value: 'lining',      label: 'Lining' },
  { value: 'button',      label: 'Buttons' },
  { value: 'tool',        label: 'Tools' },
]

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

function stockClass(m: Material): string {
  if (m.currentStock === 0)             return 'text-danger'
  if (m.currentStock <= m.minimumStock) return 'text-warning'
  return 'text-ink'
}

function stockBarClass(m: Material): string {
  if (m.currentStock === 0)             return 'stock-bar-low'
  if (m.currentStock <= m.minimumStock) return 'stock-bar-medium'
  return 'stock-bar-ok'
}

const sparklinePoints = computed(() => {
  if (priceHistory.value.length === 0) return ''
  const pts = [...priceHistory.value].reverse()
  const costs = pts.map(p => p.unitCost)
  const min = Math.min(...costs)
  const max = Math.max(...costs)
  const range = max - min || 1
  return pts.map((p, i) => {
    const x = (i / Math.max(pts.length - 1, 1)) * 300
    const y = 50 - ((p.unitCost - min) / range) * 40
    return `${x},${y}`
  }).join(' ')
})

const sparklineLastY = computed(() => {
  if (priceHistory.value.length === 0) return 25
  const costs = priceHistory.value.map(p => p.unitCost)
  const min = Math.min(...costs)
  const max = Math.max(...costs)
  const range = max - min || 1
  const last = priceHistory.value[0].unitCost
  return 50 - ((last - min) / range) * 40
})

async function submitAdd() {
  if (!addForm.name) { addError.value = 'Name is required'; return }
  isAdding.value = true
  try {
    const m = await create({
      name: addForm.name, category: addForm.category as Material['category'],
      unit: addForm.unit as Material['unit'], color: addForm.color || undefined,
      sku: addForm.sku || undefined, currentStock: addForm.currentStock,
      minimumStock: addForm.minimumStock,
    })
    if (addForm.unitCost > 0) {
      await recordPurchase({
        materialId: m.id, unitCost: addForm.unitCost,
        quantityPurchased: addForm.currentStock,
        supplier: addForm.supplier || undefined,
        purchaseDate: dayjs().format('YYYY-MM-DD'),
      })
    }
    addDrawer.value = false
    Object.assign(addForm, { name: '', color: '', sku: '', currentStock: 0, minimumStock: 0, unitCost: 0, supplier: '' })
  } catch (err) {
    addError.value = err instanceof Error ? err.message : 'Failed to add material'
  } finally {
    isAdding.value = false
  }
}

async function submitStockIn() {
  if (!selectedMaterial.value || stockForm.quantity <= 0) return
  isStockingIn.value = true
  try {
    await recordPurchase({
      materialId: selectedMaterial.value.id,
      unitCost: stockForm.unitCost,
      quantityPurchased: stockForm.quantity,
      supplier: stockForm.supplier || undefined,
      purchaseDate: stockForm.purchaseDate,
    })
    // Refresh selected material
    const { getDb } = await import('~/db/schema')
    selectedMaterial.value = await getDb().materials.get(selectedMaterial.value.id) ?? selectedMaterial.value
    detailTab.value = 'overview'
    stockForm.quantity = 0
    stockForm.unitCost = 0
  } finally {
    isStockingIn.value = false
  }
}

async function loadPriceHistory() {
  if (!selectedMaterial.value) return
  priceHistory.value = await getPriceHistory(selectedMaterial.value.id)
}

function fmt(n: number) { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }

onMounted(() => loadAll())
</script>
