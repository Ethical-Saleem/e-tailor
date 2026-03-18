<!-- app/pages/customers/[id].vue -->
<template>
  <div v-if="customer" class="animate-fade-in">
    <header class="page-header">
      <div class="flex items-center gap-3 mb-4">
        <button class="header-action-btn" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <h1 class="page-title flex-1 truncate">{{ customer.name }}</h1>
        <button class="header-action-btn" @click="editDrawer = true">
          <Pencil :size="16" stroke-width="1.8" class="stroke-white/70" />
        </button>
      </div>

      <!-- Customer stats -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-white/5 rounded-xl p-2.5 text-center">
          <p class="font-mono-dm text-xl text-white">{{ customer.totalOrders }}</p>
          <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Orders</p>
        </div>
        <div class="bg-white/5 rounded-xl p-2.5 text-center">
          <p class="font-mono-dm text-lg text-white">{{ fmt(customer.totalSpend) }}</p>
          <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Total Spend</p>
        </div>
        <div class="bg-white/5 rounded-xl p-2.5 text-center">
          <p :class="['font-mono-dm text-xl', customer.outstandingBalance > 0 ? 'text-warning' : 'text-success']">
            {{ fmt(customer.outstandingBalance) }}
          </p>
          <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Balance</p>
        </div>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24 space-y-4">

      <!-- Contact info -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Contact</p>
        <div class="space-y-2.5">
          <a v-if="customer.phone" :href="`tel:${customer.phone}`" class="flex items-center gap-3 text-sm text-ink">
            <Phone :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
            {{ customer.phone }}
          </a>
          <a v-if="customer.email" :href="`mailto:${customer.email}`" class="flex items-center gap-3 text-sm text-ink">
            <Mail :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
            {{ customer.email }}
          </a>
          <div v-if="customer.address" class="flex items-start gap-3 text-sm text-ink">
            <MapPin :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0 mt-0.5" />
            {{ customer.address }}
          </div>
          <!-- Tags -->
          <div v-if="customer.tags.length > 0" class="flex gap-1.5 flex-wrap pt-1">
            <span
              v-for="tag in customer.tags"
              :key="tag"
              class="text-xs bg-cream-dark text-ink-muted px-2.5 py-1 rounded-full capitalize font-medium"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-3 gap-2">
        <NuxtLink
          :to="`/orders/new?customerId=${customer.id}`"
          class="btn btn-primary btn-md flex-col gap-1 py-3 h-auto"
        >
          <FilePlus :size="18" stroke-width="1.8" />
          <span class="text-xs">New Order</span>
        </NuxtLink>
        <button class="btn btn-outline btn-md flex-col gap-1 py-3 h-auto" @click="addMeasDrawer = true">
          <Ruler :size="18" stroke-width="1.8" />
          <span class="text-xs">Measure</span>
        </button>
        <a
          v-if="customer.phone"
          :href="`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=Hello ${customer.name}`"
          target="_blank"
          class="btn btn-outline btn-md flex-col gap-1 py-3 h-auto"
        >
          <MessageSquare :size="18" stroke-width="1.8" />
          <span class="text-xs">WhatsApp</span>
        </a>
      </div>

      <!-- Measurement Profiles -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Measurements</h2>
          <button class="section-link" @click="addMeasDrawer = true">+ Add</button>
        </div>

        <div v-if="profiles.length === 0" class="card p-6 text-center">
          <Ruler :size="24" stroke-width="1.5" class="stroke-ink-muted mx-auto mb-2" />
          <p class="text-sm text-ink-muted">No measurements saved yet</p>
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="p in profiles"
            :key="p.id"
            class="card p-4 cursor-pointer hover:shadow-card-md transition-all"
            @click="selectedProfile = p; profileDrawer = true"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <p class="text-sm font-semibold text-ink">{{ p.label }}</p>
                <p class="text-xs text-ink-muted capitalize">{{ p.category }} · {{ p.unit }} · {{ p.takenAt ?? formatDate(p.createdAt) }}</p>
              </div>
              <span v-if="p.isTemplate" class="badge badge-ready text-2xs py-0.5">Template</span>
            </div>
            <!-- Key measurements preview -->
            <div class="grid grid-cols-3 gap-x-4 gap-y-1">
              <div
                v-for="([key, val]) in Object.entries(p.measurements).slice(0, 6)"
                :key="key"
                class="flex justify-between"
              >
                <span class="text-2xs text-ink-muted capitalize">{{ key.replace('_', ' ') }}</span>
                <span class="font-mono-dm text-2xs text-ink">{{ val }}"</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Order History -->
      <section>
        <div class="section-header">
          <h2 class="section-title">Order History</h2>
          <span class="text-xs text-ink-muted font-mono-dm">{{ orders.length }} total</span>
        </div>

        <div v-if="orders.length === 0" class="card p-6 text-center">
          <ClipboardList :size="24" stroke-width="1.5" class="stroke-ink-muted mx-auto mb-2" />
          <p class="text-sm text-ink-muted">No orders yet</p>
        </div>

        <div v-else class="space-y-2.5">
          <OrderCard
            v-for="o in orders"
            :key="o.id"
            :order="o"
            @click="$router.push(`/orders/${o.id}`)"
          />
        </div>
      </section>

      <!-- Notes -->
      <div v-if="customer.notes" class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Notes</p>
        <p class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ customer.notes }}</p>
      </div>
    </div>

    <!-- ── Profile detail drawer ── -->
    <Transition name="fade">
      <div v-if="profileDrawer && selectedProfile" class="overlay" @click.self="profileDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6">
            <div class="flex items-end justify-end">
              <div class="flex-shrink-0">
                <button
                  class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                  @click="profileDrawer = false"
                >
                  <X :size="16" stroke-width="2" class="stroke-ink-muted" />
                </button>
              </div>
            </div>
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="font-display text-2xl text-ink">{{ selectedProfile.label }}</h3>
                <p class="text-sm text-ink-muted capitalize">{{ selectedProfile.category }}</p>
              </div>
              <span class="text-xs text-ink-muted">{{ selectedProfile.unit }}</span>
            </div>
            <div class="divide-y divide-cream-dark">
              <div
                v-for="([key, val]) in Object.entries(selectedProfile.measurements)"
                :key="key"
                class="measure-row"
              >
                <span class="measure-key capitalize">{{ key.replace('_', ' ') }}</span>
                <span class="measure-val">{{ val }}"</span>
              </div>
            </div>
            <p v-if="selectedProfile.notes" class="text-sm text-ink-muted mt-4 leading-relaxed">
              {{ selectedProfile.notes }}
            </p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Add measurement drawer ── -->
    <Transition name="fade">
      <div v-if="addMeasDrawer" class="overlay" @click.self="addMeasDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[88vh]">
            <div class="flex items-start justify-betweem mb-3">
              <div class="flex-1 min-w-0 pr-3">
                <h3 class="font-display text-2xl text-ink mb-1">New Measurements</h3>
                <p class="text-sm text-ink-muted mb-5">for {{ customer.name }}</p>
              </div>
              <div class="flex-shrink-0">
                <button
                  class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                  @click="addMeasDrawer = false"
                >
                  <X :size="16" stroke-width="2" class="stroke-ink-muted" />
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <label class="form-label">Profile label</label>
                <input v-model="measForm.label" placeholder='e.g. "Wedding Gown 2025"' class="form-input" />
              </div>
              <div>
                <label class="form-label">Garment category</label>
                <select v-model="measForm.category" class="form-input" @change="initMeasFields">
                  <option v-for="c in garmentCategories" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </div>

              <!-- Dynamic measurement fields -->
              <div>
                <p class="form-label">Measurements</p>
                <div class="grid grid-cols-2 gap-x-4 gap-y-3 bg-cream rounded-xl p-3">
                  <div v-for="field in measFields" :key="field" class="flex items-center gap-2">
                    <label class="text-xs text-ink-muted capitalize flex-1">{{ field.replace('_', ' ') }}</label>
                    <input
                      v-model.number="measForm.measurements[field]"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      class="w-16 text-right border border-cream-dark rounded-lg px-2 py-1.5 text-xs font-mono-dm bg-surface focus:border-gold outline-none"
                    />
                    <span class="text-2xs text-ink-muted">"</span>
                  </div>
                </div>
              </div>

              <div>
                <label class="form-label">Notes (optional)</label>
                <textarea v-model="measForm.notes" rows="2" class="form-input resize-none" placeholder="Additional notes…" />
              </div>

              <div class="flex items-center gap-3">
                <input id="isTemplate" v-model="measForm.isTemplate" type="checkbox" class="w-4 h-4 accent-gold" />
                <label for="isTemplate" class="text-sm text-ink-muted cursor-pointer">Save as reusable template</label>
              </div>

              <button class="btn btn-gold btn-lg btn-full" :disabled="isSavingMeas" @click="saveMeasurement">
                <Loader2 v-if="isSavingMeas" :size="16" class="animate-spin" />
                <span>{{ isSavingMeas ? 'Saving…' : 'Save Measurements' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <div v-else class="flex items-center justify-center min-h-screen">
    <Loader2 :size="32" class="animate-spin stroke-gold" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, Pencil, Phone, Mail, MapPin, FilePlus, Ruler,
  MessageSquare, ClipboardList, Loader2,
} from 'lucide-vue-next'
import { useCustomers } from '~/composables/useCustomers'
import { useMeasurements, measurementSchema } from '~/composables/useMeasurements'
import { getDb } from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import { useAuthStore } from '~/stores/auth'
import type { Customer, MeasurementProfile, Order, GarmentCategory } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })

const route  = useRoute()
const auth   = useAuthStore()
const { getWithDetails } = useCustomers()
const { create: createProfile, profiles, loadForCustomer } = useMeasurements()

const customer       = ref<Customer | null>(null)
const orders         = ref<Order[]>([])
const editDrawer     = ref(false)
const profileDrawer  = ref(false)
const addMeasDrawer  = ref(false)
const selectedProfile = ref<MeasurementProfile | null>(null)
const isSavingMeas   = ref(false)

const measForm = reactive({
  label:        '',
  category:     'dress' as GarmentCategory,
  measurements: {} as Record<string, number>,
  notes:        '',
  isTemplate:   false,
})

const measFields = computed(() => MEASUREMENT_FIELDS[measForm.category] ?? [])

function initMeasFields() {
  measForm.measurements = {}
  for (const f of measFields.value) {
    measForm.measurements[f] = 0
  }
}

async function saveMeasurement() {
  if (!customer.value) return
  isSavingMeas.value = true
  try {
    await createProfile({
      customerId:   customer.value.id,
      label:        measForm.label || `${measForm.category} - ${dayjs().format('MMM YYYY')}`,
      category:     measForm.category,
      measurements: measForm.measurements,
      notes:        measForm.notes || undefined,
      isTemplate:   measForm.isTemplate,
    })
    addMeasDrawer.value = false
    measForm.label = ''
    measForm.measurements = {}
    measForm.notes = ''
    measForm.isTemplate = false
    await loadForCustomer(customer.value.id)
  } finally {
    isSavingMeas.value = false
  }
}

async function load() {
  const id   = route.params.id as string
  const data = await getWithDetails(id)
  if (!data) { await navigateTo('/customers'); return }
  customer.value = data.customer
  orders.value   = data.orders as unknown as Order[]
  await loadForCustomer(id)
  useHead({ title: `${data.customer.name} — eTailor` })
}

const garmentCategories = [
  { value: 'dress',   label: 'Dress' },   { value: 'gown',    label: 'Gown' },
  { value: 'suit',    label: 'Suit' },    { value: 'shirt',   label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' }, { value: 'skirt',   label: 'Skirt' },
  { value: 'blouse',  label: 'Blouse' },  { value: 'jacket',  label: 'Jacket' },
  { value: 'abaya',   label: 'Abaya' },   { value: 'ankara',  label: 'Ankara' },
  { value: 'asoebi',  label: 'Asoebi' },  { value: 'agbada',  label: 'Agbada' },
  { value: 'custom',  label: 'Custom' },
]

function fmt(n: number) { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }

onMounted(() => { load(); initMeasFields() })
</script>
