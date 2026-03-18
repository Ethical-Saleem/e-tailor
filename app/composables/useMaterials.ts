// app/composables/useMaterials.ts
import { ref, computed } from 'vue'
import { z } from 'zod'
import { getDb, generateId, nowISO, coerceBoolsFromIndexedDB } from '~/db/schema'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { useAuthStore } from '~/stores/auth'
import type {
  Material, MaterialForm, MaterialPriceEntry, PurchaseForm,
  MaterialCategory,
} from '~/types/models'

export const materialSchema = z.object({
  name:         z.string().min(1).max(120),
  category:     z.string(),
  unit:         z.string(),
  sku:          z.string().optional(),
  color:        z.string().optional(),
  description:  z.string().max(500).optional(),
  currentStock: z.number().min(0),
  minimumStock: z.number().min(0),
})

export const purchaseSchema = z.object({
  materialId:        z.string().uuid(),
  unitCost:          z.number().min(0),
  quantityPurchased: z.number().min(0),
  supplier:          z.string().optional(),
  purchaseDate:      z.string(),
  notes:             z.string().optional(),
})

export function useMaterials() {
  const auth = useAuthStore()
  const sync = useOfflineSync()
  const db   = getDb()

  const materials  = ref<Material[]>([])
  const isLoading  = ref(false)
  const filterCategory = ref<MaterialCategory | 'all'>('all')
  const searchQuery    = ref('')

  // Filtered list
  const filtered = computed(() => {
    let list = materials.value
    if (filterCategory.value !== 'all') {
      list = list.filter(m => m.category === filterCategory.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.color?.toLowerCase().includes(q),
      )
    }
    return list
  })

  // Low stock alerts
  const lowStock = computed(() =>
    materials.value.filter(m => m.currentStock <= m.minimumStock && !m.isDeleted),
  )

  // Inventory value
  const totalValue = computed(() =>
    materials.value.reduce((s, m) => s + (m.currentStock * m.currentUnitCost), 0),
  )

  // ── Load ───────────────────────────────────────────────────────────────────
  async function loadAll(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true
    try {
      const rows = await db.materials
        .where('[shopId+isDeleted]')
        .equals([auth.shopId, 0])
        .sortBy('name')

      materials.value = rows.map((r) => coerceBoolsFromIndexedDB(r))
    } catch (err) {
      console.error('[Materials] Load failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function getById(id: string): Promise<Material | undefined> {
    const row = db.materials.get(id)
    return coerceBoolsFromIndexedDB(row)
  }

  async function getPriceHistory(materialId: string): Promise<MaterialPriceEntry[]> {
    return db.materialPriceHistory
      .where('[materialId+purchaseDate]')
      .between([materialId, Dexie.minKey], [materialId, Dexie.maxKey])
      .reverse()
      .toArray()
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function create(form: MaterialForm): Promise<Material> {
    const parsed = materialSchema.parse(form)

    const material: Material = {
      id:               generateId(),
      shopId:           auth.shopId!,
      name:             parsed.name,
      category:         parsed.category as MaterialCategory,
      unit:             parsed.unit as Material['unit'],
      sku:              parsed.sku,
      color:            parsed.color,
      description:      parsed.description,
      imageUrl:         undefined,
      currentStock:     parsed.currentStock,
      minimumStock:     parsed.minimumStock,
      currentUnitCost:  0,
      averageUnitCost:  0,
      isDeleted:        false,
      createdAt:        nowISO(),
      updatedAt:        nowISO(),
    }

    await sync.writeRecord('materials', 'INSERT', material)
    materials.value = [...materials.value, material].sort((a, b) => a.name.localeCompare(b.name))
    return material
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async function update(id: string, form: Partial<MaterialForm>): Promise<Material> {
    const existing = await db.materials.get(id)
    if (!existing) throw new Error('Material not found')

    const updated: Material = { ...existing, ...form, updatedAt: nowISO() }
    await sync.writeRecord('materials', 'UPDATE', updated)

    const idx = materials.value.findIndex(m => m.id === id)
    if (idx !== -1) materials.value[idx] = updated

    return updated
  }

  // ── Record purchase (stock-in + price history) ─────────────────────────────
  async function recordPurchase(form: PurchaseForm): Promise<MaterialPriceEntry> {
    const parsed = purchaseSchema.parse(form)
    const material = await db.materials.get(parsed.materialId)
    if (!material) throw new Error('Material not found')

    const entry: MaterialPriceEntry = {
      id:                generateId(),
      materialId:        parsed.materialId,
      shopId:            auth.shopId!,
      unitCost:          parsed.unitCost,
      quantityPurchased: parsed.quantityPurchased,
      totalCost:         parsed.unitCost * parsed.quantityPurchased,
      supplier:          parsed.supplier,
      purchaseDate:      parsed.purchaseDate,
      notes:             parsed.notes,
      createdAt:         nowISO(),
    }

    await sync.writeRecord('materialPriceHistory', 'INSERT', entry as unknown as Parameters<typeof sync.writeRecord>[2])

    // Update material stock and cost
    const newStock   = material.currentStock + parsed.quantityPurchased
    const allHistory = await getPriceHistory(parsed.materialId)
    const totalQty   = allHistory.reduce((s, h) => s + h.quantityPurchased, 0) + parsed.quantityPurchased
    const totalCost  = allHistory.reduce((s, h) => s + h.totalCost, 0) + entry.totalCost
    const avgCost    = totalQty > 0 ? totalCost / totalQty : 0

    const updatedMaterial: Material = {
      ...material,
      currentStock:    newStock,
      currentUnitCost: parsed.unitCost,
      averageUnitCost: avgCost,
      updatedAt:       nowISO(),
    }

    await sync.writeRecord('materials', 'UPDATE', updatedMaterial)

    const idx = materials.value.findIndex(m => m.id === parsed.materialId)
    if (idx !== -1) materials.value[idx] = updatedMaterial

    return entry
  }

  // ── Adjust stock (manual correction) ──────────────────────────────────────
  async function adjustStock(id: string, newStock: number, note?: string): Promise<void> {
    const material = await db.materials.get(id)
    if (!material) throw new Error('Material not found')

    const updated: Material = { ...material, currentStock: newStock, updatedAt: nowISO() }
    await sync.writeRecord('materials', 'UPDATE', updated)

    const idx = materials.value.findIndex(m => m.id === id)
    if (idx !== -1) materials.value[idx] = updated
  }

  // ── Consume stock (when used in an order) ─────────────────────────────────
  async function consumeStock(id: string, quantity: number): Promise<void> {
    const material = await db.materials.get(id)
    if (!material) throw new Error('Material not found')

    const newStock = Math.max(0, material.currentStock - quantity)
    await adjustStock(id, newStock)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function remove(id: string): Promise<void> {
    await sync.writeRecord('materials', 'DELETE', { id, shopId: auth.shopId! } as Material)
    materials.value = materials.value.filter(m => m.id !== id)
  }

  return {
    // State
    materials,
    filtered,
    lowStock,
    totalValue,
    isLoading,
    filterCategory,
    searchQuery,
    // Actions
    loadAll,
    getById,
    getPriceHistory,
    create,
    update,
    recordPurchase,
    adjustStock,
    consumeStock,
    remove,
  }
}

import Dexie from 'dexie'
