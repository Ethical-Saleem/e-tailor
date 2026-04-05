// app/composables/useOfflineSync.ts
// ─────────────────────────────────────────────────────────────────────────────
// The heart of the offline-first architecture.
//
// Strategy:
//   1. Every write goes to IndexedDB FIRST (instant, never fails offline)
//   2. The operation is added to syncQueue
//   3. When online, a processor drains the queue via Supabase upsert/delete
//   4. On app start and on reconnect, we also pull remote changes (delta sync)
//   5. Conflicts: last-write-wins by updatedAt. Critical conflicts are flagged.
// ─────────────────────────────────────────────────────────────────────────────

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getDb, generateId, nowISO, toSnake, coerceBoolsForIndexedDB } from '~/db/schema'
import type { SyncRecord } from '~/types/models'

// ── Sync state ────────────────────────────────────────────────────────────────
const isOnline         = ref(true)
const isSyncing        = ref(false)
const pendingCount     = ref(0)
const lastSyncedAt     = ref<string | null>(null)
const syncError        = ref<string | null>(null)

// Tables that participate in sync (ordered by dependency)
const SYNC_TABLES = [
  'customers',
  'measurementProfiles',
  'orders',
  'orderEvents',
  'materials',
  'materialPriceHistory',
  'materialStockMovements',
  'payments',
  'storeItems',
] as const

const APPEND_ONLY_TABLES = new Set<SyncTable>([
  'orderEvents',
  'materialPriceHistory', 
  'payments',
])

type SyncTable = typeof SYNC_TABLES[number]

// ── Supabase table name map (camelCase → snake_case table name) ───────────────
const TABLE_MAP: Record<SyncTable, string> = {
  customers:            'customers',
  measurementProfiles:  'measurement_profiles',
  orders:               'orders',
  orderEvents:          'order_events',
  materials:            'materials',
  materialPriceHistory: 'material_price_history',
  materialStockMovements: 'material_stock_movements',
  payments:             'payments',
  storeItems:           'store_items',
} as const satisfies Record<SyncTable, string>

const MUTABLE_SYNC_TABLES = SYNC_TABLES.filter(
  (t): t is Exclude<SyncTable, 'orderEvents' | 'materialPriceHistory' | 'payments'> =>
    !APPEND_ONLY_TABLES.has(t),
)

// The Supabase table name union for mutable tables only
type MutableSupabaseTable = typeof TABLE_MAP[typeof MUTABLE_SYNC_TABLES[number]]

export function useOfflineSync() {
  const supabase  = useSupabaseClient()
  const authStore = useAuthStore()

  // ── Status helpers ──────────────────────────────────────────────────────────
  const syncStatus = computed(() => {
    if (!isOnline.value) return 'offline'
    if (isSyncing.value)  return 'syncing'
    if (pendingCount.value > 0) return 'pending'
    if (syncError.value)  return 'error'
    return 'synced'
  })

  const syncLabel = computed(() => {
    switch (syncStatus.value) {
      case 'offline':  return 'Offline — changes saved locally'
      case 'syncing':  return `Syncing ${pendingCount.value} change${pendingCount.value > 1 ? 's' : ''}…`
      case 'pending':  return `${pendingCount.value} change${pendingCount.value > 1 ? 's' : ''} pending sync`
      case 'error':    return 'Sync error — will retry'
      case 'synced':   return lastSyncedAt.value
        ? `Synced · ${formatRelativeTime(lastSyncedAt.value)}`
        : 'All data synced'
    }
  })

  // ── Write helper: ALL mutations go through this ─────────────────────────────
  async function writeRecord<T extends { id: string; updatedAt: string; _syncStatus?: string }>(
    tableName: SyncTable,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: T,
  ): Promise<T> {
    const db = getDb()
    const isAppendOnly = APPEND_ONLY_TABLES.has(tableName)

    // 1. Stamp metadata
    // Only stamp updatedAt on tables that have the column
  const record = isAppendOnly
    ? { ...data, _syncStatus: 'pending' }
    : { ...data, updatedAt: nowISO(), _syncStatus: 'pending' }

    // 2. Write to IndexedDB (always succeeds, even offline)
    // Append-only tables don't support UPDATE or DELETE
  if (isAppendOnly && operation !== 'INSERT') {
    console.warn(`[Sync] ${tableName} is append-only — ignoring ${operation}`)
    return data
  }

  const table = db[tableName] as unknown as Dexie.Table<T, string>
  const storable = coerceBoolsForIndexedDB(record)
  await table.put(storable)

    // 3. Enqueue for cloud sync
    await db.syncQueue.add({
      tableName,
      recordId: record.id,
      operation,
      payload:  operation === 'DELETE' ? { id: record.id } : record,
      status:   'pending',
      retryCount: 0,
      createdAt: nowISO(),
    })

    // 4. Update pending count
    await refreshPendingCount()

    // 5. Attempt immediate sync if online
    if (isOnline.value && !isSyncing.value) {
      processQueue().catch(console.error)
    }

    return record
  }

  // ── Queue processor ─────────────────────────────────────────────────────────
  async function processQueue(): Promise<void> {
    if (isSyncing.value || !isOnline.value) return

    const db = getDb()
    const pending = await db.syncQueue
      .where('[status+createdAt]')
      .between(['pending', Dexie.minKey], ['pending', Dexie.maxKey])
      .limit(50)
      .toArray()

    if (pending.length === 0) {
      await refreshPendingCount()
      return
    }

    isSyncing.value = true
    syncError.value = null

    const MAX_RETRIES = 3

    for (const record of pending) {
      if (!isOnline.value) break // abort mid-batch if we go offline

      // Mark as syncing
      await db.syncQueue.update(record.id!, { status: 'syncing' })

      try {
        const supabaseTable = TABLE_MAP[record.tableName as SyncTable]
        const payload = toSnake(record.payload as Record<string, unknown>) as any

        if (record.operation === 'DELETE') {
          const { error } = await supabase
            .from(supabaseTable)
            .update({ is_deleted: true, updated_at: nowISO() })
            .eq('id', record.recordId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from(supabaseTable)
            .upsert(payload, { onConflict: 'id' })
          if (error) throw error
        }

        // ✓ Success — remove from queue, mark local record as synced
        await db.syncQueue.delete(record.id!)
        await (db[record.tableName as SyncTable] as Dexie.Table).update(
          record.recordId,
          { _syncStatus: 'synced' },
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[Sync] Failed ${record.tableName}/${record.recordId}:`, message)

        const newRetryCount = record.retryCount + 1

        if (newRetryCount >= MAX_RETRIES) {
          await db.syncQueue.update(record.id!, {
            status: 'failed',
            retryCount: newRetryCount,
            lastError: message,
          })
        } else {
          await db.syncQueue.update(record.id!, {
            status: 'pending',
            retryCount: newRetryCount,
            lastError: message,
          })
        }

        // If it's an auth/network error, stop processing
        if (message.includes('401') || message.includes('network')) {
          syncError.value = message
          break
        }
      }
    }

    isSyncing.value  = false
    lastSyncedAt.value = nowISO()
    await refreshPendingCount()

    // Persist last synced time
    await db.syncMeta.put({ key: 'last_synced_at', lastSyncedAt: lastSyncedAt.value!, lastSyncedVersion: 1 })
  }

  // ── Pull remote changes (delta sync) ─────────────────────────────────────────
  // Called on app start and when coming back online.
  // Fetches records updated since lastSyncedAt from Supabase.
  async function pullRemoteChanges(): Promise<void> {
    if (!isOnline.value || !authStore.shopId) return

    // Stamp BEFORE fetching so any writes that happen during
    // the pull are captured in the next sync window
    const pullStartedAt = nowISO()

    const db = getDb()
    const meta = await db.syncMeta.get('last_synced_at')
    const since = meta?.lastSyncedAt ?? '1970-01-01T00:00:00Z'

    for (const tableKey of MUTABLE_SYNC_TABLES) {
      // Skip append-only tables — they don't have updated_at
      // and are never mutated remotely after insert
      if (APPEND_ONLY_TABLES.has(tableKey)) continue

      const supabaseTable: MutableSupabaseTable = TABLE_MAP[tableKey]
      try {
        const { data, error } = await supabase
          .from(supabaseTable)
          .select('*')
          .eq('shop_id', authStore.shopId)
          .gt('updated_at', since)
          .order('updated_at', { ascending: true })

        if (error) {
          console.error(`[Sync] Pull failed for ${supabaseTable}:`, error.message)
          continue
        }

        if (!data || data.length === 0) continue

        // Merge into local IndexedDB
        const localTable = db[tableKey] as Dexie.Table
        await db.transaction('rw', localTable, async () => {
          for (const row of data) {
            const local = await localTable.get(row.id)

            const remoteUpdatedAt = (row as Record<string, unknown>)['updated_at'] as string

            // Conflict resolution: remote wins if remote updatedAt > local
            if (local && local.updatedAt > remoteUpdatedAt) {
              // Local is newer — keep local, but ensure it's in the sync queue
              continue
            }

            // Remap snake_case → camelCase
            const camelRow = toCamel<Record<string, unknown>>(row as Record<string, unknown>)
            const storable = coerceBoolsForIndexedDB({ ...camelRow, _syncStatus: 'synced' })
            await localTable.put(storable)
          }
        })

        // Only persist the timestamp after everything succeeds
        lastSyncedAt.value = pullStartedAt
        await db.syncMeta.put({
          key: 'last_synced_at',
          lastSyncedAt: pullStartedAt,
          lastSyncedVersion: 1,
        })
      } catch (err) {
        console.error(`[Sync] Exception pulling ${supabaseTable}:`, err)
      }
    }

    // Fix 2: pull append-only tables too, just without updated_at filtering
    // Add a separate loop after the mutable tables loop:

    for (const tableKey of APPEND_ONLY_TABLES) {
      const supabaseTable = TABLE_MAP[tableKey as SyncTable]
      try {
        const { data, error } = await supabase
          .from(supabaseTable)
          .select('*')
          .eq('shop_id', authStore.shopId)
          .gt('created_at', since)   // use created_at, not updated_at
          .order('created_at', { ascending: true })

        if (error || !data?.length) continue

        const localTable = db[tableKey as SyncTable] as unknown as Dexie.Table
        await db.transaction('rw', localTable, async () => {
          for (const row of data) {
            const existing = await localTable.get(row.id)
            if (existing) continue   // append-only: never overwrite local
            const camelRow = toCamel<Record<string, unknown>>(row as Record<string, unknown>)
            await localTable.put({ ...camelRow, _syncStatus: 'synced' })
          }
        })
      } catch (err) {
        console.error(`[Sync] Exception pulling ${supabaseTable}:`, err)
      }
    }

    lastSyncedAt.value = nowISO()
    await db.syncMeta.put({
      key: 'last_synced_at',
      lastSyncedAt: lastSyncedAt.value,
      lastSyncedVersion: 1,
    })
  }

  // ── Refresh pending count ──────────────────────────────────────────────────
  async function refreshPendingCount(): Promise<void> {
    const db = getDb()
    pendingCount.value = await db.syncQueue
      .where('status')
      .anyOf('pending', 'syncing')
      .count()
  }

  // ── Network listeners ──────────────────────────────────────────────────────
  function handleOnline() {
    isOnline.value = true
    syncError.value = null
    // Pull remote changes first, then push local queue
    pullRemoteChanges()
      .then(() => processQueue())
      .catch(console.error)
  }

  function handleOffline() {
    isOnline.value = false
    isSyncing.value = false
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  onMounted(async () => {
    isOnline.value = navigator.onLine
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Restore last synced time from DB
    const db = getDb()
    const meta = await db.syncMeta.get('last_synced_at')
    if (meta) lastSyncedAt.value = meta.lastSyncedAt

    await refreshPendingCount()

    // Initial sync on mount
    if (isOnline.value) {
      await pullRemoteChanges()
      await processQueue()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  // ── Retry failed records ──────────────────────────────────────────────────
  async function retryFailed(): Promise<void> {
    const db = getDb()
    await db.syncQueue
      .where('status')
      .equals('failed')
      .modify({ status: 'pending', retryCount: 0 })
    await processQueue()
  }

  return {
    // State
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncedAt,
    syncError,
    syncStatus,
    syncLabel,
    // Actions
    writeRecord,
    processQueue,
    pullRemoteChanges,
    refreshPendingCount,
    retryFailed,
  }
}

// ── Utility: relative time ────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60)  return 'just now'
  if (seconds < 120) return '1 min ago'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

// Need to import Dexie for Dexie.minKey etc. in the queue processor
import Dexie from 'dexie'
import { toCamel } from '~/db/schema'
import { useAuthStore } from '~/stores/auth'
