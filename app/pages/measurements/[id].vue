<!-- app/pages/measurements/[id].vue -->
<template>
  <!-- ── Loading ── -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen bg-cream">
    <Loader2 :size="32" class="animate-spin stroke-gold" />
  </div>

  <!-- ── Not found ── -->
  <div v-else-if="!profile" class="flex flex-col items-center justify-center min-h-screen bg-cream px-6 text-center">
    <div class="w-16 h-16 rounded-2xl bg-cream-dark flex items-center justify-center mb-4">
      <Ruler :size="28" stroke-width="1.5" class="stroke-ink-muted" />
    </div>
    <h2 class="font-display text-2xl text-ink mb-2">Profile not found</h2>
    <p class="text-sm text-ink-muted mb-6">This measurement profile may have been deleted.</p>
    <NuxtLink to="/measurements" class="btn btn-primary btn-md">Back to Measurements</NuxtLink>
  </div>

  <!-- ── Main ── -->
  <div v-else class="animate-fade-in">

    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-start gap-3">
        <button class="header-action-btn mt-0.5 flex-shrink-0" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="font-display text-2xl text-white leading-tight">{{ profile.label }}</h1>
            <span v-if="profile.isTemplate" class="badge badge-ready text-2xs py-0.5 flex-shrink-0">
              Template
            </span>
          </div>
          <p class="text-sm text-white/50 mt-0.5 capitalize">
            {{ profile.category }}
            <template v-if="profile.takenBy"> · by {{ profile.takenBy }}</template>
            <template v-if="profile.takenAt"> · {{ formatDate(profile.takenAt) }}</template>
          </p>
        </div>
        <!-- Edit button -->
        <button
          class="header-action-btn flex-shrink-0 mt-0.5"
          @click="openEdit"
        >
          <Pencil :size="16" stroke-width="1.8" class="stroke-white/70" />
        </button>
      </div>

      <!-- Unit toggle pill -->
      <div class="flex items-center gap-3 mt-4">
        <div class="flex bg-white/10 rounded-xl p-0.5">
          <button
            v-for="u in (['inches', 'cm'] as const)"
            :key="u"
            :class="[
              'text-xs font-semibold px-4 py-1.5 rounded-[10px] transition-all duration-200',
              displayUnit === u
                ? 'bg-white text-ink shadow-card'
                : 'text-white/50 hover:text-white/80',
            ]"
            @click="displayUnit = u"
          >
            {{ u === 'inches' ? 'Inches' : 'Centimetres' }}
          </button>
        </div>
        <span class="text-xs text-white/40">
          Stored in {{ profile.unit }}
        </span>
      </div>
    </header>

    <div class="px-4 pt-5 pb-28 space-y-4">

      <!-- ── Measurements grid ── -->
      <div class="card">
        <div class="px-4 pt-4 pb-1 flex items-center justify-between">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Measurements
            <span class="ml-1 font-mono-dm normal-case text-ink-subtle">({{ displayUnit }})</span>
          </p>
          <span class="text-2xs text-ink-muted font-mono-dm">
            {{ filledCount }} / {{ totalFieldCount }} filled
          </span>
        </div>

        <!-- Standard fields -->
        <div class="divide-y divide-cream-dark px-4">
          <div
            v-for="field in displayFields"
            :key="field.key"
            class="flex items-center justify-between py-3"
          >
            <span class="text-sm text-ink-muted capitalize">
              {{ field.key.replace(/_/g, '\u00A0') }}
            </span>
            <div class="flex items-center gap-2">
              <!-- Zero / empty indicator -->
              <span
                v-if="field.raw === 0"
                class="text-xs text-ink-subtle italic"
              >not set</span>
              <span v-else class="font-mono-dm text-sm font-medium text-ink">
                {{ field.display }}
              </span>
              <span class="text-2xs text-ink-subtle w-5 text-right">
                {{ field.raw !== 0 ? (displayUnit === 'inches' ? '"' : 'cm') : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="profile.notes" class="mx-4 mb-4 mt-2 bg-cream rounded-xl p-3">
          <p class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Notes</p>
          <p class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ profile.notes }}</p>
        </div>
      </div>

      <!-- ── Customer link ── -->
      <NuxtLink
        v-if="customer"
        :to="`/customers/${customer.id}`"
        class="card flex items-center gap-3.5 px-4 py-3.5 hover:shadow-card-md transition-all group"
      >
        <div class="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <span class="font-display text-xl text-gold">{{ customer.name.charAt(0) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink">{{ customer.name }}</p>
          <p class="text-xs text-ink-muted">{{ customer.phone ?? customer.email ?? 'View profile →' }}</p>
        </div>
        <ChevronRight :size="16" stroke-width="2" class="stroke-ink-subtle group-hover:stroke-ink-muted transition-colors flex-shrink-0" />
      </NuxtLink>

      <!-- ── Sibling profiles (same customer + category) for comparison ── -->
      <div v-if="siblings.length > 0">
        <div class="section-header">
          <h2 class="section-title">Compare with another profile</h2>
        </div>
        <div class="card p-4">
          <select
            v-model="compareId"
            class="form-input text-sm mb-4"
          >
            <option value="">— Select a profile —</option>
            <option
              v-for="s in siblings"
              :key="s.id"
              :value="s.id"
            >
              {{ s.label }}  ·  {{ s.takenAt ? formatDate(s.takenAt) : formatDate(s.createdAt) }}
            </option>
          </select>

          <!-- Diff table -->
          <Transition name="fade">
            <div v-if="compareId && compareProfile" key="diff">
              <div v-if="Object.keys(diffResult).length === 0" class="text-center py-3">
                <CheckCircle2 :size="20" stroke-width="1.5" class="stroke-success mx-auto mb-1" />
                <p class="text-sm text-ink-muted">Measurements are identical</p>
              </div>

              <div v-else class="space-y-1">
                <p class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  {{ Object.keys(diffResult).length }} measurement{{ Object.keys(diffResult).length !== 1 ? 's' : '' }} changed
                </p>
                <!-- Each changed field -->
                <div
                  v-for="([key, d]) in Object.entries(diffResult)"
                  :key="key"
                  class="flex items-center gap-2 bg-cream rounded-xl px-3 py-2.5"
                >
                  <span class="text-xs text-ink-muted capitalize flex-1">
                    {{ key.replace(/_/g, '\u00A0') }}
                  </span>
                  <!-- Older value (compareProfile) -->
                  <span class="font-mono-dm text-xs text-ink-muted">
                    {{ displayVal(d.old, compareProfile.unit) }}"
                  </span>
                  <ArrowRight :size="12" stroke-width="2" class="stroke-ink-subtle flex-shrink-0" />
                  <!-- Newer value (this profile) -->
                  <span class="font-mono-dm text-xs text-ink font-medium">
                    {{ displayVal(d.new, profile!.unit) }}"
                  </span>
                  <!-- Delta -->
                  <span
                    :class="[
                      'text-2xs font-bold w-12 text-right flex-shrink-0',
                      d.delta > 0 ? 'text-success' : 'text-danger',
                    ]"
                  >
                    {{ d.delta > 0 ? '+' : '' }}{{ d.delta.toFixed(1) }}"
                  </span>
                </div>

                <!-- Unchanged fields count -->
                <p class="text-2xs text-ink-subtle text-center pt-1">
                  {{ unchangedCount }} field{{ unchangedCount !== 1 ? 's' : '' }} unchanged
                </p>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- ── Use in new order ── -->
      <NuxtLink
        :to="useInOrderLink"
        class="card flex items-center gap-3.5 px-4 py-3.5 hover:shadow-card-md transition-all group"
      >
        <div class="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
          <FilePlus :size="18" stroke-width="1.8" class="stroke-gold" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-ink">Use in new order</p>
          <p class="text-xs text-ink-muted">Start an order with these measurements pre-filled</p>
        </div>
        <ChevronRight :size="16" stroke-width="2" class="stroke-ink-subtle group-hover:stroke-ink-muted transition-colors" />
      </NuxtLink>

      <!-- ── History: all profiles for this customer + category ── -->
      <div v-if="allVersions.length > 0">
        <div class="section-header">
          <h2 class="section-title">Version History</h2>
          <span class="text-xs text-ink-muted font-mono-dm">{{ allVersions.length }} saved</span>
        </div>
        <div class="space-y-2.5">
          <div
            v-for="v in allVersions"
            :key="v.id"
            :class="[
              'card p-4 transition-all duration-150',
              v.id === profile.id
                ? 'border-gold ring-2 ring-gold/20'
                : 'hover:shadow-card-md cursor-pointer',
            ]"
            @click="v.id !== profile.id && $router.push(`/measurements/${v.id}`)"
          >
            <div class="flex items-start justify-between mb-2.5">
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-ink">{{ v.label }}</p>
                  <span v-if="v.id === profile.id" class="badge badge-ready text-2xs py-0.5">Current</span>
                </div>
                <p class="text-xs text-ink-muted mt-0.5">
                  {{ v.takenAt ? formatDate(v.takenAt) : formatDate(v.createdAt) }}
                  <span v-if="v.takenBy"> · by {{ v.takenBy }}</span>
                </p>
              </div>
              <span class="text-2xs text-ink-muted font-mono-dm flex-shrink-0">{{ v.unit }}</span>
            </div>
            <!-- Key measurements preview (first 6, non-zero) -->
            <div class="grid grid-cols-3 gap-x-4 gap-y-1">
              <div
                v-for="([key, val]) in Object.entries(v.measurements).filter(([, n]) => n > 0).slice(0, 6)"
                :key="key"
                class="flex items-baseline justify-between"
              >
                <span class="text-2xs text-ink-muted capitalize truncate">
                  {{ key.replace(/_/g, ' ') }}
                </span>
                <span class="font-mono-dm text-2xs text-ink ml-1 flex-shrink-0">
                  {{ val }}<span class="text-ink-subtle text-2xs">{{ v.unit === 'inches' ? '"' : '' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Sticky delete footer ── -->
    <div class="fixed bottom-[76px] left-0 right-0 px-4 pb-2 pointer-events-none z-30">
      <button
        class="pointer-events-auto w-full btn btn-danger btn-md flex items-center justify-center gap-2 shadow-card-lg"
        @click="deleteDialog = true"
      >
        <Trash2 :size="16" stroke-width="1.8" />
        Delete Profile
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- EDIT DRAWER                                                           -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="editDrawer" class="overlay" @click.self="closeEdit">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8 overflow-y-auto max-h-[92vh]">

            <div class="flex items-center justify-between mb-1">
              <h3 class="font-display text-2xl text-ink">Edit Profile</h3>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                @click="closeEdit"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>
            <p class="text-sm text-ink-muted mb-5">Changes sync automatically when online.</p>

            <div class="space-y-5">

              <!-- Label -->
              <div>
                <label class="form-label">Profile label</label>
                <input
                  v-model="editForm.label"
                  placeholder="e.g. Wedding Gown — Jan 2025"
                  class="form-input"
                  :class="{ 'form-input-error': editErrors.label }"
                />
                <p v-if="editErrors.label" class="form-error">{{ editErrors.label }}</p>
              </div>

              <!-- Category -->
              <div>
                <label class="form-label">Garment category</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="cat in garmentCategories"
                    :key="cat.value"
                    type="button"
                    :class="[
                      'flex flex-col items-center gap-1 border rounded-xl py-2.5 px-1 text-center text-xs font-medium transition-all duration-150',
                      editForm.category === cat.value
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-ink-muted border-cream-dark hover:border-ink-muted',
                    ]"
                    @click="changeCategory(cat.value as GarmentCategory)"
                  >
                    <span class="text-base">{{ cat.icon }}</span>
                    {{ cat.label }}
                  </button>
                </div>
              </div>

              <!-- Unit -->
              <div>
                <label class="form-label">Measurement unit</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="u in (['inches', 'cm'] as const)"
                    :key="u"
                    type="button"
                    :class="[
                      'btn btn-outline btn-sm',
                      editForm.unit === u ? 'bg-ink text-white border-ink' : '',
                    ]"
                    @click="changeUnit(u)"
                  >
                    {{ u === 'inches' ? '📏 Inches' : '📐 Centimetres' }}
                  </button>
                </div>
              </div>

              <!-- Measurement fields -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="form-label mb-0">Measurements ({{ editForm.unit }})</label>
                  <button
                    class="text-xs text-gold font-medium"
                    @click="addCustomField"
                  >
                    + Add field
                  </button>
                </div>

                <div class="bg-cream rounded-xl p-3 space-y-2.5">
                  <!-- Standard fields for the selected category -->
                  <div
                    v-for="field in editFields"
                    :key="field"
                    class="flex items-center gap-3"
                  >
                    <label class="text-xs text-ink-muted capitalize flex-1 min-w-0 truncate">
                      {{ field.replace(/_/g, ' ') }}
                    </label>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <input
                        v-model.number="editForm.measurements[field]"
                        type="number"
                        min="0"
                        step="0.25"
                        placeholder="0"
                        class="w-20 text-right border border-cream-dark rounded-lg px-2 py-1.5 text-xs font-mono-dm bg-surface focus:border-gold outline-none"
                      />
                      <span class="text-2xs text-ink-muted w-4">{{ editForm.unit === 'inches' ? '"' : 'cm' }}</span>
                    </div>
                  </div>

                  <!-- Custom fields (not part of standard category set) -->
                  <div
                    v-for="(cf, idx) in editCustomFields"
                    :key="`custom-${idx}`"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="cf.key"
                      placeholder="Field name"
                      class="flex-1 border border-gold/40 rounded-lg px-2.5 py-1.5 text-xs bg-surface focus:border-gold outline-none"
                    />
                    <input
                      v-model.number="cf.value"
                      type="number"
                      min="0"
                      step="0.25"
                      placeholder="0"
                      class="w-20 text-right border border-gold/40 rounded-lg px-2 py-1.5 text-xs font-mono-dm bg-surface focus:border-gold outline-none"
                    />
                    <span class="text-2xs text-ink-muted">{{ editForm.unit === 'inches' ? '"' : 'cm' }}</span>
                    <button
                      class="text-danger p-1 flex-shrink-0"
                      @click="removeCustomField(idx)"
                    >
                      <X :size="14" stroke-width="2" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Template toggle -->
              <div class="flex items-center justify-between bg-cream rounded-xl p-3.5">
                <div>
                  <p class="text-sm font-medium text-ink">Save as template</p>
                  <p class="text-xs text-ink-muted mt-0.5">Reusable for any customer or order</p>
                </div>
                <button
                  :class="[
                    'w-11 h-6 rounded-full relative flex-shrink-0 transition-all duration-200',
                    editForm.isTemplate ? 'bg-gold' : 'bg-cream-deeper',
                  ]"
                  @click="editForm.isTemplate = !editForm.isTemplate"
                >
                  <div
                    :class="[
                      'w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-card transition-all duration-200',
                      editForm.isTemplate ? 'left-[22px]' : 'left-0.5',
                    ]"
                  />
                </button>
              </div>

              <!-- Notes -->
              <div>
                <label class="form-label">Notes</label>
                <textarea
                  v-model="editForm.notes"
                  rows="3"
                  placeholder="Posture notes, fitting preferences, alterations…"
                  class="form-input resize-none"
                />
              </div>

              <!-- Taken by / date -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Taken by</label>
                  <input
                    v-model="editForm.takenBy"
                    placeholder="Staff name"
                    class="form-input"
                  />
                </div>
                <div>
                  <label class="form-label">Date taken</label>
                  <input
                    v-model="editForm.takenAt"
                    type="date"
                    class="form-input"
                  />
                </div>
              </div>

              <!-- Save error -->
              <div v-if="editError" class="alert alert-danger text-xs">
                <AlertCircle :size="14" stroke-width="2" class="stroke-danger flex-shrink-0" />
                {{ editError }}
              </div>

              <!-- Actions -->
              <div class="grid grid-cols-2 gap-3 pt-1">
                <button
                  class="btn btn-outline btn-lg"
                  @click="closeEdit"
                >
                  Cancel
                </button>
                <button
                  class="btn btn-gold btn-lg"
                  :disabled="isSaving"
                  @click="saveEdit"
                >
                  <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
                  <span>{{ isSaving ? 'Saving…' : 'Save changes' }}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <!-- DELETE CONFIRMATION DIALOG                                            -->
    <!-- ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="deleteDialog" class="overlay" @click.self="deleteDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 :size="26" stroke-width="1.5" class="stroke-danger" />
            </div>
            <h3 class="font-display text-2xl text-ink text-center mb-2">Delete profile?</h3>
            <p class="text-sm text-ink-muted text-center leading-relaxed mb-6">
              <strong class="text-ink">{{ profile.label }}</strong> will be permanently removed.
              Any orders linked to this profile will keep their measurement data.
              This cannot be undone.
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button
                class="btn btn-outline btn-lg"
                :disabled="isDeleting"
                @click="deleteDialog = false"
              >
                Keep it
              </button>
              <button
                class="btn btn-danger btn-lg"
                :disabled="isDeleting"
                @click="confirmDelete"
              >
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  ArrowLeft, Pencil, Ruler, Loader2, Trash2, X,
  CheckCircle2, ChevronRight, FilePlus, ArrowRight, AlertCircle,
} from 'lucide-vue-next'
import { useMeasurements } from '~/composables/useMeasurements'
import { useUIStore }      from '~/stores/ui'
import { getDb }           from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type { MeasurementProfile, GarmentCategory, Customer } from '~/types/models'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })

const nuxtRoute = useRoute()
const router    = useRouter()
const db        = getDb()
const ui        = useUIStore()
const { getById, update, remove, diff, convert } = useMeasurements()

// ── Core data ─────────────────────────────────────────────────────────────────
const profile   = ref<MeasurementProfile | null>(null)
const customer  = ref<Customer | null>(null)
const siblings  = ref<MeasurementProfile[]>([])   // same customer + category (excluding self)
const allVersions = ref<MeasurementProfile[]>([]) // same customer + category (including self, for history)
const isLoading = ref(true)

// ── Display unit (independent from stored unit) ───────────────────────────────
const displayUnit = ref<'inches' | 'cm'>('inches')

// ── Comparison ────────────────────────────────────────────────────────────────
const compareId      = ref('')
const compareProfile = ref<MeasurementProfile | null>(null)

watch(compareId, async (id) => {
  compareProfile.value = id ? (await db.measurementProfiles.get(id) ?? null) : null
})

const diffResult = computed(() => {
  if (!profile.value || !compareProfile.value) return {}
  // compare: old = compareProfile, new = current profile
  return diff(compareProfile.value, profile.value)
})

const unchangedCount = computed(() => {
  if (!profile.value || !compareProfile.value) return 0
  const allKeys = new Set([
    ...Object.keys(profile.value.measurements),
    ...Object.keys(compareProfile.value.measurements),
  ])
  return allKeys.size - Object.keys(diffResult.value).length
})

// ── Display fields (converts stored unit → displayUnit) ───────────────────────
const displayFields = computed(() => {
  if (!profile.value) return []
  return Object.entries(profile.value.measurements).map(([key, raw]) => {
    const converted = profile.value!.unit === displayUnit.value
      ? raw
      : convert(raw, profile.value!.unit, displayUnit.value)
    return {
      key,
      raw,
      display: converted > 0 ? converted.toFixed(1) : '0',
    }
  })
})

const filledCount   = computed(() => displayFields.value.filter(f => f.raw > 0).length)
const totalFieldCount = computed(() => displayFields.value.length)

function displayVal(raw: number, storedUnit: string): string {
  const converted = storedUnit === displayUnit.value
    ? raw
    : convert(raw, storedUnit as 'inches' | 'cm', displayUnit.value)
  return converted.toFixed(1)
}

// ── Link to start a new order pre-filled with this profile ────────────────────
const useInOrderLink = computed(() => {
  if (!profile.value) return '/orders/new'
  const params = new URLSearchParams()
  params.set('measurementId', profile.value.id)
  if (profile.value.customerId) params.set('customerId', profile.value.customerId)
  return `/orders/new?${params.toString()}`
})

// ── Load ──────────────────────────────────────────────────────────────────────
async function load(): Promise<void> {
  isLoading.value = true
  try {
    const id = nuxtRoute.params.id as string
    const p  = await getById(id)

    if (!p) {
      isLoading.value = false
      return
    }

    profile.value     = p
    displayUnit.value = p.unit // default display to stored unit
    useHead({ title: `${p.label} — eTailor` })

    // Load customer
    if (p.customerId) {
      customer.value = await db.customers.get(p.customerId) ?? null
    }

    // Load sibling profiles (same customer, same category, not this one)
    if (p.customerId) {
      siblings.value = await db.measurementProfiles
        .where('[shopId+customerId]')
        .equals([p.shopId, p.customerId])
        .filter(s => !s.isDeleted && s.id !== p.id && s.category === p.category)
        .reverse()
        .sortBy('createdAt')

      // All versions including self (for History section)
      allVersions.value = await db.measurementProfiles
        .where('[shopId+customerId]')
        .equals([p.shopId, p.customerId])
        .filter(s => !s.isDeleted && s.category === p.category)
        .reverse()
        .sortBy('createdAt')
    }
  } finally {
    isLoading.value = false
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT DRAWER
// ═════════════════════════════════════════════════════════════════════════════

const editDrawer = ref(false)
const isSaving   = ref(false)
const editError  = ref('')

// Standard fields for the currently selected category
const editFields = computed(() => MEASUREMENT_FIELDS[editForm.category as GarmentCategory] ?? [])

// Custom fields = keys in measurements that are NOT in the standard set
const editCustomFields = ref<Array<{ key: string; value: number }>>([])

const editForm = reactive({
  label:        '',
  category:     'dress' as GarmentCategory,
  unit:         'inches' as 'inches' | 'cm',
  measurements: {} as Record<string, number>,
  notes:        '',
  isTemplate:   false,
  takenBy:      '',
  takenAt:      '',
})

const editErrors = reactive({ label: '' })

function openEdit(): void {
  if (!profile.value) return
  editError.value = ''
  editErrors.label = ''

  // Populate form from current profile
  editForm.label      = profile.value.label
  editForm.category   = profile.value.category
  editForm.unit       = profile.value.unit
  editForm.notes      = profile.value.notes ?? ''
  editForm.isTemplate = profile.value.isTemplate
  editForm.takenBy    = profile.value.takenBy ?? ''
  editForm.takenAt    = profile.value.takenAt ?? ''

  // Deep-copy measurements into form
  editForm.measurements = { ...profile.value.measurements }

  // Split into standard vs custom fields
  const standardSet = new Set(MEASUREMENT_FIELDS[profile.value.category] ?? [])
  editCustomFields.value = Object.entries(profile.value.measurements)
    .filter(([key]) => !standardSet.has(key))
    .map(([key, value]) => ({ key, value }))

  editDrawer.value = true
}

function closeEdit(): void {
  editDrawer.value = false
  editError.value  = ''
}

// When category changes, preserve overlapping measurements, zero out removed ones
function changeCategory(newCat: GarmentCategory): void {
  const oldFields = new Set(MEASUREMENT_FIELDS[editForm.category] ?? [])
  const newFields = MEASUREMENT_FIELDS[newCat] ?? []

  // Build new measurements: keep values for fields that appear in both
  const newMeasurements: Record<string, number> = {}
  for (const f of newFields) {
    newMeasurements[f] = editForm.measurements[f] ?? 0
  }
  editForm.measurements = newMeasurements
  editForm.category     = newCat

  // Custom fields survive a category change
}

// When unit changes, convert all existing values
function changeUnit(newUnit: 'inches' | 'cm'): void {
  if (newUnit === editForm.unit) return
  const converted: Record<string, number> = {}
  for (const [key, val] of Object.entries(editForm.measurements)) {
    converted[key] = parseFloat(
      convert(val, editForm.unit, newUnit).toFixed(2),
    )
  }
  // Also convert custom fields
  for (const cf of editCustomFields.value) {
    cf.value = parseFloat(convert(cf.value, editForm.unit, newUnit).toFixed(2))
  }
  editForm.measurements = converted
  editForm.unit         = newUnit
}

function addCustomField(): void {
  editCustomFields.value.push({ key: '', value: 0 })
}

function removeCustomField(idx: number): void {
  editCustomFields.value.splice(idx, 1)
}

async function saveEdit(): Promise<void> {
  editErrors.label = ''
  editError.value  = ''

  if (!editForm.label.trim()) {
    editErrors.label = 'Label is required'
    return
  }

  isSaving.value = true
  try {
    // Merge standard + custom measurements
    const allMeasurements: Record<string, number> = { ...editForm.measurements }
    for (const cf of editCustomFields.value) {
      if (cf.key.trim()) {
        allMeasurements[cf.key.trim()] = cf.value
      }
    }

    const updated = await update(profile.value!.id, {
      label:        editForm.label.trim(),
      category:     editForm.category,
      unit:         editForm.unit,
      measurements: allMeasurements,
      notes:        editForm.notes || undefined,
      isTemplate:   editForm.isTemplate,
      takenBy:      editForm.takenBy || undefined,
      takenAt:      editForm.takenAt || undefined,
    })

    profile.value    = updated
    displayUnit.value = updated.unit
    editDrawer.value  = false
    ui.success('Measurements updated')

    // Reload siblings in case category changed
    await load()
  } catch (err: unknown) {
    editError.value = err instanceof Error ? err.message : 'Failed to save changes'
  } finally {
    isSaving.value = false
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DELETE
// ═════════════════════════════════════════════════════════════════════════════

const deleteDialog = ref(false)
const isDeleting   = ref(false)

async function confirmDelete(): Promise<void> {
  if (!profile.value) return
  isDeleting.value = true
  try {
    await remove(profile.value.id)
    ui.success('Profile deleted')
    // Navigate back — prefer customer page if linked, else measurements list
    if (customer.value) {
      await router.replace(`/customers/${customer.value.id}`)
    } else {
      await router.replace('/measurements')
    }
  } catch (err: unknown) {
    ui.error(err instanceof Error ? err.message : 'Failed to delete profile')
    isDeleting.value = false
    deleteDialog.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  return dayjs(d).format('MMM D, YYYY')
}

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

onMounted(load)
</script>
