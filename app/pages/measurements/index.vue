<!-- app/pages/measurements/index.vue -->
<template>
  <div class="animate-fade-in">
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="page-title">Measurements</h1>
          <p class="page-subtitle">{{ totalProfiles }} profiles · {{ templates.length }} templates</p>
        </div>
        <button class="header-action-btn" @click="addDrawer = true">
          <Plus :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24">

      <!-- Tabs: Templates vs All Profiles -->
      <div class="tabs mb-4">
        <button :class="['tab', activeTab === 'templates' ? 'active' : '']" @click="activeTab = 'templates'">
          Templates
        </button>
        <button :class="['tab', activeTab === 'all' ? 'active' : '']" @click="activeTab = 'all'">
          All Profiles
        </button>
      </div>

      <!-- ── TEMPLATES TAB ── -->
      <template v-if="activeTab === 'templates'">
        <p class="text-xs text-ink-muted leading-relaxed mb-4">
          Templates are reusable measurement sets you can quickly apply to any order. Great for standard sizes or frequently made garments.
        </p>

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

        <div v-if="isLoading" class="space-y-2.5">
          <div v-for="i in 4" :key="i" class="h-28 skeleton rounded-xl" />
        </div>

        <div v-else-if="filteredTemplates.length === 0" class="empty-state py-12">
          <div class="empty-state-icon">
            <Ruler :size="28" stroke-width="1.5" class="stroke-ink-muted" />
          </div>
          <p class="empty-state-title">No templates yet</p>
          <p class="empty-state-desc">Create reusable measurement templates for garment types you make often</p>
          <button class="btn btn-primary btn-md mt-4" @click="addDrawer = true; newForm.isTemplate = true">
            Create Template
          </button>
        </div>

        <div v-else class="space-y-2.5">
          <MeasurementProfileCard
            v-for="p in filteredTemplates"
            :key="p.id"
            :profile="p"
            @click="openDetail(p)"
            @delete="confirmDelete(p)"
          />
        </div>
      </template>

      <!-- ── ALL PROFILES TAB ── -->
      <template v-else>
        <!-- Search -->
        <div class="search-bar mb-4">
          <Search :size="16" stroke-width="2" />
          <input v-model="searchQuery" placeholder="Search by label, customer, category…" />
          <button v-if="searchQuery" @click="searchQuery = ''" class="text-ink-muted">
            <X :size="14" stroke-width="2" />
          </button>
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

        <div v-if="isLoading" class="space-y-2.5">
          <div v-for="i in 6" :key="i" class="h-28 skeleton rounded-xl" />
        </div>

        <div v-else-if="filteredAll.length === 0" class="empty-state py-12">
          <div class="empty-state-icon">
            <Ruler :size="28" stroke-width="1.5" class="stroke-ink-muted" />
          </div>
          <p class="empty-state-title">No profiles found</p>
          <p class="empty-state-desc">Measurement profiles are created from a customer's page or when creating an order</p>
        </div>

        <!-- Grouped by customer -->
        <div v-else>
          <template v-for="group in groupedByCustomer" :key="group.customerId">
            <div class="flex items-center gap-2 my-3">
              <NuxtLink
                :to="`/customers/${group.customerId}`"
                class="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div class="w-6 h-6 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <span class="font-display text-xs text-gold">{{ group.customerName.charAt(0) }}</span>
                </div>
                <span class="font-display text-base text-gold font-medium">{{ group.customerName }}</span>
              </NuxtLink>
              <div class="flex-1 h-px bg-cream-dark" />
              <span class="text-2xs text-ink-muted font-mono-dm">{{ group.profiles.length }}</span>
            </div>
            <div class="space-y-2.5 mb-2">
              <MeasurementProfileCard
                v-for="p in group.profiles"
                :key="p.id"
                :profile="p"
                @click="openDetail(p)"
                @delete="confirmDelete(p)"
              />
            </div>
          </template>
        </div>
      </template>

    </div>

    <!-- ── Add / Create Profile Drawer ── -->
    <Transition name="fade">
      <div v-if="addDrawer" class="overlay" @click.self="closeAddDrawer">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[90vh]">

            <!-- Header -->
            <div class="flex items-start justify-between mb-1">
              <div>
                <h3 class="font-display text-2xl text-ink">
                  {{ newForm.isTemplate ? 'New Template' : 'New Measurement Profile' }}
                </h3>
                <p class="text-sm text-ink-muted mt-0.5">
                  {{ newForm.isTemplate ? 'Reusable across any customer' : 'Saved to a specific customer' }}
                </p>
              </div>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0 mt-0.5"
                @click="closeAddDrawer"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <div class="space-y-4 mt-5">

              <!-- Template toggle -->
              <div class="flex items-center justify-between bg-cream rounded-xl p-3">
                <div>
                  <p class="text-sm font-medium text-ink">Save as template</p>
                  <p class="text-xs text-ink-muted">Reusable for any customer or order</p>
                </div>
                <button
                  :class="[
                    'w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0',
                    newForm.isTemplate ? 'bg-gold' : 'bg-cream-deeper'
                  ]"
                  @click="newForm.isTemplate = !newForm.isTemplate"
                >
                  <div :class="[
                    'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-200 shadow-card-sm',
                    newForm.isTemplate ? 'left-[22px]' : 'left-0.5'
                  ]" />
                </button>
              </div>

              <!-- Customer selector (only if not a template) -->
              <div v-if="!newForm.isTemplate">
                <label class="form-label">Customer <span class="text-danger">*</span></label>
                <div class="search-bar">
                  <Search :size="14" stroke-width="2" />
                  <input
                    v-model="customerSearch"
                    placeholder="Search customer…"
                    @focus="showCustomerList = true"
                  />
                </div>
                <!-- Customer dropdown -->
                <div v-if="showCustomerList && filteredCustomers.length > 0" class="mt-1 card max-h-44 overflow-y-auto">
                  <button
                    v-for="c in filteredCustomers"
                    :key="c.id"
                    class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream transition-colors border-b border-cream-dark last:border-b-0"
                    @click="selectCustomer(c)"
                  >
                    <div class="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <span class="font-display text-sm text-gold">{{ c.name.charAt(0) }}</span>
                    </div>
                    <span class="text-sm text-ink">{{ c.name }}</span>
                  </button>
                </div>
                <p v-if="newFormErrors.customerId" class="form-error">{{ newFormErrors.customerId }}</p>
              </div>

              <!-- Label -->
              <div>
                <label class="form-label">Label</label>
                <input
                  v-model="newForm.label"
                  :placeholder="newForm.isTemplate ? 'e.g. Men\'s Suit Standard' : 'e.g. Wedding Gown Jan 2025'"
                  class="form-input"
                />
                <p class="form-hint">Leave blank to auto-generate from category + date</p>
              </div>

              <!-- Category -->
              <div>
                <label class="form-label">Garment category <span class="text-danger">*</span></label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="cat in garmentCategories"
                    :key="cat.value"
                    :class="[
                      'border rounded-xl py-2.5 px-2 text-center text-xs font-medium transition-all duration-150',
                      newForm.category === cat.value
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-ink-muted border-cream-dark hover:border-ink-muted'
                    ]"
                    @click="newForm.category = cat.value; initFields()"
                  >
                    <span class="block text-base mb-0.5">{{ cat.icon }}</span>
                    {{ cat.label }}
                  </button>
                </div>
              </div>

              <!-- Unit -->
              <div>
                <label class="form-label">Measurement unit</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="u in ['inches', 'cm']"
                    :key="u"
                    :class="['btn btn-outline btn-sm', newForm.unit === u ? 'bg-ink text-white border-ink' : '']"
                    @click="newForm.unit = u"
                  >
                    {{ u === 'inches' ? '📏 Inches' : '📐 Centimetres' }}
                  </button>
                </div>
              </div>

              <!-- Measurement fields -->
              <div v-if="currentFields.length > 0">
                <label class="form-label">Measurements ({{ newForm.unit }})</label>
                <div class="bg-cream rounded-xl p-3 space-y-2">
                  <div
                    v-for="field in currentFields"
                    :key="field"
                    class="flex items-center gap-3"
                  >
                    <label class="text-xs text-ink-muted capitalize flex-1 min-w-0 truncate">
                      {{ field.replace(/_/g, ' ') }}
                    </label>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        v-model.number="newForm.measurements[field]"
                        type="number"
                        min="0"
                        step="0.25"
                        placeholder="0"
                        class="w-16 text-right border border-cream-dark rounded-lg px-2 py-1.5 text-xs font-mono-dm bg-surface focus:border-gold outline-none"
                      />
                      <span class="text-2xs text-ink-muted w-4">{{ newForm.unit === 'inches' ? '"' : 'cm' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Custom fields -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="form-label mb-0">Custom measurements</label>
                  <button class="text-xs text-gold font-medium" @click="addCustomField">+ Add field</button>
                </div>
                <div v-if="newForm.customFields.length > 0" class="bg-cream rounded-xl p-3 space-y-2">
                  <div v-for="(cf, idx) in newForm.customFields" :key="idx" class="flex items-center gap-2">
                    <input
                      v-model="cf.key"
                      placeholder="Field name"
                      class="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-xs bg-surface focus:border-gold outline-none"
                    />
                    <input
                      v-model.number="cf.value"
                      type="number"
                      min="0"
                      step="0.25"
                      placeholder="0"
                      class="w-16 text-right border border-cream-dark rounded-lg px-2 py-1.5 text-xs font-mono-dm bg-surface focus:border-gold outline-none"
                    />
                    <span class="text-2xs text-ink-muted">{{ newForm.unit === 'inches' ? '"' : 'cm' }}</span>
                    <button class="text-danger flex-shrink-0" @click="removeCustomField(idx)">
                      <X :size="14" stroke-width="2" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="form-label">Notes (optional)</label>
                <textarea
                  v-model="newForm.notes"
                  rows="2"
                  placeholder="Posture notes, fitting preferences, alterations needed…"
                  class="form-input resize-none"
                />
              </div>

              <!-- Taken by / date -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Taken by</label>
                  <input v-model="newForm.takenBy" placeholder="Your name" class="form-input" />
                </div>
                <div>
                  <label class="form-label">Date taken</label>
                  <input v-model="newForm.takenAt" type="date" class="form-input" />
                </div>
              </div>

              <p v-if="saveError" class="form-error">{{ saveError }}</p>

              <button class="btn btn-gold btn-lg btn-full" :disabled="isSaving" @click="saveProfile">
                <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
                <span>{{ isSaving ? 'Saving…' : newForm.isTemplate ? 'Save Template' : 'Save Profile' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Profile Detail Drawer ── -->
    <Transition name="fade">
      <div v-if="detailDrawer && selectedProfile" class="overlay" @click.self="detailDrawer = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6 overflow-y-auto max-h-[90vh]">

            <!-- Header -->
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1 min-w-0 pr-3">
                <h3 class="font-display text-2xl text-ink leading-tight">{{ selectedProfile.label }}</h3>
                <p class="text-sm text-ink-muted capitalize mt-0.5">
                  {{ selectedProfile.category }} · {{ selectedProfile.unit }}
                  <span v-if="selectedProfile.takenAt"> · {{ formatDate(selectedProfile.takenAt) }}</span>
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span v-if="selectedProfile.isTemplate" class="badge badge-ready text-2xs py-0.5">Template</span>
                <button
                  class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center"
                  @click="confirmDelete(selectedProfile); detailDrawer = false"
                >
                  <Trash2 :size="14" stroke-width="2" class="stroke-danger" />
                </button>
                <button
                  class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                  @click="detailDrawer = false"
                >
                  <X :size="16" stroke-width="2" class="stroke-ink-muted" />
                </button>
              </div>
            </div>

            <!-- Link to customer -->
            <NuxtLink
              v-if="selectedProfile.customerId"
              :to="`/customers/${selectedProfile.customerId}`"
              class="flex items-center gap-2 mb-4 text-sm text-gold hover:opacity-80 transition-opacity"
            >
              <User :size="14" stroke-width="1.8" />
              View customer profile →
            </NuxtLink>

            <!-- Tabs: View vs Compare -->
            <div class="tabs mb-4">
              <button :class="['tab', detailTab === 'view' ? 'active' : '']" @click="detailTab = 'view'">
                Measurements
              </button>
              <button
                v-if="siblingProfiles.length > 1"
                :class="['tab', detailTab === 'compare' ? 'active' : '']"
                @click="detailTab = 'compare'; loadComparisons()"
              >
                Compare
              </button>
            </div>

            <!-- View tab -->
            <div v-if="detailTab === 'view'">
              <!-- All measurement fields -->
              <div class="divide-y divide-cream-dark mb-4">
                <div
                  v-for="([key, val]) in Object.entries(selectedProfile.measurements)"
                  :key="key"
                  class="measure-row"
                >
                  <span class="measure-key capitalize">{{ key.replace(/_/g, ' ') }}</span>
                  <span class="measure-val">{{ val }}{{ selectedProfile.unit === 'inches' ? '"' : ' cm' }}</span>
                </div>
              </div>

              <p v-if="selectedProfile.notes" class="text-sm text-ink-muted leading-relaxed bg-cream rounded-xl p-3">
                {{ selectedProfile.notes }}
              </p>

              <!-- Use in new order button -->
              <NuxtLink
                :to="`/orders/new?measurementId=${selectedProfile.id}${selectedProfile.customerId ? `&customerId=${selectedProfile.customerId}` : ''}`"
                class="btn btn-primary btn-md btn-full mt-4"
              >
                <FilePlus :size="16" stroke-width="1.8" />
                Use in New Order
              </NuxtLink>
            </div>

            <!-- Compare tab: show diff with another profile -->
            <div v-else-if="detailTab === 'compare'">
              <div class="mb-4">
                <label class="form-label">Compare with</label>
                <select v-model="compareWithId" class="form-input" @change="loadComparisons">
                  <option value="">Select a profile…</option>
                  <option
                    v-for="p in siblingProfiles.filter(p => p.id !== selectedProfile!.id)"
                    :key="p.id"
                    :value="p.id"
                  >
                    {{ p.label }} ({{ formatDate(p.takenAt ?? p.createdAt) }})
                  </option>
                </select>
              </div>

              <div v-if="compareWithId && comparedProfile" class="space-y-0">
                <!-- Changed fields highlighted -->
                <div
                  v-for="([key]) in Object.entries(selectedProfile.measurements)"
                  :key="key"
                  :class="[
                    'flex items-center justify-between py-2.5 px-3 rounded-xl mb-1',
                    diffMap[key] ? 'bg-warning/8' : 'bg-cream'
                  ]"
                >
                  <span class="text-xs text-ink-muted capitalize">{{ key.replace(/_/g, ' ') }}</span>
                  <div class="flex items-center gap-3">
                    <span class="font-mono-dm text-xs text-ink-muted">
                      {{ comparedProfile.measurements[key] ?? '—' }}"
                    </span>
                    <span v-if="diffMap[key]" :class="['text-2xs font-semibold', diffMap[key].delta > 0 ? 'text-success' : 'text-danger']">
                      {{ diffMap[key].delta > 0 ? '+' : '' }}{{ diffMap[key].delta.toFixed(2) }}"
                    </span>
                    <span class="font-mono-dm text-xs text-ink font-medium">
                      {{ selectedProfile.measurements[key] }}"
                    </span>
                  </div>
                </div>

                <p v-if="Object.keys(diffMap).length === 0" class="text-center text-sm text-ink-muted py-4">
                  No differences found between these profiles
                </p>
                <p v-else class="text-xs text-ink-muted text-center mt-2">
                  {{ Object.keys(diffMap).length }} measurement{{ Object.keys(diffMap).length > 1 ? 's' : '' }} changed
                  · Left = older · Right = selected
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Delete confirm drawer ── -->
    <Transition name="fade">
      <div v-if="deleteTarget" class="overlay" @click.self="deleteTarget = null">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6">

            <!-- Header -->
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-display text-2xl text-ink">Delete Profile?</h3>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center flex-shrink-0"
                @click="deleteTarget = null"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <p class="text-sm text-ink-muted mb-6">
              "<strong>{{ deleteTarget.label }}</strong>" will be permanently removed. This cannot be undone.
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button class="btn btn-outline btn-lg" @click="deleteTarget = null">Cancel</button>
              <button class="btn btn-danger btn-lg" :disabled="isDeleting" @click="executeDelete">
                <Loader2 v-if="isDeleting" :size="16" class="animate-spin" />
                <span>{{ isDeleting ? 'Deleting…' : 'Delete' }}</span>
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
import { Plus, Search, X, Ruler, Loader2, Trash2, User, FilePlus } from 'lucide-vue-next'
import { useMeasurements } from '~/composables/useMeasurements'
import { useCustomers }    from '~/composables/useCustomers'
import { useAuthStore }    from '~/stores/auth'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type { MeasurementProfile, GarmentCategory, Customer } from '~/types/models'
import { getDb } from '~/db/schema'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
useHead({ title: 'Measurements — eTailor' })

const auth = useAuthStore()
const db   = getDb()

const {
  profiles, templates, isLoading,
  loadTemplates, create, remove, diff,
} = useMeasurements()

const { customers, loadAll: loadCustomers } = useCustomers()

// ── State ──────────────────────────────────────────────────────────────────────
const activeTab      = ref<'templates' | 'all'>('templates')
const filterCategory = ref<string>('all')
const searchQuery    = ref('')
const addDrawer      = ref(false)
const detailDrawer   = ref(false)
const selectedProfile = ref<MeasurementProfile | null>(null)
const detailTab      = ref<'view' | 'compare'>('view')
const compareWithId  = ref('')
const comparedProfile = ref<MeasurementProfile | null>(null)
const diffMap        = ref<Record<string, { old: number; new: number; delta: number }>>({})
const siblingProfiles = ref<MeasurementProfile[]>([])
const deleteTarget   = ref<MeasurementProfile | null>(null)
const isSaving       = ref(false)
const isDeleting     = ref(false)
const saveError      = ref('')
const customerSearch = ref('')
const showCustomerList = ref(false)

// ── New form ──────────────────────────────────────────────────────────────────
const newForm = reactive({
  isTemplate:   false,
  customerId:   '',
  customerName: '',
  label:        '',
  category:     'dress' as GarmentCategory,
  unit:         (auth.shop?.settings.measurementUnit ?? 'inches') as 'inches' | 'cm',
  measurements: {} as Record<string, number>,
  customFields: [] as Array<{ key: string; value: number }>,
  notes:        '',
  takenBy:      '',
  takenAt:      dayjs().format('YYYY-MM-DD'),
})
const newFormErrors = reactive({ customerId: '' })

// ── Computed ─────────────────────────────────────────────────────────────────
// const totalProfiles = computed(async () => {
//   if (!auth.shopId) return 0
//   const total = await db.measurementProfiles.where('shopId').equals(auth.shopId).count()
//   console.log("total profile", total)
//   return total
// })

const allProfiles = ref<MeasurementProfile[]>([])

const totalProfiles = ref(0)

const loadTotalProfiles = async () => {
  if (!auth.shopId) {
    totalProfiles.value = 0
    return
  }

  const total = await db.measurementProfiles
    .where('shopId')
    .equals(auth.shopId)
    .count()

  console.log("total profile", total)

  totalProfiles.value = total
}

const filteredTemplates = computed(() => {
  if (filterCategory.value === 'all') return templates.value
  return templates.value.filter(p => p.category === filterCategory.value)
})

const filteredAll = computed(() => {
  let list = allProfiles.value
  if (filterCategory.value !== 'all') list = list.filter(p => p.category === filterCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
    )
  }
  return list
})

// Group all profiles by customer
const groupedByCustomer = computed(() => {
  const groups: Record<string, { customerId: string; customerName: string; profiles: MeasurementProfile[] }> = {}
  for (const p of filteredAll.value) {
    const key = p.customerId || 'templates'
    if (!groups[key]) {
      const customer = customers.value.find(c => c.id === p.customerId)
      groups[key] = {
        customerId:   p.customerId,
        customerName: customer?.name ?? (p.isTemplate ? 'Templates' : 'Unknown'),
        profiles:     [],
      }
    }
    groups[key].profiles.push(p)
  }
  return Object.values(groups).sort((a, b) => a.customerName.localeCompare(b.customerName))
})

const currentFields = computed(() => MEASUREMENT_FIELDS[newForm.category] ?? [])

const filteredCustomers = computed(() => {
  if (!customerSearch.value) return customers.value.slice(0, 8)
  const q = customerSearch.value.toLowerCase()
  return customers.value.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q))
})

// ── Actions ───────────────────────────────────────────────────────────────────
function initFields() {
  newForm.measurements = {}
  for (const f of currentFields.value) {
    newForm.measurements[f] = 0
  }
}

function addCustomField() {
  newForm.customFields.push({ key: '', value: 0 })
}

function removeCustomField(idx: number) {
  newForm.customFields.splice(idx, 1)
}

function selectCustomer(c: Customer) {
  newForm.customerId   = c.id
  newForm.customerName = c.name
  customerSearch.value = c.name
  showCustomerList.value = false
}

function closeAddDrawer() {
  addDrawer.value = false
  saveError.value = ''
  // Reset form
  Object.assign(newForm, {
    isTemplate: false, customerId: '', customerName: '',
    label: '', category: 'dress', measurements: {},
    customFields: [], notes: '', takenBy: '',
    takenAt: dayjs().format('YYYY-MM-DD'),
  })
  customerSearch.value = ''
  initFields()
}

async function saveProfile() {
  newFormErrors.customerId = ''
  if (!newForm.isTemplate && !newForm.customerId) {
    newFormErrors.customerId = 'Please select a customer'
    return
  }

  isSaving.value = true
  saveError.value = ''

  try {
    // Merge standard + custom fields
    const allMeasurements: Record<string, number> = { ...newForm.measurements }
    for (const cf of newForm.customFields) {
      if (cf.key.trim()) allMeasurements[cf.key.trim()] = cf.value
    }

    const label = newForm.label.trim() ||
      `${newForm.category.charAt(0).toUpperCase() + newForm.category.slice(1)} — ${dayjs().format('MMM YYYY')}`

    await create({
      customerId:   newForm.isTemplate ? undefined : newForm.customerId,
      label,
      category:     newForm.category,
      measurements: allMeasurements,
      unit:         newForm.unit,
      notes:        newForm.notes || undefined,
      isTemplate:   newForm.isTemplate,
      takenBy:      newForm.takenBy || undefined,
      takenAt:      newForm.takenAt || undefined,
    })

    await loadAll()
    closeAddDrawer()
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isSaving.value = false
  }
}

async function openDetail(profile: MeasurementProfile) {
  selectedProfile.value = profile
  detailTab.value       = 'view'
  compareWithId.value   = ''
  diffMap.value         = {}

  // Load sibling profiles (same customer) for comparison
  if (profile.customerId) {
    siblingProfiles.value = await db.measurementProfiles
      .where('[shopId+customerId]')
      .equals([auth.shopId!, profile.customerId])
      .filter(p => !p.isDeleted)
      .toArray()
  } else {
    siblingProfiles.value = []
  }

  detailDrawer.value = true
}

async function loadComparisons() {
  if (!compareWithId.value || !selectedProfile.value) return
  comparedProfile.value = await db.measurementProfiles.get(compareWithId.value) ?? null
  if (comparedProfile.value) {
    diffMap.value = diff(comparedProfile.value, selectedProfile.value)
  }
}

function confirmDelete(profile: MeasurementProfile) {
  deleteTarget.value = profile
}

async function executeDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await remove(deleteTarget.value.id)
    await loadAll()
    deleteTarget.value = null
  } finally {
    isDeleting.value = false
  }
}

async function loadAll() {
  await loadTemplates()
  if (!auth.shopId) return
  allProfiles.value = await db.measurementProfiles
    .where('shopId').equals(auth.shopId)
    .reverse()
    .sortBy('createdAt')
}

function formatDate(d: string) {
  return dayjs(d).format('MMM D, YYYY')
}

const categoryChips = [
  { value: 'all',     label: 'All' },
  { value: 'dress',   label: 'Dress' },
  { value: 'gown',    label: 'Gown' },
  { value: 'suit',    label: 'Suit' },
  { value: 'shirt',   label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'ankara',  label: 'Ankara' },
  { value: 'asoebi',  label: 'Asoebi' },
  { value: 'agbada',  label: 'Agbada' },
]

const garmentCategories = [
  { value: 'dress',   label: 'Dress',   icon: '👗' },
  { value: 'gown',    label: 'Gown',    icon: '💃' },
  { value: 'suit',    label: 'Suit',    icon: '🤵' },
  { value: 'shirt',   label: 'Shirt',   icon: '👔' },
  { value: 'trouser', label: 'Trouser', icon: '👖' },
  { value: 'skirt',   label: 'Skirt',   icon: '🩱' },
  { value: 'blouse',  label: 'Blouse',  icon: '👚' },
  { value: 'jacket',  label: 'Jacket',  icon: '🧥' },
  { value: 'abaya',   label: 'Abaya',   icon: '🧕' },
  { value: 'ankara',  label: 'Ankara',  icon: '🎨' },
  { value: 'asoebi',  label: 'Asoebi',  icon: '✨' },
  { value: 'agbada',  label: 'Agbada',  icon: '👘' },
  { value: 'custom',  label: 'Custom',  icon: '📐' },
]

onMounted(async () => {
  await Promise.all([loadAll(), loadCustomers(), loadTotalProfiles()])
  initFields()
})
</script>
