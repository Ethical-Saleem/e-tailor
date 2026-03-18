<!-- app/components/orders/OrderCard.vue -->
<template>
  <div
    :class="[
      'card p-3.5 cursor-pointer transition-all duration-150',
      'hover:shadow-card-md hover:-translate-y-0.5',
      isOverdue ? 'border-l-2 border-l-danger' : '',
    ]"
  >
    <!-- Top row -->
    <div class="flex items-start justify-between mb-2">
      <div class="min-w-0 flex-1 pr-2">
        <p class="font-mono-dm text-2xs text-ink-muted mb-0.5">{{ order.orderNumber }}</p>
        <p class="text-sm font-semibold text-ink truncate">{{ order.customerName }}</p>
        <p class="text-xs text-ink-muted truncate">{{ itemsSummary }}</p>
      </div>
      <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span :class="['badge', `badge-${order.status}`]">{{ STATUS_LABELS[order.status] }}</span>
        <span v-if="order.priority === 'urgent'" class="badge badge-danger text-2xs py-0.5">URGENT</span>
        <span v-else-if="order.priority === 'high'" class="badge badge-warning text-2xs py-0.5">HIGH</span>
      </div>
    </div>

    <!-- Status pipeline -->
    <div v-if="!['delivered', 'cancelled'].includes(order.status)" class="step-pipeline mb-3">
      <!-- Background track -->
      <div class="absolute h-0.5 bg-cream-dark" style="top:10px;left:10px;right:10px;z-index:0;" />
      <!-- Progress fill -->
      <div
        class="absolute h-0.5 bg-gold transition-all duration-500"
        :style="{ top: '10px', left: '10px', right: '10px', width: progressWidth, zIndex: 1 }"
      />
      <!-- Steps -->
      <div
        v-for="(step, idx) in PIPELINE_STEPS"
        :key="step.status"
        class="relative z-10 flex flex-col items-center gap-1"
      >
        <div :class="['w-5 h-5 rounded-full flex items-center justify-center border-2', stepClass(step.status)]">
          <Check v-if="isCompleted(step.status)" :size="10" stroke-width="3" class="stroke-white" />
          <div v-else-if="isCurrent(step.status)" class="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
        <span :class="['text-[9px] font-medium', isCurrent(step.status) ? 'text-info' : 'text-ink-subtle']">
          {{ step.label }}
        </span>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="flex items-center justify-between pt-2.5 border-t border-cream-dark">
      <div class="flex items-center gap-1 text-2xs" :class="isOverdue ? 'text-danger font-semibold' : 'text-ink-muted'">
        <Calendar :size="12" stroke-width="1.8" />
        <span>{{ dueLabel }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="['badge', `badge-${order.paymentStatus}`]">
          {{ paymentLabel }}
        </span>
        <span class="font-mono-dm text-sm font-medium text-ink">{{ fmt(order.total) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Calendar } from 'lucide-vue-next'
import { STATUS_LABELS } from '~/composables/useOrders'
import { useAuthStore } from '~/stores/auth'
import type { Order, OrderStatus } from '~/types/models'
import dayjs from 'dayjs'

const props = defineProps<{ order: Order }>()
const auth  = useAuthStore()

// Pipeline steps for the progress bar
const PIPELINE_STEPS = [
  { status: 'pending'  as OrderStatus, label: 'Order' },
  { status: 'cutting'  as OrderStatus, label: 'Cut' },
  { status: 'sewing'   as OrderStatus, label: 'Sew' },
  { status: 'finishing'as OrderStatus, label: 'Finish' },
  { status: 'ready'    as OrderStatus, label: 'Ready' },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'cutting', 'sewing', 'finishing', 'ready', 'delivered']

function currentIdx(): number {
  return STATUS_ORDER.indexOf(props.order.status)
}

function isCompleted(status: OrderStatus): boolean {
  return STATUS_ORDER.indexOf(status) < currentIdx()
}

function isCurrent(status: OrderStatus): boolean {
  return props.order.status === status
}

function stepClass(status: OrderStatus): string {
  if (isCompleted(status)) return 'bg-success border-success'
  if (isCurrent(status))   return 'bg-info border-info'
  return 'bg-cream-dark border-cream-deeper'
}

const progressWidth = computed(() => {
  const idx = PIPELINE_STEPS.findIndex(s => s.status === props.order.status)
  if (idx <= 0) return '0%'
  const pct = (idx / (PIPELINE_STEPS.length - 1)) * 100
  return `${pct}%`
})

const itemsSummary = computed(() =>
  props.order.items.map(i => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name}`).join(' · '),
)

const isOverdue = computed(() => {
  if (!props.order.dueDate) return false
  if (['delivered', 'cancelled'].includes(props.order.status)) return false
  return props.order.dueDate < dayjs().format('YYYY-MM-DD')
})

const dueLabel = computed(() => {
  if (props.order.status === 'delivered') return 'Delivered'
  if (props.order.status === 'ready')     return 'Ready for pickup'
  if (!props.order.dueDate)               return 'No due date'

  const diff = dayjs(props.order.dueDate).diff(dayjs(), 'day')
  if (diff < 0)  return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff <= 7)  return `Due in ${diff} day${diff > 1 ? 's' : ''}`
  return `Due ${dayjs(props.order.dueDate).format('MMM D')}`
})

const paymentLabel = computed(() => {
  const { amountPaid, total, paymentStatus } = props.order
  if (paymentStatus === 'paid')    return 'Paid'
  if (paymentStatus === 'partial') return `${fmt(amountPaid)} paid`
  return 'Unpaid'
})

function fmt(amount: number): string {
  return `${auth.shop?.currencySymbol}${amount.toLocaleString()}`
}
</script>
