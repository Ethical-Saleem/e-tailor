<!-- app/pages/orders/new.vue -->
<template>
  <div class="animate-fade-in min-h-screen bg-cream">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center gap-3">
        <button class="header-action-btn" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <div>
          <h1 class="page-title">New Order</h1>
          <p class="page-subtitle">Step {{ step + 1 }} of {{ steps.length }} — {{ steps[step].label }}</p>
        </div>
      </div>
      <!-- Step progress -->
      <div class="flex gap-1.5 mt-4">
        <div
          v-for="(s, i) in steps"
          :key="i"
          :class="['flex-1 h-1 rounded-full transition-all duration-300', i <= step ? 'bg-gold' : 'bg-white/20']"
        />
      </div>
    </header>

    <div class="px-4 pt-5 pb-28">
      <Transition name="slide-up" mode="out-in">

        <!-- ── Step 0: Select Customer ─────────────────────────────────────── -->
        <div v-if="step === 0" key="customer">
          <h2 class="section-title mb-4">Who is this order for?</h2>

          <div class="search-bar mb-3">
            <Search :size="16" stroke-width="2" />
            <input v-model="customerSearch" placeholder="Search by name or phone…" />
          </div>

          <!-- New customer shortcut -->
          <button
            class="flex items-center gap-3 w-full card p-3.5 mb-3 text-left border-dashed hover:border-gold/40 transition-colors"
            @click="createNewCustomer = true"
          >
            <div class="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <UserPlus :size="18" stroke-width="1.8" class="stroke-gold" />
            </div>
            <div>
              <p class="text-sm font-semibold text-ink">New customer</p>
              <p class="text-xs text-ink-muted">Add and continue</p>
            </div>
          </button>

          <div v-if="isLoadingCustomers" class="space-y-2">
            <div v-for="i in 5" :key="i" class="h-16 skeleton rounded-xl" />
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="c in filteredCustomers"
              :key="c.id"
              :class="[
                'w-full flex items-center gap-3 card p-3.5 text-left transition-all duration-150',
                selectedCustomer?.id === c.id ? 'border-gold ring-2 ring-gold/20' : 'hover:shadow-card-md',
              ]"
              @click="selectCustomer(c)"
            >
              <div class="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <span class="font-display text-lg text-gold">{{ c.name.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">{{ c.name }}</p>
                <p class="text-xs text-ink-muted">{{ c.phone ?? c.email ?? 'No contact' }}</p>
              </div>
              <div v-if="c.totalOrders > 0" class="text-right flex-shrink-0">
                <p class="font-mono-dm text-xs text-gold">{{ c.totalOrders }} orders</p>
              </div>
              <CheckCircle2
                v-if="selectedCustomer?.id === c.id"
                :size="18" stroke-width="2"
                class="stroke-gold flex-shrink-0"
              />
            </button>
          </div>
        </div>

        <!-- ── Step 1: Order Items ─────────────────────────────────────────── -->
        <div v-else-if="step === 1" key="items">
          <h2 class="section-title mb-1">What are you making?</h2>
          <p class="text-sm text-ink-muted mb-4">Add the garments for this order</p>

          <div class="space-y-3 mb-4">
            <div
              v-for="(item, idx) in form.items"
              :key="idx"
              class="card p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-ink">Item {{ idx + 1 }}</p>
                <button
                  v-if="form.items.length > 1"
                  class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center"
                  @click="removeItem(idx)"
                >
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
              <div class="space-y-3">
                <div>
                  <label class="form-label">Garment name</label>
                  <input v-model="item.name" placeholder="e.g. Wedding Gown" class="form-input" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="form-label">Category</label>
                    <select v-model="item.category" class="form-input">
                      <option v-for="c in garmentCategories" :key="c.value" :value="c.value">{{ c.label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Qty</label>
                    <input v-model.number="item.quantity" type="number" min="1" class="form-input" />
                  </div>
                </div>
                <div>
                  <label class="form-label">Price per item ({{ auth.shop?.currencySymbol }})</label>
                  <input v-model.number="item.unitPrice" type="number" min="0" placeholder="0" class="form-input font-mono-dm" />
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn-outline btn-md btn-full mb-4" @click="addItem">
            <Plus :size="16" stroke-width="2" />
            Add another item
          </button>

          <!-- Pricing summary -->
          <div class="card p-4">
            <h3 class="text-sm font-semibold text-ink mb-3">Pricing</h3>
            <div class="space-y-2 mb-3">
              <div class="flex justify-between text-sm">
                <span class="text-ink-muted">Subtotal</span>
                <span class="font-mono-dm">{{ fmt(pricing.subtotal) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-ink-muted flex-1">Discount</span>
                <input v-model.number="form.discount" type="number" min="0" class="form-input w-24 text-right font-mono-dm py-1.5 text-sm" />
                <select v-model="form.discountType" class="form-input w-16 py-1.5 text-sm">
                  <option value="fixed">{{ auth.shop?.currencySymbol }}</option>
                  <option value="percent">%</option>
                </select>
              </div>
              <div class="flex justify-between text-sm border-t border-cream-dark pt-2">
                <span class="font-semibold text-ink">Total</span>
                <span class="font-mono-dm font-semibold text-ink text-base">{{ fmt(pricing.total) }}</span>
              </div>
            </div>
            <div>
              <label class="form-label">Deposit amount ({{ auth.shop?.currencySymbol }})</label>
              <input v-model.number="form.depositAmount" type="number" min="0" class="form-input font-mono-dm" />
              <p class="form-hint">Balance: {{ fmt(Math.max(0, pricing.total - form.depositAmount)) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Step 2: Measurements & Details ─────────────────────────────── -->
        <div v-else-if="step === 2" key="details">
          <h2 class="section-title mb-1">Measurements & Details</h2>
          <p class="text-sm text-ink-muted mb-4">Optional — attach measurements and notes</p>

          <!-- Measurement profile selector -->
          <div v-if="customerProfiles.length > 0" class="mb-4">
            <label class="form-label">Use existing measurement profile</label>
            <div class="space-y-2">
              <button
                v-for="p in customerProfiles"
                :key="p.id"
                :class="[
                  'w-full flex items-center gap-3 card p-3.5 text-left transition-all',
                  form.measurementProfileId === p.id ? 'border-gold ring-2 ring-gold/20' : '',
                ]"
                @click="form.measurementProfileId = form.measurementProfileId === p.id ? undefined : p.id"
              >
                <Ruler :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ p.label }}</p>
                  <p class="text-xs text-ink-muted">{{ p.category }} · {{ p.takenAt ?? 'No date' }}</p>
                </div>
                <CheckCircle2 v-if="form.measurementProfileId === p.id" :size="16" stroke-width="2" class="stroke-gold" />
              </button>
            </div>
          </div>
          <div v-else class="alert alert-info mb-4 text-xs">
            <Info :size="14" stroke-width="2" class="stroke-info flex-shrink-0" />
            No saved measurements for this customer. You can add them after creating the order.
          </div>

          <!-- Priority -->
          <div class="mb-4">
            <label class="form-label">Priority</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="p in priorities"
                :key="p.value"
                :class="['btn btn-outline btn-sm text-xs', form.priority === p.value ? 'bg-ink text-white border-ink' : '']"
                @click="form.priority = p.value"
              >
                {{ p.icon }} {{ p.label }}
              </button>
            </div>
          </div>

          <!-- Due date -->
          <div class="mb-4">
            <label class="form-label">Due date</label>
            <input v-model="form.dueDate" type="date" :min="today" class="form-input" />
          </div>

          <!-- Style notes -->
          <div class="mb-4">
            <label class="form-label">Style notes & instructions</label>
            <textarea
              v-model="form.styleNotes"
              rows="4"
              placeholder="Describe the style, design preferences, special instructions…"
              class="form-input resize-none"
            />
          </div>
        </div>

        <!-- ── Step 3: Review & Create ─────────────────────────────────────── -->
        <div v-else-if="step === 3" key="review">
          <h2 class="section-title mb-4">Review Order</h2>

          <!-- Customer -->
          <div class="card p-4 mb-3">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Customer</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <span class="font-display text-lg text-gold">{{ selectedCustomer?.name.charAt(0) }}</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-ink">{{ selectedCustomer?.name }}</p>
                <p class="text-xs text-ink-muted">{{ selectedCustomer?.phone }}</p>
              </div>
            </div>
          </div>

          <!-- Items -->
          <div class="card p-4 mb-3">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Items</p>
            <div class="space-y-2">
              <div v-for="item in form.items" :key="item.name" class="flex justify-between text-sm">
                <span class="text-ink">{{ item.quantity > 1 ? `${item.quantity}× ` : '' }}{{ item.name }}</span>
                <span class="font-mono-dm text-ink-muted">{{ fmt(item.quantity * item.unitPrice) }}</span>
              </div>
            </div>
            <div class="border-t border-cream-dark mt-3 pt-3 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span class="font-mono-dm text-ink">{{ fmt(pricing.total) }}</span>
            </div>
          </div>

          <!-- Details -->
          <div class="card p-4 mb-5">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Details</p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Priority</span>
                <span class="text-ink capitalize">{{ form.priority }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Due date</span>
                <span class="text-ink">{{ form.dueDate ? formatDate(form.dueDate) : 'Not set' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Deposit</span>
                <span class="font-mono-dm text-ink">{{ fmt(form.depositAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Balance due</span>
                <span class="font-mono-dm text-danger">{{ fmt(Math.max(0, pricing.total - form.depositAmount)) }}</span>
              </div>
            </div>
          </div>

          <div v-if="createError" class="alert alert-danger mb-4 text-xs">
            <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
            {{ createError }}
          </div>

          <button
            class="btn btn-gold btn-lg btn-full"
            :disabled="isCreating"
            @click="createOrder"
          >
            <Loader2 v-if="isCreating" :size="16" class="animate-spin" />
            <span>{{ isCreating ? 'Creating…' : 'Create Order' }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Bottom nav buttons -->
    <div class="fixed bottom-4 left-0 right-0 bg-surface border-t border-cream-dark px-4 py-3 pb-safe flex gap-3">
      <button v-if="step > 0" class="btn btn-outline btn-md flex-1" @click="step--">
        ← Back
      </button>
      <button
        v-if="step < steps.length - 1"
        class="btn btn-primary btn-md flex-1"
        :disabled="!canProceed"
        @click="nextStep"
      >
        Continue →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, Search, UserPlus, CheckCircle2, Plus, X,
  Ruler, Info, AlertCircle, Loader2,
} from 'lucide-vue-next'
import { useCustomers } from '~/composables/useCustomers'
import { useOrders } from '~/composables/useOrders'
import { useMeasurements } from '~/composables/useMeasurements'
import { useAuthStore } from '~/stores/auth'
import type { Customer, OrderItem, OrderPriority } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'plain' })
useHead({ title: 'New Order — eTailor' })

const auth   = useAuthStore()
const router = useRouter()

const { customers, isLoading: isLoadingCustomers, loadAll: loadCustomers } = useCustomers()
const { create: createOrderFn, calcPricing } = useOrders()
const { profiles: customerProfiles, loadForCustomer } = useMeasurements()

// ── Wizard state ──────────────────────────────────────────────────────────────
const step = ref(0)
const steps = [
  { label: 'Customer' },
  { label: 'Items & Pricing' },
  { label: 'Details' },
  { label: 'Review' },
]

const selectedCustomer  = ref<Customer | null>(null)
const customerSearch    = ref('')
const createNewCustomer = ref(false)
const createError       = ref('')
const isCreating        = ref(false)

const form = reactive({
  items: [{ name: '', category: 'dress', quantity: 1, unitPrice: 0 }] as Omit<OrderItem, "id">[],
  discount:             0,
  discountType:         'fixed' as 'fixed' | 'percent',
  depositAmount:        0,
  measurementProfileId: undefined as string | undefined,
  priority:             'normal' as OrderPriority,
  dueDate:              '',
  styleNotes:           '',
})

const today = dayjs().format('YYYY-MM-DD')

// ── Filtered customers ────────────────────────────────────────────────────────
const filteredCustomers = computed(() => {
  if (!customerSearch.value) return customers.value.slice(0, 20)
  const q = customerSearch.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone?.includes(q),
  )
})

// ── Pricing ───────────────────────────────────────────────────────────────────
const pricing = computed(() =>
  calcPricing(form.items, form.discount, form.discountType, auth.shop?.settings.taxRate ?? 0),
)

// ── Validation ────────────────────────────────────────────────────────────────
const canProceed = computed(() => {
  if (step.value === 0) return !!selectedCustomer.value
  if (step.value === 1) return form.items.every(i => i.name && i.unitPrice >= 0) && form.items.length > 0
  return true
})

// ── Actions ───────────────────────────────────────────────────────────────────
function selectCustomer(c: Customer) {
  selectedCustomer.value = c
}

async function nextStep() {
  if (step.value === 0 && selectedCustomer.value) {
    await loadForCustomer(selectedCustomer.value.id)
    // Set default deposit
    form.depositAmount = Math.round(pricing.value.total * ((auth.shop?.settings.defaultDepositPercent ?? 50) / 100))
  }
  step.value++
}

function addItem() {
  form.items.push({ name: '', category: 'dress', quantity: 1, unitPrice: 0 })
}

function removeItem(idx: number) {
  form.items.splice(idx, 1)
}

async function createOrder() {
  if (!selectedCustomer.value) return
  isCreating.value = true
  createError.value = ''
  try {
    const order = await createOrderFn({
      customerId:           selectedCustomer.value.id,
      items:                form.items,
      measurementProfileId: form.measurementProfileId,
      priority:             form.priority,
      dueDate:              form.dueDate || undefined,
      depositAmount:        form.depositAmount,
      discount:             form.discount,
      discountType:         form.discountType,
      styleNotes:           form.styleNotes || undefined,
    }, selectedCustomer.value.name)

    await router.replace(`/orders/${order.id}`)
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Failed to create order'
  } finally {
    isCreating.value = false
  }
}

function fmt(amount: number): string {
  return `${auth.shop?.currencySymbol}${amount.toLocaleString()}`
}

function formatDate(date: string): string {
  return dayjs(date).format('MMM D, YYYY')
}

const garmentCategories = [
  { value: 'dress',   label: 'Dress' },
  { value: 'gown',    label: 'Gown' },
  { value: 'suit',    label: 'Suit' },
  { value: 'shirt',   label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'skirt',   label: 'Skirt' },
  { value: 'blouse',  label: 'Blouse' },
  { value: 'jacket',  label: 'Jacket' },
  { value: 'abaya',   label: 'Abaya' },
  { value: 'ankara',  label: 'Ankara' },
  { value: 'asoebi',  label: 'Aso-oke / Asoebi' },
  { value: 'agbada',  label: 'Agbada' },
  { value: 'custom',  label: 'Custom' },
]

const priorities: { value: OrderPriority; label: string; icon: string}[] = [
  { value: 'low',    label: 'Low',    icon: '🔵' },
  { value: 'normal', label: 'Normal', icon: '⚪' },
  { value: 'high',   label: 'High',   icon: '🟡' },
  { value: 'urgent', label: 'Urgent', icon: '🔴' },
]

onMounted(() => loadCustomers())
</script>
