// app/composables/useMeasurements.ts
import { ref } from 'vue'
import { z } from 'zod'
import { getDb, generateId, nowISO } from '~/db/schema'
import { useOfflineSync } from '~/composables/useOfflineSync'
import { useAuthStore } from '~/stores/auth'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type { MeasurementProfile, GarmentCategory } from '~/types/models'
import { coerceBoolsFromIndexedDB } from '~/db/schema'

export const garmentCategories = [
  'shirt',
  'trouser',
  'suit',
  'dress',
  'gown',
  'skirt',
  'blouse',
  'jacket',
  'abaya',
  'ankara',
  'asoebi',
  'agbada',
  'custom',
] as const

export const measurementSchema = z.object({
  customerId:   z.string().uuid().optional(),
  label:        z.string().min(1).max(120),
  category:     z.enum(garmentCategories),
  measurements: z.record(z.string(), z.number()),
  unit:         z.enum(['inches', 'cm']).default('inches'),
  notes:        z.string().optional(),
  isTemplate:   z.boolean().default(false),
  takenBy:      z.string().optional(),
  takenAt:      z.string().optional(),
})

export function useMeasurements() {
  const auth = useAuthStore()
  const sync = useOfflineSync()
  const db   = getDb()

  const profiles   = ref<MeasurementProfile[]>([])
  const templates  = ref<MeasurementProfile[]>([])
  const isLoading  = ref(false)

  async function loadForCustomer(customerId: string): Promise<void> {
    profiles.value = await db.measurementProfiles
      .where('[shopId+customerId]')
      .equals([auth.shopId!, customerId])
      .reverse()
      .sortBy('createdAt')
  }

  async function loadTemplates(): Promise<void> {
    const rows = await db.measurementProfiles
      .where('[shopId+isTemplate]')
      .equals([auth.shopId!, 1])
      .toArray()

    const coercedRes = rows.map((r) => coerceBoolsFromIndexedDB(r))
    templates.value = coercedRes
  }

  async function getById(id: string): Promise<MeasurementProfile | undefined> {
    return db.measurementProfiles.get(id)
  }

  async function create(form: z.infer<typeof measurementSchema>): Promise<MeasurementProfile> {
    const parsed = measurementSchema.parse(form)

    const profile: MeasurementProfile = {
      id:            generateId(),
      shopId:        auth.shopId!,
      customerId:    parsed.customerId ?? undefined,
      label:         parsed.label,
      category:      parsed.category as GarmentCategory,
      measurements:  parsed.measurements,
      unit:          parsed.unit,
      notes:         parsed.notes,
      isTemplate:    parsed.isTemplate,
      designImages:  [],
      takenBy:       parsed.takenBy,
      takenAt:       parsed.takenAt,
      isDeleted:     false,
      createdAt:     nowISO(),
      updatedAt:     nowISO(),
    }

    await sync.writeRecord('measurementProfiles', 'INSERT', profile)
    profiles.value = [profile, ...profiles.value]
    return profile
  }

  async function update(id: string, form: Partial<z.infer<typeof measurementSchema>>): Promise<MeasurementProfile> {
    const existing = await db.measurementProfiles.get(id)
    if (!existing) throw new Error('Profile not found')

    const updated: MeasurementProfile = { ...existing, ...form, updatedAt: nowISO() }

    if (form.category !== undefined) {
      updated.category = form.category as GarmentCategory
    }

    await sync.writeRecord('measurementProfiles', 'UPDATE', updated)

    const idx = profiles.value.findIndex(p => p.id === id)
    if (idx !== -1) profiles.value[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await sync.writeRecord('measurementProfiles', 'DELETE', { id, shopId: auth.shopId! } as MeasurementProfile)
    profiles.value = profiles.value.filter(p => p.id !== id)
  }

  // Get default fields for a garment category
  function getFieldsForCategory(category: GarmentCategory): string[] {
    return MEASUREMENT_FIELDS[category] ?? []
  }

  // Convert between inches and cm
  function convert(value: number, from: 'inches' | 'cm', to: 'inches' | 'cm'): number {
    if (from === to) return value
    return from === 'inches' ? value * 2.54 : value / 2.54
  }

  // Compare two measurement profiles
  function diff(a: MeasurementProfile, b: MeasurementProfile): Record<string, { old: number; new: number; delta: number }> {
    const result: Record<string, { old: number; new: number; delta: number }> = {}
    const allKeys = new Set([...Object.keys(a.measurements), ...Object.keys(b.measurements)])
    for (const key of allKeys) {
      const aVal = a.measurements[key] ?? 0
      const bVal = b.measurements[key] ?? 0
      if (aVal !== bVal) {
        result[key] = { old: aVal, new: bVal, delta: bVal - aVal }
      }
    }
    return result
  }

  return {
    profiles,
    templates,
    isLoading,
    loadForCustomer,
    loadTemplates,
    getById,
    create,
    update,
    remove,
    getFieldsForCategory,
    convert,
    diff,
  }
}
