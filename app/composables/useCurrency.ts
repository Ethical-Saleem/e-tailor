// app/composables/useCurrency.ts
// ─────────────────────────────────────────────────────────────────────────────
// Currency formatting helpers, auto-scoped to the active shop's currency.
// ─────────────────────────────────────────────────────────────────────────────

import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

export function useCurrency() {
  const auth = useAuthStore()

  const symbol   = computed(() => auth.shop?.currencySymbol)
  const currency = computed(() => auth.shop?.currency)

  /**
   * Format a number as currency.
   * e.g. 1500000 → "₦1,500,000"
   */
  function fmt(amount: number, opts?: { compact?: boolean; decimals?: number }): string {
    const { compact = false, decimals = 0 } = opts ?? {}

    if (compact) {
      if (amount >= 1_000_000) return `${symbol.value}${(amount / 1_000_000).toFixed(1)}M`
      if (amount >= 1_000)     return `${symbol.value}${(amount / 1_000).toFixed(0)}k`
    }

    return `${symbol.value}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }

  /**
   * Format compact for stat cards: ₦1.2M, ₦847k, ₦4,000
   */
  function compact(amount: number): string {
    return fmt(amount, { compact: true })
  }

  /**
   * Parse a currency string back to a number.
   */
  function parse(value: string): number {
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0
  }

  /**
   * Calculate percentage change between two values.
   */
  function changePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  /**
   * Format a change percentage with sign and arrow.
   * e.g. +18.3% ↑ or -5.1% ↓
   */
  function fmtChange(pct: number): { label: string; positive: boolean } {
    const abs = Math.abs(pct)
    const sign = pct >= 0 ? '↑' : '↓'
    return {
      label:    `${sign} ${abs.toFixed(1)}%`,
      positive: pct >= 0,
    }
  }

  return { symbol, currency, fmt, compact, parse, changePercent, fmtChange }
}
