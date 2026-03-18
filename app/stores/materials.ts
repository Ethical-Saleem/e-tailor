// app/stores/materials.ts
import { defineStore } from 'pinia'
import { getDb } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'
import type { Material } from '~/types/models'

export const useMaterialsStore = defineStore('materials', {
  state: () => ({
    materials: [] as Material[],
    isLoaded:  false,
  }),

  getters: {
    lowStockCount: (state) =>
      state.materials.filter(m => m.currentStock <= m.minimumStock && m.minimumStock > 0).length,

    inventoryValue: (state) =>
      state.materials.reduce((s, m) => s + m.currentStock * m.currentUnitCost, 0),

    byCategory: (state) => (category: string) =>
      state.materials.filter(m => m.category === category),
  },

  actions: {
    async loadAll() {
      const auth = useAuthStore()
      if (!auth.shopId || this.isLoaded) return

      const db = getDb()
      this.materials = await db.materials
        .where('shopId').equals(auth.shopId)
        .filter(m => !m.isDeleted)
        .sortBy('name')
      this.isLoaded = true
    },

    upsert(material: Material) {
      const idx = this.materials.findIndex(m => m.id === material.id)
      if (idx !== -1) this.materials[idx] = material
      else this.materials.push(material)
    },

    remove(id: string) {
      this.materials = this.materials.filter(m => m.id !== id)
    },

    invalidate() {
      this.isLoaded = false
    },
  },
})
