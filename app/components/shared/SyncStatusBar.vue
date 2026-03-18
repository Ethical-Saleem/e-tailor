<!-- app/components/shared/SyncStatusBar.vue -->
<template>
  <div :class="['sync-bar', barClass]" role="status" aria-live="polite">
    <!-- Icon -->
    <component :is="icon" :class="['w-3.5 h-3.5 flex-shrink-0', iconClass]" />
    <!-- Label -->
    <span :class="['text-xs font-medium truncate', status === 'syncing' ? 'animate-pulse-dot' : '']">
      {{ syncLabel }}
    </span>
    <!-- Retry button on error -->
    <button
      v-if="status === 'error'"
      class="ml-auto text-xs underline flex-shrink-0 hover:no-underline"
      @click="retryFailed"
    >
      Retry
    </button>
    <!-- Pending count pill -->
    <span
      v-if="status === 'pending' && pendingCount > 0"
      class="ml-auto bg-white/20 text-white text-2xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
    >
      {{ pendingCount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckCircle2, RefreshCw, WifiOff, AlertCircle, Loader2,
} from 'lucide-vue-next'
import { useOfflineSync } from '~/composables/useOfflineSync'

const { syncStatus, syncLabel, pendingCount, retryFailed } = useOfflineSync()

const status = syncStatus

const barClass = computed(() => ({
  'sync-bar-synced':  status.value === 'synced',
  'sync-bar-pending': status.value === 'pending',
  'sync-bar-syncing': status.value === 'syncing',
  'sync-bar-offline': status.value === 'offline',
  'sync-bar-error':   status.value === 'error',
  // Override syncing — use warning colour
  'bg-info':          status.value === 'syncing',
}))

const icon = computed(() => {
  switch (status.value) {
    case 'synced':  return CheckCircle2
    case 'pending': return RefreshCw
    case 'syncing': return Loader2
    case 'offline': return WifiOff
    case 'error':   return AlertCircle
  }
})

const iconClass = computed(() => ({
  'animate-spin':     status.value === 'syncing',
}))
</script>
