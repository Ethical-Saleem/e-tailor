<!-- app/layouts/default.vue -->
<template>
  <div class="app-shell">
    <!-- ── Top sync bar ── -->
    <SyncStatusBar />
 
    <!-- ── Page content ── -->
    <main class="flex-1 min-h-0">
      <slot />
    </main>
 
    <!-- ── Bottom navigation ── -->
    <nav class="bottom-nav">
      <div class="flex items-end justify-around h-full px-2 pb-1">
 
        <!-- Dashboard -->
        <NuxtLink to="/" class="nav-link" active-class="nav-link--active" exact>
          <LayoutDashboard :size="22" stroke-width="1.5" />
          <span>Home</span>
        </NuxtLink>
 
        <!-- Orders -->
        <NuxtLink to="/orders" class="nav-link" active-class="nav-link--active">
          <ClipboardList :size="22" stroke-width="1.5" />
          <span>Orders</span>
          <span
            v-if="overdueCount > 0"
            class="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-white text-2xs font-bold flex items-center justify-center"
          >
            {{ overdueCount > 9 ? '9+' : overdueCount }}
          </span>
        </NuxtLink>
 
        <!-- FAB: New Order -->
        <NuxtLink to="/orders/new" class="fab mb-1">
          <Plus :size="24" stroke-width="2" />
        </NuxtLink>
 
        <!-- Customers -->
        <NuxtLink to="/customers" class="nav-link" active-class="nav-link--active">
          <Users :size="22" stroke-width="1.5" />
          <span>Clients</span>
        </NuxtLink>
 
        <!-- More — navigates to /more page -->
        <NuxtLink to="/more" class="nav-link" active-class="nav-link--active">
          <LayoutGrid :size="22" stroke-width="1.5" />
          <span>More</span>
          <!-- Badge: sum of low-stock items — visible from any page -->
          <span
            v-if="lowStockCount > 0"
            class="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full text-white text-2xs font-bold flex items-center justify-center"
          >
            {{ lowStockCount > 9 ? '9+' : lowStockCount }}
          </span>
        </NuxtLink>
 
      </div>
    </nav>
  </div>
</template>
 
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { LayoutDashboard, ClipboardList, Plus, Users, LayoutGrid } from 'lucide-vue-next'
import { useOrdersStore }    from '~/stores/orders'
import { useMaterialsStore } from '~/stores/materials'
 
const ordersStore    = useOrdersStore()
const materialsStore = useMaterialsStore()
 
const overdueCount  = computed(() => ordersStore.overdueCount)
const lowStockCount = computed(() => materialsStore.lowStockCount)
 
onMounted(() => {
  ordersStore.loadAll()
  materialsStore.loadAll()
})
</script>

<style scoped>
@reference '~/assets/css/main.css'

.nav-link {
  @apply relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl
         cursor-pointer transition-all duration-150 min-w-[52px];
}
.nav-link :deep(svg) {
  @apply stroke-white/40 transition-all duration-150;
}
.nav-link span {
  @apply text-[10px] text-white/40 font-medium tracking-wide transition-all duration-150;
}
.nav-link--active :deep(svg) {
  @apply stroke-gold;
}
.nav-link--active span {
  @apply text-gold;
}
.nav-link:not(.nav-link--active):hover :deep(svg) {
  @apply stroke-white/70;
}
</style>

