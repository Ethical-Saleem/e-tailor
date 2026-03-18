<!-- app/components/shared/ToastContainer.vue -->
<template>
  <Teleport to="body">
    <div class="fixed top-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none px-4">
      <TransitionGroup name="toast-group">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast pointer-events-auto', toastClass(toast.type)]"
          @click="uiStore.dismissToast(toast.id)"
        >
          <component :is="toastIcon(toast.type)" :size="14" stroke-width="2" class="flex-shrink-0" />
          <span class="flex-1 text-sm">{{ toast.message }}</span>
          <button class="opacity-60 hover:opacity-100 ml-2 flex-shrink-0">
            <X :size="12" stroke-width="2" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'
import { useUIStore } from '~/stores/ui'
import type { ToastType } from '~/stores/ui'

const uiStore = useUIStore()
const toasts  = computed(() => uiStore.toasts)

function toastClass(type: ToastType): string {
  switch (type) {
    case 'success': return 'bg-success text-white'
    case 'error':   return 'bg-danger text-white'
    case 'warning': return 'bg-warning text-white'
    case 'info':    return 'bg-info text-white'
  }
}

function toastIcon(type: ToastType) {
  switch (type) {
    case 'success': return CheckCircle2
    case 'error':   return AlertCircle
    case 'warning': return AlertTriangle
    case 'info':    return Info
  }
}
</script>

<style scoped>
.toast-group-enter-active,
.toast-group-leave-active {
  transition: all 0.25s ease;
}
.toast-group-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-group-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.toast-group-move {
  transition: transform 0.2s ease;
}
</style>
