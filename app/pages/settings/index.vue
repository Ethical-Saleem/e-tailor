<!-- app/pages/settings/index.vue -->
<template>
  <div class="animate-fade-in">
    <header class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">{{ auth.shopName }}</p>
    </header>

    <div class="px-4 pt-4 pb-24 space-y-4">

      <!-- Shop profile -->
      <div class="card divide-y divide-cream-dark">
        <div class="p-4">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Shop Profile</p>
          <div class="space-y-3">
            <div>
              <label class="form-label">Shop name</label>
              <input v-model="settings.shopName" class="form-input" />
            </div>
            <div>
              <label class="form-label">Phone</label>
              <input v-model="settings.phone" type="tel" class="form-input" />
            </div>
            <div>
              <label class="form-label">Currency</label>
              <select v-model="settings.currency" class="form-input">
                <option v-for="c in currencies" :key="c.code" :value="c.code">
                  {{ c.flag }} {{ c.name }} ({{ c.symbol }})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Order settings -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Orders</p>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="form-label">Order prefix</label>
              <input v-model="settings.orderPrefix" placeholder="ORD" class="form-input font-mono-dm" />
            </div>
            <div>
              <label class="form-label">Tax rate (%)</label>
              <input v-model.number="settings.taxRate" type="number" min="0" max="100" class="form-input font-mono-dm" />
            </div>
          </div>
          <div>
            <label class="form-label">Default deposit (%)</label>
            <input v-model.number="settings.depositPercent" type="number" min="0" max="100" class="form-input font-mono-dm" />
          </div>
        </div>
      </div>

      <!-- Measurement settings -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Measurements</p>
        <div>
          <label class="form-label">Default unit</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="u in ['inches', 'cm']"
              :key="u"
              :class="['btn btn-outline btn-md', settings.measurementUnit === u ? 'bg-ink text-white border-ink' : '']"
              @click="settings.measurementUnit = u"
            >
              {{ u === 'inches' ? '📏 Inches' : '📐 Centimetres' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Data management -->
      <div class="card divide-y divide-cream-dark">
        <button class="flex items-center justify-between w-full p-4 text-left" @click="exportBackup">
          <div class="flex items-center gap-3">
            <Download :size="18" stroke-width="1.8" class="stroke-ink-muted" />
            <div>
              <p class="text-sm font-medium text-ink">Export Backup</p>
              <p class="text-xs text-ink-muted">Download all your data as JSON</p>
            </div>
          </div>
          <ChevronRight :size="16" class="stroke-ink-muted" />
        </button>
        <button class="flex items-center justify-between w-full p-4 text-left" @click="forceSyncNow">
          <div class="flex items-center gap-3">
            <RefreshCw :size="18" stroke-width="1.8" class="stroke-ink-muted" />
            <div>
              <p class="text-sm font-medium text-ink">Force Sync Now</p>
              <p class="text-xs text-ink-muted">Push all pending changes to cloud</p>
            </div>
          </div>
          <ChevronRight :size="16" class="stroke-ink-muted" />
        </button>
      </div>

      <!-- Save -->
      <button class="btn btn-gold btn-lg btn-full" :disabled="isSaving" @click="saveSettings">
        <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
        <span>{{ isSaving ? 'Saving…' : 'Save Settings' }}</span>
      </button>

      <!-- Sign out -->
      <!-- <button class="btn btn-danger btn-md btn-full" @click="auth.signOut()">
        Sign out of {{ auth.shopName }}
      </button> -->

      <!-- Version -->
      <p class="text-center text-xs text-ink-subtle pb-4">eTailor v1.0.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Download, RefreshCw, ChevronRight, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { getDb } from '~/db/schema'

definePageMeta({ layout: 'default' })
useHead({ title: 'Settings — eTailor' })

const auth    = useAuthStore()
const { processQueue } = useOfflineSync()
const isSaving = ref(false)

const settings = reactive({
  shopName:        auth.shopName,
  phone:           auth.shop?.phone ?? '',
  currency:        auth.shop?.currency ?? 'NGN',
  orderPrefix:     auth.shop?.settings.orderNumberPrefix ?? 'ORD',
  taxRate:         auth.shop?.settings.taxRate ?? 0,
  depositPercent:  auth.shop?.settings.defaultDepositPercent ?? 50,
  measurementUnit: auth.shop?.settings.measurementUnit ?? 'inches',
})

const currencies = [
  { code: 'NGN', name: 'Nigerian Naira',  symbol: '₦', flag: '🇳🇬' },
  { code: 'USD', name: 'US Dollar',       symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound',   symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro',            symbol: '€', flag: '🇪🇺' },
  { code: 'GHS', name: 'Ghanaian Cedi',   symbol: '₵', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
]

async function saveSettings() {
  if (!auth.shopId) return
  isSaving.value = true
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('shops')
      .update({
        name:     settings.shopName,
        phone:    settings.phone || null,
        currency: settings.currency,
        settings: {
          ...auth.shop?.settings,
          orderNumberPrefix:     settings.orderPrefix,
          taxRate:               settings.taxRate,
          defaultDepositPercent: settings.depositPercent,
          measurementUnit:       settings.measurementUnit,
        },
      })
      .eq('id', auth.shopId)

    if (error) throw error
    await auth.init()
  } catch (err) {
    console.error('Save settings failed:', err)
  } finally {
    isSaving.value = false
  }
}

async function exportBackup() {
  const db = getDb()
  const [customers, orders, measurements, materials, payments] = await Promise.all([
    db.customers.toArray(),
    db.orders.toArray(),
    db.measurementProfiles.toArray(),
    db.materials.toArray(),
    db.payments.toArray(),
  ])

  const backup = {
    version:    '1.0.0',
    exportedAt: new Date().toISOString(),
    shopId:     auth.shopId,
    data:       { customers, orders, measurements, materials, payments },
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `etailor-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function forceSyncNow() {
  await processQueue()
}
</script>
