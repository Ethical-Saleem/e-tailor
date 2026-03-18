<!-- app/components/dashboard/TopCustomerRow.vue -->
<template>
  <NuxtLink :to="`/customers/${customer.id}`" class="flex items-center gap-3 px-4 py-3 hover:bg-cream transition-colors">
    <div class="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
      <span class="font-display text-sm text-gold">{{ rank }}</span>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-ink truncate">{{ customer.name }}</p>
      <div class="mt-1 h-1 bg-cream-dark rounded-full overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-gold/50 to-gold transition-all duration-700"
          :style="{ width: `${Math.round((customer.totalSpend / maxSpend) * 100)}%` }"
        />
      </div>
    </div>
    <p class="font-mono-dm text-sm text-ink flex-shrink-0">{{ fmt(customer.totalSpend) }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  rank: number
  customer: { id: string; name: string; totalSpend: number; orderCount: number }
  maxSpend: number
}>()

const auth = useAuthStore()
function fmt(n: number) { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }
</script>
