import { ref, computed } from 'vue'
import Dexie from 'dexie'
import { z } from 'zod'
import { getDb, generateId, nowISO, coerceBoolsFromIndexedDB } from '~/db/schema'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { useAuthStore } from '~/stores/auth'
import { useMaterials } from '~/composables/useMaterials'
import type {
  StoreItem, StoreItemForm, SaleForm,
  MaterialUsageEntry, AdditionalCost,
  StoreItemStatus, GarmentCategory,
} from '~/types/models'
import type { MaterialStockMovement } from '~/types/models'
 
export const STORE_ITEM_STATUS_LABELS: Record<StoreItemStatus, string> = {
  draft:         'Draft',
  in_production: 'In production',
  ready:         'Ready to sell',
  sold:          'Sold',
  archived:      'Archived',
}
 
// Status progression: draft → in_production → ready → sold
// (archived is a terminal state reachable from any non-sold status)
export const STORE_STATUS_FLOW: StoreItemStatus[] = [
  'draft', 'in_production', 'ready', 'sold',
]
 
export const storeItemFormSchema = z.object({
  title:                z.string().min(1).max(200),
  description:          z.string().max(1000).optional(),
  category:             z.string(),
  sizeLabel:            z.string().optional(),
  sellingPrice:         z.number().min(0),
  measurementProfileId: z.string().uuid().optional(),
})
 
export function useStoreItems() {
  const auth = useAuthStore()
  const sync = useOfflineSync()
  const db   = getDb()
  const { materials: allMaterials, loadAll: loadMaterials } = useMaterials()
 
  const items      = ref<StoreItem[]>([])
  const isLoading  = ref(false)
  const filterStatus   = ref<StoreItemStatus | 'all'>('all')
  const filterCategory = ref<GarmentCategory | 'all'>('all')
  const searchQuery    = ref('')
 
  const filtered = computed(() => {
    let list = items.value
    if (filterStatus.value !== 'all') {
      list = list.filter(i => i.status === filterStatus.value)
    }
    if (filterCategory.value !== 'all') {
      list = list.filter(i => i.category === filterCategory.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(i => i.title.toLowerCase().includes(q))
    }
    return list
  })
 
  const stats = computed(() => ({
    total:        items.value.length,
    draft:        items.value.filter(i => i.status === 'draft').length,
    inProduction: items.value.filter(i => i.status === 'in_production').length,
    ready:        items.value.filter(i => i.status === 'ready').length,
    sold:         items.value.filter(i => i.status === 'sold').length,
    totalRevenue: items.value
      .filter(i => i.status === 'sold')
      .reduce((s, i) => s + (i.soldPrice ?? 0), 0),
    totalCostOfGoods: items.value
      .filter(i => i.status === 'sold')
      .reduce((s, i) => s + i.costPrice, 0),
  }))
 
  // ── Load ─────────────────────────────────────────────────────────────────
  async function loadAll(): Promise<void> {
    if (!auth.shopId) return
    isLoading.value = true
    try {
      const rows = await db.storeItems
        .where('[shopId+isDeleted]')
        .equals([auth.shopId, 0])
        .reverse()
        .sortBy('createdAt')
      items.value = rows.map(r => coerceBoolsFromIndexedDB(r))
    } finally {
      isLoading.value = false
    }
  }
 
  async function getById(id: string): Promise<StoreItem | undefined> {
    const row = await db.storeItems.get(id)
    return row ? coerceBoolsFromIndexedDB(row) : undefined
  }
 
  // ── Pricing helpers ───────────────────────────────────────────────────────
  function calcCostPrice(
    materialUsage: Pick<MaterialUsageEntry, 'quantity' | 'costAtTime' | 'source'>[],
    additionalCosts: Pick<AdditionalCost, 'amount'>[],
  ) {
    const materialCost = materialUsage
      .filter(m => m.source === 'inventory')
      .reduce((s, m) => s + m.quantity * m.costAtTime, 0)
    const extrasTotal = additionalCosts.reduce((s, c) => s + c.amount, 0)
    return { materialCost, costPrice: materialCost + extrasTotal }
  }
 
  // ── Create ────────────────────────────────────────────────────────────────
  async function create(form: StoreItemForm): Promise<StoreItem> {
    const parsed = storeItemFormSchema.parse(form)
    const { materialCost, costPrice } = calcCostPrice(
      form.materialUsage, form.additionalCosts
    )
 
    // Consume inventory materials immediately on draft creation?
    // NO — deduct stock only when status moves to 'in_production'.
    // This avoids phantom reservations for items that may never be made.
    const materialUsageWithIds: MaterialUsageEntry[] = form.materialUsage.map(m => ({
      ...m,
      id:     generateId(),
      locked: false,
    }))
 
    const item: StoreItem = {
      id:                   generateId(),
      shopId:               auth.shopId!,
      title:                parsed.title,
      description:          parsed.description,
      category:             parsed.category as GarmentCategory,
      status:               'draft',
      measurementProfileId: parsed.measurementProfileId,
      sizeLabel:            parsed.sizeLabel,
      materialUsage:        materialUsageWithIds,
      materialCost,
      additionalCosts:      form.additionalCosts,
      costPrice,
      sellingPrice:         parsed.sellingPrice,
      designImages:         [],
      isDeleted:            false,
      createdAt:            nowISO(),
      updatedAt:            nowISO(),
    }
 
    await sync.writeRecord('storeItems', 'INSERT', item)
    items.value = [item, ...items.value]
    return item
  }
 
  // ── Update (while in draft or in_production) ──────────────────────────────
  async function update(id: string, changes: Partial<StoreItemForm>): Promise<StoreItem> {
    const existing = await db.storeItems.get(id)
    if (!existing) throw new Error('Store item not found')
    if (existing.status === 'sold') throw new Error('Cannot edit a sold item')
 
    const materialUsage = changes.materialUsage
      ? changes.materialUsage.map(m => ({ ...m, id: generateId(), locked: false }))
      : existing.materialUsage
 
    const additionalCosts = changes.additionalCosts ?? existing.additionalCosts
    const { materialCost, costPrice } = calcCostPrice(materialUsage, additionalCosts)
 
    const updated: StoreItem = {
      ...existing,
      ...changes,
      materialUsage,
      additionalCosts,
      materialCost,
      costPrice,
      updatedAt: nowISO(),
    }
 
    // If status is in_production, recalculate stock:
    // reverse previous consumption then re-consume
    if (existing.status === 'in_production' && changes.materialUsage) {
      await reverseStockForItem(id)
      await consumeStockForItem(id, materialUsage)
    }
 
    await sync.writeRecord('storeItems', 'UPDATE', updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }
 
  // ── Advance status ────────────────────────────────────────────────────────
  async function advanceStatus(id: string): Promise<StoreItem> {
    const item = await db.storeItems.get(id)
    if (!item) throw new Error('Store item not found')
 
    const currentIdx = STORE_STATUS_FLOW.indexOf(item.status)
    if (currentIdx === -1 || currentIdx >= STORE_STATUS_FLOW.length - 1) {
      throw new Error('Cannot advance status further')
    }
 
    const newStatus = STORE_STATUS_FLOW[currentIdx + 1]
 
    // On transition draft → in_production: deduct stock
    if (item.status === 'draft' && newStatus === 'in_production') {
      await consumeStockForItem(id, item.materialUsage)
    }
 
    const updated: StoreItem = { ...item, status: newStatus, updatedAt: nowISO() }
    await sync.writeRecord('storeItems', 'UPDATE', updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }
 
  // ── Record sale ───────────────────────────────────────────────────────────
  async function recordSale(id: string, saleForm: SaleForm): Promise<StoreItem> {
    const item = await db.storeItems.get(id)
    if (!item) throw new Error('Store item not found')
    if (item.status !== 'ready') throw new Error('Item must be "ready" before recording a sale')
 
    const updated: StoreItem = {
      ...item,
      status:            'sold',
      soldAt:            nowISO(),
      soldPrice:         saleForm.soldPrice,
      soldToName:        saleForm.soldToName,
      soldToPhone:       saleForm.soldToPhone,
      salePaymentMethod: saleForm.salePaymentMethod,
      saleNotes:         saleForm.saleNotes,
      updatedAt:         nowISO(),
    }
 
    await sync.writeRecord('storeItems', 'UPDATE', updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }
 
  // ── Archive ───────────────────────────────────────────────────────────────
  async function archive(id: string): Promise<void> {
    const item = await db.storeItems.get(id)
    if (!item) throw new Error('Store item not found')
 
    // Return stock if item was in production or ready
    if (['in_production', 'ready'].includes(item.status)) {
      await reverseStockForItem(id)
    }
 
    const updated: StoreItem = { ...item, status: 'archived', updatedAt: nowISO() }
    await sync.writeRecord('storeItems', 'UPDATE', updated)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
  }
 
  // ── Stock helpers ─────────────────────────────────────────────────────────
  async function consumeStockForItem(
    storeItemId: string,
    materialUsage: MaterialUsageEntry[],
  ): Promise<void> {
    for (const m of materialUsage) {
      if (m.source !== 'inventory' || !m.materialId) continue
      const mat = await db.materials.get(m.materialId)
      if (!mat) continue
 
      const movement: MaterialStockMovement = {
        id:           generateId(),
        shopId:       auth.shopId!,
        materialId:   m.materialId,
        storeItemId,
        movementType: 'store_item_consume',
        quantity:     m.quantity,
        unit:         m.unit,
        unitCost:     m.costAtTime,
        createdAt:    nowISO(),
      }
      await sync.writeRecord('materialStockMovements', 'INSERT', movement as any)
 
      await sync.writeRecord('materials', 'UPDATE', {
        ...mat,
        currentStock: Math.max(0, mat.currentStock - m.quantity),
        updatedAt:    nowISO(),
      })
    }
  }
 
  async function reverseStockForItem(storeItemId: string): Promise<void> {
    const movements = await db.materialStockMovements
      .where('[storeItemId+createdAt]')
      .between([storeItemId, Dexie.minKey], [storeItemId, Dexie.maxKey])
      .filter(m => m.movementType === 'store_item_consume')
      .toArray()
 
    for (const m of movements) {
      const mat = await db.materials.get(m.materialId)
      if (!mat) continue
 
      const reversal: MaterialStockMovement = {
        id:           generateId(),
        shopId:       auth.shopId!,
        materialId:   m.materialId,
        storeItemId,
        movementType: 'store_item_reverse',
        quantity:     m.quantity,
        unit:         m.unit,
        unitCost:     m.unitCost,
        note:         `Reversal of ${m.id}`,
        createdAt:    nowISO(),
      }
      await sync.writeRecord('materialStockMovements', 'INSERT', reversal as any)
 
      await sync.writeRecord('materials', 'UPDATE', {
        ...mat,
        currentStock: mat.currentStock + m.quantity,
        updatedAt:    nowISO(),
      })
    }
  }
 
  // ── Remove ────────────────────────────────────────────────────────────────
  async function remove(id: string): Promise<void> {
    await archive(id)
    await sync.writeRecord('storeItems', 'DELETE', { id, shopId: auth.shopId! } as StoreItem)
    items.value = items.value.filter(i => i.id !== id)
  }
 
  return {
    items, filtered, stats, isLoading,
    filterStatus, filterCategory, searchQuery,
    loadAll, getById, create, update,
    advanceStatus, recordSale, archive, remove,
    calcCostPrice,
    STORE_ITEM_STATUS_LABELS, STORE_STATUS_FLOW,
  }
}
