// app/composables/useOrderNumber.ts
// Generates and formats order numbers based on shop settings
import { useAuthStore } from '~/stores/auth'
import { getDb } from '~/db/schema'

export function useOrderNumber() {
  const auth = useAuthStore()

  async function generate(): Promise<string> {
    const db       = getDb()
    const settings = auth.shop?.settings
    const prefix   = settings?.orderNumberPrefix ?? 'ORD'
    const format   = settings?.orderNumberFormat ?? 'YYYY-NNN'

    const count = await db.orders.where('shopId').equals(auth.shopId!).count()
    const seq   = String(count + 1).padStart(4, '0')
    const year  = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')

    switch (format) {
      case 'NNN':         return `${prefix}-${seq}`
      case 'YYYY-NNN':    return `${prefix}-${year}-${seq}`
      case 'YYYY-MM-NNN': return `${prefix}-${year}-${month}-${seq}`
      default:            return `${prefix}-${year}-${seq}`
    }
  }

  function isValid(orderNumber: string): boolean {
    return /^[A-Z]+-\d{4}(-\d{4})?$/.test(orderNumber)
  }

  return { generate, isValid }
}
