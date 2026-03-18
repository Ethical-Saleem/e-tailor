// app/stores/ui.ts
import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

interface UIState {
  toasts: Toast[]
  isNavOpen: boolean
  theme: 'light' | 'dark'
}

const THEME_KEY = 'app:theme'

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    toasts: [],
    isNavOpen: false,
    theme: 'light',
  }),

  getters: {
    isDark: (state) => state.theme === 'dark',
  },

  actions: {
    /* ---------------- TOASTS ---------------- */

    toast(message: string, type: ToastType = 'success', duration = 3000) {
      const id = crypto.randomUUID()

      this.toasts.push({ id, message, type, duration })

      // auto remove
      setTimeout(() => {
        this.dismissToast(id)
      }, duration)
    },

    dismissToast(id: string) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },

    success(message: string) {
      this.toast(message, 'success')
    },

    error(message: string) {
      this.toast(message, 'error', 5000)
    },

    warning(message: string) {
      this.toast(message, 'warning')
    },

    info(message: string) {
      this.toast(message, 'info')
    },

    /* ---------------- NAV ---------------- */

    toggleNav() {
      this.isNavOpen = !this.isNavOpen
    },

    setNav(value: boolean) {
      this.isNavOpen = value
    },

    /* ---------------- THEME ---------------- */

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme

      // persist manually
      if (process.client) {
        localStorage.setItem(THEME_KEY, theme)
      }

      this.applyTheme()
    },

    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light')
    },

    // 🔥 call this on app start
    initTheme() {
      if (!process.client) return

      const saved = localStorage.getItem(THEME_KEY) as UIState['theme'] | null

      if (saved) {
        this.theme = saved
      } else {
        // optional: detect system theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        this.theme = prefersDark ? 'dark' : 'light'
      }

      this.applyTheme()
    },

    applyTheme() {
      if (!process.client) return

      const root = document.documentElement

      if (this.theme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
  },
})
