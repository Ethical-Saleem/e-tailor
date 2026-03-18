<!-- app/pages/customers/index.vue -->
<template>
  <div class="animate-fade-in">
    <header class="page-header">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="page-title">Clients</h1>
          <p class="page-subtitle">{{ customers.length }} registered · {{ newThisMonth }} new this month</p>
        </div>
        <NuxtLink to="/customers/new" class="header-action-btn">
          <UserPlus :size="18" stroke-width="1.8" class="stroke-white/70" />
        </NuxtLink>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24">
      <!-- Search -->
      <div class="search-bar mb-3">
        <Search :size="16" stroke-width="2" />
        <input v-model="searchQuery" placeholder="Search by name or phone…" />
        <button v-if="searchQuery" @click="searchQuery = ''" class="text-ink-muted">
          <X :size="14" stroke-width="2" />
        </button>
      </div>

      <!-- Tag chips -->
      <div class="chips mb-4">
        <button
          v-for="tag in tagChips"
          :key="tag.value"
          :class="['chip', activeTag === tag.value ? 'chip-active' : 'chip-inactive']"
          @click="activeTag = tag.value"
        >
          {{ tag.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-20 skeleton rounded-xl" />
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" class="empty-state py-12">
        <div class="empty-state-icon">
          <Users :size="28" stroke-width="1.5" class="stroke-ink-muted" />
        </div>
        <p class="empty-state-title">No clients found</p>
        <p class="empty-state-desc">{{ searchQuery ? 'Try a different search term' : 'Start by adding your first client' }}</p>
        <NuxtLink to="/customers/new" class="btn btn-primary btn-md mt-4">Add Client</NuxtLink>
      </div>

      <!-- List grouped by first letter -->
      <div v-else>
        <template v-for="group in groupedCustomers" :key="group.letter">
          <div class="flex items-center gap-2 my-3">
            <span class="font-display text-base text-gold font-medium">{{ group.letter }}</span>
            <div class="flex-1 h-px bg-cream-dark" />
          </div>
          <div class="card divide-y divide-cream-dark mb-2">
            <NuxtLink
              v-for="c in group.customers"
              :key="c.id"
              :to="`/customers/${c.id}`"
              class="flex items-center gap-3 px-4 py-3.5 hover:bg-cream transition-colors"
            >
              <!-- Avatar -->
              <div class="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <span class="font-display text-xl text-gold">{{ c.name.charAt(0).toUpperCase() }}</span>
              </div>
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">{{ c.name }}</p>
                <p class="text-xs text-ink-muted truncate">
                  {{ c.phone ?? c.email ?? 'No contact' }}
                </p>
                <!-- Tags -->
                <div v-if="c.tags.length > 0" class="flex gap-1 mt-1 flex-wrap">
                  <span
                    v-for="tag in c.tags.slice(0, 2)"
                    :key="tag"
                    class="text-2xs bg-cream-dark text-ink-muted px-1.5 py-0.5 rounded-full capitalize"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
              <!-- Stats -->
              <div class="text-right flex-shrink-0">
                <p class="font-mono-dm text-base text-gold font-medium">{{ c.totalOrders }}</p>
                <p class="text-2xs text-ink-muted uppercase tracking-wide">orders</p>
                <p v-if="c.outstandingBalance > 0" class="text-2xs text-danger font-mono-dm mt-0.5">
                  {{ fmt(c.outstandingBalance) }} owed
                </p>
              </div>
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { UserPlus, Search, X, Users } from 'lucide-vue-next'
import { useCustomers } from '~/composables/useCustomers'
import { useAuthStore } from '~/stores/auth'
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
useHead({ title: 'Clients — eTailor' })

const auth = useAuthStore()
const {
  customers, filtered, isLoading, searchQuery, activeTag, loadAll,
} = useCustomers()

const tagChips = [
  { value: 'all',       label: 'All' },
  { value: 'vip',       label: '⭐ VIP' },
  { value: 'wedding',   label: '💍 Wedding' },
  { value: 'corporate', label: '💼 Corporate' },
  { value: 'regular',   label: 'Regular' },
  { value: 'new',       label: '🆕 New' },
]

const newThisMonth = computed(() => {
  const m = dayjs().format('YYYY-MM')
  return customers.value.filter(c => c.createdAt.startsWith(m)).length
})

// Group alphabetically
const groupedCustomers = computed(() => {
  const groups: Record<string, typeof filtered.value> = {}
  for (const c of filtered.value) {
    const letter = c.name.charAt(0).toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(c)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, custs]) => ({ letter, customers: custs }))
})

function fmt(n: number) { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }

onMounted(() => loadAll())
</script>
