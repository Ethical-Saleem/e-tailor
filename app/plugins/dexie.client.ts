// app/plugins/dexie.client.ts
// Client-only plugin: initialises IndexedDB and makes db available globally
import { getDb } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async (nuxtApp) => {
  const db = getDb()

  // ── 1. Open IndexedDB ──────────────────────────────────────────────────────
  try {
    await db.open()
    console.log('[Dexie] Database opened — version', db.verno)
  } catch (err) {
    console.error('[Dexie] Failed to open database:', err)
    // Non-fatal: app can still run using Supabase directly
  }

  // ── 2. Init auth (must happen after DB is open so cache fallback works) ────
  const auth = useAuthStore(nuxtApp.$pinia)
  try {
    await auth.init()
  } catch (err) {
    console.error('[Auth] Init failed in plugin:', err)
    // Try local cache as last resort
    await auth.loadFromCache()
  }

  return {
    provide: {
      db,
    },
  }
})
