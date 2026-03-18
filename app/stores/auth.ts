// app/stores/auth.ts
import { defineStore } from 'pinia'
import type { Shop } from '~/types/models'
import { getDb } from '~/db/schema'
import { useRoute } from 'vue-router'

interface AuthState {
  shopId: string | null
  userId: string | null
  shop: Shop | null
  role: 'owner' | 'manager' | 'staff' | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    shopId: null,
    userId: null,
    shop: null,
    role: null,
    isLoading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.userId && !!state.shopId,
    isOwner: (state) => state.role === 'owner',
    canManage: (state) =>
      state.role === 'owner' || state.role === 'manager',

    currency: (state) => state.shop?.currency ?? 'NGN',
    currencySymbol: (state) => state.shop?.currencySymbol ?? '₦',
    shopName: (state) => state.shop?.name ?? 'My Shop',
  },

  actions: {
    // MAIN INIT (online + offline fallback)
    async init() {
      // Guard: don't re-init if already loaded (e.g. called twice)
      if (!this.isLoading && this.shopId) 
        
      // Guard: skip shop fetch entirely on auth flow pages.
      // These pages handle their own session/shop logic and the shop
      // may not exist yet (e.g. confirm page runs before shop is created).
      this.checkAuthRoute()

      this.isLoading = true
      try {
        const supabase = useSupabaseClient()

        // 1. Restore session (Supabase already persists this)
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser()

        if (!user || userError) {
          this.$reset
          this.isLoading = false
          return
        }

        this.userId = user.id

        // 2. Try fetching shop from server
        const { data: shop, error } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .single()

        if (error || !shop) {
          // fallback to offline cache
          await this.loadFromCache()
          return
        }

        // 3. Normalize + set
        this.shopId = shop.id
        const normalized = toCamelShop(shop)

        this.setShop(normalized)
        this.role = 'owner'

        // 4. Cache locally (offline support)
        try {
          const db = getDb()
          await db.shops.put(normalized)
        } catch {
          // IndexedDB may not be available (private browsing, etc.)
        }
      } catch (err) {
        console.error('[Auth] Init failed:', err)
        await this.loadFromCache()
      } finally {
        this.isLoading = false
      }
    },

    // 📦 Load from IndexedDB (offline mode)
    async loadFromCache() {
      try {
        const db = getDb()
        const shop = await db.shops.toCollection().first()

        if (shop) {
          this.setShop(shop)
          this.role = 'owner'
        }
      } catch (err) {
        console.warn('[Auth] IndexedDB unavailable:', err)
      }
    },

    checkAuthRoute() {
      const nuxtApp = useNuxtApp()
      const route = nuxtApp.$router.currentRoute.value

      const AUTH_ROUTES = [
        '/auth/login',
        '/auth/register',
        '/auth/confirm',
        '/auth/confirm-pending',
        '/auth/reset-password',
        '/auth/update-password',
      ]
      if (AUTH_ROUTES.some(r => route.path.startsWith(r))) {
        this.isLoading = false
        return
      }
    },

    // 🔐 Logout
    async signOut() {
      const supabase = useSupabaseClient()
      // Sign out from Supabase first so any in-flight requests
      // immediately lose their auth token
      await supabase.auth.signOut()
 
      // Wipe IndexedDB so the next user on this device starts fresh.
      // Do this before $reset() so we still have context if it throws.
      await this.clearLocalData()
 
      // Clear any pending shop setup data from registration flow
      if (import.meta.client) {
        localStorage.removeItem('pendingShop')
      }
 
      this.$reset()
      navigateTo('/auth/login')
    },

    // 🧹 Wipe every IndexedDB table for this app
    async clearLocalData() {
      try {
        const db = getDb()
 
        // Clear all tables in parallel — order doesn't matter since
        // we're clearing everything, not maintaining referential integrity
        await Promise.all([
          db.shops.clear(),
          db.customers.clear(),
          db.measurementProfiles.clear(),
          db.orders.clear(),
          db.orderEvents.clear(),
          db.materials.clear(),
          db.materialPriceHistory.clear(),
          db.payments.clear(),
          db.syncQueue.clear(),
          db.syncMeta.clear(),
          db.appSettings.clear(),
        ])
      } catch (err) {
        // Don't block sign-out if IndexedDB clear fails (e.g. private browsing).
        // The Supabase session is already invalidated so data is unreachable anyway.
        console.warn('[Auth] Could not clear IndexedDB on sign-out:', err)
      }
    },

    // 🏪 Set shop safely
    setShop(shop: Shop) {
      this.shop = shop
      this.shopId = shop.id
    },

    // 🧹 Full reset (useful for edge cases)
    reset() {
      this.$reset()
    },
  },
})

/* ---------------- HELPERS ---------------- */

function toCamelShop(row: Record<string, unknown>): Shop {
  const currency = (row.currency as string) ?? 'NGN'

  return {
    id: row.id as string,
    name: row.name as string,
    ownerId: row.owner_id as string,
    phone: row.phone as string | undefined,
    address: row.address as string | undefined,

    currency,
    currencySymbol: getCurrencySymbol(currency),

    logoUrl: row.logo_url as string | undefined,
    settings:
      (row.settings as Shop['settings']) ?? defaultSettings(),

    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: '₵',
    KES: 'KSh',
    ZAR: 'R',
    XOF: 'CFA',
  }

  return map[currency] ?? currency
}

function defaultSettings(): Shop['settings'] {
  return {
    orderNumberPrefix: 'ORD',
    orderNumberFormat: 'YYYY-NNN',
    defaultDepositPercent: 50,
    measurementUnit: 'inches',
    workingDays: [1, 2, 3, 4, 5, 6],
    whatsappEnabled: false,
    taxRate: 0,
  }
}
