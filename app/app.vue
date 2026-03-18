<!-- app/app.vue -->
<template>
  <div :class="['min-h-screen', theme === 'dark' ? 'dark' : '']">
    <!--
      auth.isLoading is true while the dexie.client.ts plugin runs auth.init().
      We show a full-screen spinner during that window so no page renders
      before shopId / shop are available. Typically < 300ms on first load,
      near-instant on repeat visits (served from local cache).
    -->
    <div v-if="auth.isLoading && !AUTH_ROUTES.some(r => route.path.startsWith(r))" class="fixed inset-0 bg-ink flex flex-col items-center justify-center z-50">
      <img src="/icons/icon.png" alt="e-Tailor Logo" width="80" height="80" class="mb-4" />
      <p class="font-display text-4xl text-white mb-3">e<span class="text-gold">Tailor</span></p>
      <div class="flex items-center gap-2 text-white/40 text-sm">
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading your shop…
      </div>
    </div>

    <template v-else>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>

      <!-- Global toast notifications -->
      <ToastContainer />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useUIStore }   from '~/stores/ui'

// auth.init() is called by app/plugins/dexie.client.ts BEFORE this component
// mounts, so by the time NuxtPage renders, auth.shopId is guaranteed to be set
// (or the user is unauthenticated and the auth middleware will redirect them).
const auth    = useAuthStore()
const uiStore = useUIStore()

const route = useRoute()
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/confirm',
  '/auth/confirm-pending',
  '/auth/reset-password',
  '/auth/update-password',
]

const theme = computed(() => uiStore.theme)

useHead({ htmlAttrs: { lang: 'en' } })
</script>
