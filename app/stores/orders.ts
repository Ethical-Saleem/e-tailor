// app/stores/orders.ts
import { defineStore } from 'pinia'
import { getDb } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'
import type { Order, OrderStatus } from '~/types/models'
import dayjs from 'dayjs'

interface OrdersState {
  orders:    Order[]
  isLoaded:  boolean
}

export const useOrdersStore = defineStore('orders', {
  state: (): OrdersState => ({
    orders:   [],
    isLoaded: false,
  }),

  getters: {
    activeOrders: (state) =>
      state.orders.filter(o => !['delivered', 'cancelled'].includes(o.status)),

    overdueCount: (state) => {
      const today = dayjs().format('YYYY-MM-DD')
      return state.orders.filter(o =>
        o.dueDate && o.dueDate < today &&
        !['delivered', 'cancelled'].includes(o.status),
      ).length
    },

    byStatus: (state) => (status: OrderStatus) =>
      state.orders.filter(o => o.status === status),

    totalOutstanding: (state) =>
      state.orders
        .filter(o => o.paymentStatus !== 'paid' && o.status !== 'cancelled')
        .reduce((s, o) => s + Math.max(0, o.total - o.amountPaid), 0),
  },

  actions: {
    async loadAll() {
      const auth = useAuthStore()
      if (!auth.shopId || this.isLoaded) return

      const db = getDb()
      this.orders = await db.orders
        .where('shopId').equals(auth.shopId)
        .filter(o => !o.isDeleted)
        .reverse()
        .sortBy('createdAt')
      this.isLoaded = true
    },

    upsert(order: Order) {
      const idx = this.orders.findIndex(o => o.id === order.id)
      if (idx !== -1) this.orders[idx] = order
      else this.orders.unshift(order)
    },

    remove(id: string) {
      this.orders = this.orders.filter(o => o.id !== id)
    },

    invalidate() {
      this.isLoaded = false
    },
  },
})
