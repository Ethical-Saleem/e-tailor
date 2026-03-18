<!-- app/pages/orders/[id].vue -->
<template>
  <div v-if="order" class="animate-fade-in">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="header-action-btn" @click="$router.back()">
            <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
          </button>
          <div>
            <p class="font-mono-dm text-xs text-white/50">{{ order.orderNumber }}</p>
            <h1 class="font-display text-2xl text-white leading-tight">{{ order.customerName }}</h1>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span :class="['badge', `badge-${order.status}`]">{{ STATUS_LABELS[order.status] }}</span>
        </div>
      </div>

      <!-- Status pipeline inline -->
      <div v-if="!['delivered','cancelled'].includes(order.status)" class="mt-4 step-pipeline">
        <div class="absolute h-0.5 bg-white/10" style="top:10px;left:0;right:0;" />
        <div
          class="absolute h-0.5 bg-gold transition-all duration-500"
          :style="{ top: '10px', left: 0, width: pipelineProgress }"
        />
        <div v-for="s in PIPELINE_STEPS" :key="s.status" class="relative z-10 flex flex-col items-center gap-1">
          <div :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center', pipelineStepClass(s.status)]">
            <Check v-if="isPipelineCompleted(s.status)" :size="10" stroke-width="3" class="stroke-white" />
            <div v-else-if="order.status === s.status" class="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span class="text-[9px] text-white/50">{{ s.short }}</span>
        </div>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24 space-y-4">

      <!-- ── Status actions ── -->
      <div v-if="!['delivered','cancelled'].includes(order.status)" class="flex gap-2">
        <button
          class="btn btn-gold btn-md flex-1"
          @click="handleAdvanceStatus"
        >
          <ArrowRight :size="16" stroke-width="2" />
          Mark as {{ nextStatusLabel }}
        </button>
        <button class="btn btn-outline btn-md" @click="cancelDialog = true">
          <X :size="16" stroke-width="2" />
        </button>
      </div>

      <!-- ── Payment summary ── -->
      <div class="card-ink p-4">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1">Total Amount</p>
            <p class="font-display text-4xl text-white font-light">{{ fmt(order.total) }}</p>
          </div>
          <span :class="['badge', `badge-${order.paymentStatus}`]">
            {{ order.paymentStatus === 'paid' ? 'Fully Paid' : order.paymentStatus === 'partial' ? 'Partially Paid' : 'Unpaid' }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ fmt(order.amountPaid) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Paid</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ fmt(order.depositAmount) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Deposit</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p :class="['font-mono-dm text-sm', balance > 0 ? 'text-warning' : 'text-success']">
              {{ fmt(balance) }}
            </p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Balance</p>
          </div>
        </div>
        <!-- Payment progress bar -->
        <div class="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full bg-gold transition-all duration-500"
            :style="{ width: `${Math.min(100, (order.amountPaid / order.total) * 100)}%` }"
          />
        </div>
        <button
          v-if="balance > 0"
          class="btn btn-primary btn-md btn-full mt-3 bg-white/10 border-white/20 text-white hover:bg-white/20"
          @click="paymentDialog = true"
        >
          <Banknote :size="16" stroke-width="1.8" />
          Record Payment
        </button>
      </div>

      <!-- ── Order items ── -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Items</p>
        <div class="space-y-2">
          <div v-for="item in order.items" :key="item.id" class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-ink">{{ item.quantity > 1 ? `${item.quantity}× ` : '' }}{{ item.name }}</p>
              <p class="text-xs text-ink-muted capitalize">{{ item.category }}</p>
            </div>
            <p class="font-mono-dm text-sm text-ink">{{ fmt(item.quantity * item.unitPrice) }}</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-cream-dark space-y-1.5">
          <div class="flex justify-between text-sm">
            <span class="text-ink-muted">Subtotal</span>
            <span class="font-mono-dm">{{ fmt(order.subtotal) }}</span>
          </div>
          <div v-if="order.discount > 0" class="flex justify-between text-sm">
            <span class="text-ink-muted">Discount</span>
            <span class="font-mono-dm text-success">−{{ fmt(order.discount) }}</span>
          </div>
          <div v-if="order.tax > 0" class="flex justify-between text-sm">
            <span class="text-ink-muted">Tax</span>
            <span class="font-mono-dm">{{ fmt(order.tax) }}</span>
          </div>
          <div class="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span class="font-mono-dm">{{ fmt(order.total) }}</span>
          </div>
        </div>
      </div>

      <!-- ── Order details ── -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Details</p>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-ink-muted">
              <Calendar :size="14" stroke-width="1.8" />
              <span>Due date</span>
            </div>
            <span :class="['text-sm font-medium', isOverdue ? 'text-danger' : 'text-ink']">
              {{ order.dueDate ? formatDate(order.dueDate) : 'Not set' }}
              <span v-if="isOverdue" class="text-xs ml-1">(overdue)</span>
            </span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-ink-muted">
              <Flag :size="14" stroke-width="1.8" />
              <span>Priority</span>
            </div>
            <span :class="['text-sm font-medium capitalize', priorityClass]">{{ order.priority }}</span>
          </div>
          <div v-if="order.measurementProfileId" class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-ink-muted">
              <Ruler :size="14" stroke-width="1.8" />
              <span>Measurements</span>
            </div>
            <NuxtLink :to="`/measurements/${order.measurementProfileId}`" class="text-sm text-gold">View →</NuxtLink>
          </div>
        </div>
      </div>

      <!-- ── Style notes ── -->
      <div v-if="order.styleNotes" class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Style Notes</p>
        <p class="text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ order.styleNotes }}</p>
      </div>

      <!-- ── Timeline ── -->
      <div class="card p-4">
        <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Activity</p>
        <div v-if="events.length > 0">
          <div v-for="event in events" :key="event.id" class="timeline-item">
            <div :class="['timeline-dot flex-shrink-0', timelineDotClass(event.eventType)]">
              <component :is="timelineIcon(event.eventType)" :size="12" stroke-width="2" />
            </div>
            <div class="flex-1 pt-0.5">
              <p class="text-sm text-ink font-medium">{{ timelineLabel(event) }}</p>
              <p class="text-xs text-ink-muted">{{ formatRelative(event.createdAt) }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-ink-muted">No activity yet</p>
      </div>

    </div>

    <!-- ── Payment dialog ── -->
    <Transition name="fade">
      <div v-if="paymentDialog" class="overlay" @click.self="paymentDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-6">
            <h3 class="font-display text-2xl text-ink mb-1">Record Payment</h3>
            <p class="text-sm text-ink-muted mb-5">Balance due: {{ fmt(balance) }}</p>
            <div class="space-y-4">
              <div>
                <label class="form-label">Amount ({{ auth.shop?.currencySymbol }})</label>
                <input v-model.number="payForm.amount" type="number" :max="balance" class="form-input font-mono-dm text-lg" />
              </div>
              <div>
                <label class="form-label">Payment method</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in paymentMethods"
                    :key="m.value"
                    :class="['btn btn-outline btn-sm text-xs', payForm.method === m.value ? 'bg-ink text-white border-ink' : '']"
                    @click="payForm.method = m.value"
                  >
                    {{ m.icon }} {{ m.label }}
                  </button>
                </div>
              </div>
              <div>
                <label class="form-label">Note (optional)</label>
                <input v-model="payForm.note" placeholder="e.g. Balance payment" class="form-input" />
              </div>
              <button class="btn btn-gold btn-lg btn-full" @click="submitPayment">
                <Banknote :size="16" stroke-width="1.8" />
                Confirm {{ fmt(payForm.amount) }} Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Loading -->
  <div v-else class="flex items-center justify-center min-h-screen">
    <Loader2 :size="32" class="animate-spin stroke-gold" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, ArrowRight, Check, X, Banknote, Calendar, Flag,
  Ruler, CheckCircle2, Loader2, Tag, MessageSquare, DollarSign,
} from 'lucide-vue-next'
import { useOrders, STATUS_LABELS, STATUS_FLOW } from '~/composables/useOrders'
import { useAuthStore } from '~/stores/auth'
import type { OrderStatus, OrderEvent, PaymentMethod } from '~/types/models'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

definePageMeta({ layout: 'default' })

const route  = useRoute()
const auth   = useAuthStore()
const router = useRouter()
const { getWithTimeline, advanceStatus, recordPayment, cancel } = useOrders()

const order  = ref<Awaited<ReturnType<typeof getWithTimeline>>['order'] | null>(null)
const events = ref<typeof order.value extends object ? OrderEvent[] : never>([])

const paymentDialog = ref(false)
const cancelDialog  = ref(false)
const payForm = reactive({ amount: 0, method: 'cash' as PaymentMethod, note: '' })

// Pipeline
const PIPELINE_STEPS: Array<{ status: OrderStatus; short: string }> = [
  { status: 'pending',   short: 'Order' },
  { status: 'cutting',   short: 'Cut' },
  { status: 'sewing',    short: 'Sew' },
  { status: 'finishing', short: 'Finish' },
  { status: 'ready',     short: 'Ready' },
]

const pipelineProgress = computed(() => {
  if (!order.value) return '0%'
  const idx = PIPELINE_STEPS.findIndex(s => s.status === order.value!.status)
  if (idx <= 0) return '0%'
  return `${(idx / (PIPELINE_STEPS.length - 1)) * 100}%`
})

function isPipelineCompleted(status: OrderStatus): boolean {
  if (!order.value) return false
  return STATUS_FLOW.indexOf(status) < STATUS_FLOW.indexOf(order.value.status)
}

function pipelineStepClass(status: OrderStatus): string {
  if (isPipelineCompleted(status)) return 'bg-success border-success'
  if (order.value?.status === status) return 'bg-info border-info'
  return 'bg-white/10 border-white/20'
}

const balance = computed(() => order.value ? Math.max(0, order.value.total - order.value.amountPaid) : 0)
const isOverdue = computed(() => {
  if (!order.value?.dueDate) return false
  if (['delivered','cancelled'].includes(order.value.status)) return false
  return order.value.dueDate < dayjs().format('YYYY-MM-DD')
})

const nextStatus = computed(() => {
  if (!order.value) return null
  const idx = STATUS_FLOW.indexOf(order.value.status)
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
})

const nextStatusLabel = computed(() =>
  nextStatus.value ? STATUS_LABELS[nextStatus.value] : '',
)

const priorityClass = computed(() => ({
  'text-ink-muted': order.value?.priority === 'low',
  'text-ink':       order.value?.priority === 'normal',
  'text-warning':   order.value?.priority === 'high',
  'text-danger':    order.value?.priority === 'urgent',
}))

async function handleAdvanceStatus() {
  if (!order.value || !nextStatus.value) return
  await advanceStatus(order.value.id)
  await loadOrder()
}

async function submitPayment() {
  if (!order.value || payForm.amount <= 0) return
  await recordPayment(order.value.id, payForm.amount, payForm.method, payForm.note)
  paymentDialog.value = false
  payForm.amount = 0
  await loadOrder()
}

// Timeline helpers
function timelineDotClass(type: OrderEvent['eventType']): string {
  if (type === 'payment_received') return 'success'
  if (type === 'status_changed')   return 'info'
  return 'warning'
}

function timelineIcon(type: OrderEvent['eventType']) {
  if (type === 'payment_received') return DollarSign
  if (type === 'status_changed')   return Tag
  return MessageSquare
}

function timelineLabel(event: OrderEvent): string {
  switch (event.eventType) {
    case 'created':          return `Order created`
    case 'status_changed':   return `Status: ${STATUS_LABELS[event.newValue as OrderStatus] ?? event.newValue}`
    case 'payment_received': return `Payment of ${fmt(Number(event.newValue))} received`
    case 'note_added':       return event.note ?? 'Note added'
    default:                 return event.note ?? event.eventType
  }
}

async function loadOrder() {
  const data = await getWithTimeline(route.params.id as string)
  if (!data.order) { await router.replace('/orders'); return }
  order.value  = data.order
  events.value = data.events as unknown as OrderEvent[]
  payForm.amount = balance.value
  useHead({ title: `${data.order.orderNumber} — eTailor` })
}

function fmt(n: number) { return `${auth.shop?.currencySymbol}${n.toLocaleString()}` }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }
function formatRelative(d: string) { return dayjs(d).fromNow() }

const paymentMethods = [
  { value: 'cash',          label: 'Cash',     icon: '💵' },
  { value: 'bank_transfer', label: 'Transfer', icon: '🏦' },
  { value: 'mobile_money',  label: 'Mobile',   icon: '📱' },
  { value: 'card',          label: 'Card',     icon: '💳' },
]

onMounted(loadOrder)
</script>
