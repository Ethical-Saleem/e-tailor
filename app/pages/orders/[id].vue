<template>
  <div v-if="order" class="animate-fade-in">
 
    <!-- ── Header ── -->
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
        <span :class="['badge', `badge-${order.status}`]">{{ STATUS_LABELS[order.status] }}</span>
      </div>
 
      <!-- Status pipeline -->
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
        <button class="btn btn-gold btn-md flex-1" @click="handleAdvanceStatus">
          <ArrowRight :size="16" stroke-width="2" />
          Mark as {{ nextStatusLabel }}
        </button>
        <button class="btn btn-outline btn-md" @click="cancelDialog = true">
          <X :size="16" stroke-width="2" />
        </button>
      </div>
 
      <!-- ── Payment summary card ── -->
      <div class="card-ink p-4">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-xs text-white/40 font-semibold uppercase tracking-wider mb-1">Total Amount</p>
            <p class="font-display text-4xl text-white font-light">{{ fmt(order.total) }}</p>
          </div>
          <span :class="['badge', `badge-${order.paymentStatus}`]">
            {{ paymentStatusLabel }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-2 mb-3">
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
        <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
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
 
      <!-- ── Pricing breakdown ── -->
      <div class="card p-4">
        <p class="detail-section-label">Pricing breakdown</p>
        <div class="mt-3 space-y-1.5 text-sm">
          <div class="flex justify-between">
            <span class="text-ink-muted">Items subtotal</span>
            <span class="font-mono-dm">{{ fmt(order.subtotal - (order.materialCost ?? 0) - extrasTotal) }}</span>
          </div>
          <div v-if="(order.materialCost ?? 0) > 0" class="flex justify-between">
            <span class="text-ink-muted">Materials</span>
            <span class="font-mono-dm">{{ fmt(order.materialCost ?? 0) }}</span>
          </div>
          <div v-if="extrasTotal > 0" class="flex justify-between">
            <span class="text-ink-muted">Additional costs</span>
            <span class="font-mono-dm">{{ fmt(extrasTotal) }}</span>
          </div>
          <div v-if="order.discount > 0" class="flex justify-between">
            <span class="text-ink-muted">Discount</span>
            <span class="font-mono-dm text-success">−{{ fmt(order.discount) }}</span>
          </div>
          <div v-if="order.tax > 0" class="flex justify-between">
            <span class="text-ink-muted">Tax</span>
            <span class="font-mono-dm">{{ fmt(order.tax) }}</span>
          </div>
          <div class="flex justify-between border-t border-cream-dark pt-2 font-semibold">
            <span>Total</span>
            <span class="font-mono-dm">{{ fmt(order.total) }}</span>
          </div>
        </div>
      </div>
 
      <!-- ── Order items ── -->
      <div class="card p-4">
        <p class="detail-section-label">Garment items</p>
        <div class="mt-3 space-y-2">
          <div v-for="item in order.items" :key="item.id" class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-ink">
                {{ item.quantity > 1 ? `${item.quantity}× ` : '' }}{{ item.name }}
              </p>
              <p class="text-xs text-ink-muted capitalize">{{ item.category }}</p>
            </div>
            <p class="font-mono-dm text-sm text-ink">{{ fmt(item.quantity * item.unitPrice) }}</p>
          </div>
        </div>
      </div>
 
      <!-- ── Materials ── -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="detail-section-label">Materials</p>
          <button
            v-if="canEditMaterials"
            class="text-xs text-gold font-semibold"
            @click="openMaterialsEdit"
          >
            Edit
          </button>
          <span v-else-if="order.materialUsage.length > 0" class="text-xs text-ink-muted">
            Locked after cutting
          </span>
        </div>
 
        <div v-if="order.materialUsage.length > 0" class="space-y-3">
          <div
            v-for="m in order.materialUsage"
            :key="m.id"
            class="flex items-start justify-between"
          >
            <div class="flex-1 min-w-0 pr-3">
              <p class="text-sm font-medium text-ink">{{ m.materialName }}</p>
              <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span class="text-xs text-ink-muted">{{ m.quantity }} {{ m.unit }}</span>
                <span class="text-xs text-ink-muted">·</span>
                <span
                  :class="['text-xs font-medium',
                    m.source === 'customer_supplied' ? 'text-info' : 'text-ink-muted']"
                >
                  {{ m.source === 'customer_supplied' ? 'Customer supplied' : 'From stock' }}
                </span>
                <template v-if="m.source === 'inventory' && m.costAtTime > 0">
                  <span class="text-xs text-ink-muted">·</span>
                  <span class="text-xs text-ink-muted font-mono-dm">
                    cost {{ fmt(m.costAtTime) }}/{{ m.unit }}
                  </span>
                </template>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p v-if="m.chargeToCustomer" class="font-mono-dm text-sm text-ink">
                {{ fmt(m.quantity * m.unitPriceCharged) }}
              </p>
              <p v-else class="text-xs text-ink-muted italic">Not charged</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-ink-muted">
          No materials recorded.
          <button
            v-if="canEditMaterials"
            class="text-gold underline-offset-2 underline ml-1"
            @click="openMaterialsEdit"
          >
            Add materials
          </button>
        </p>
 
        <!-- Additional costs sub-section -->
        <div
          v-if="(order.additionalCosts ?? []).length > 0"
          class="mt-3 pt-3 border-t border-cream-dark space-y-1.5"
        >
          <p class="text-xs font-semibold text-ink-muted mb-2">Additional costs</p>
          <div
            v-for="c in order.additionalCosts"
            :key="c.id"
            class="flex justify-between text-sm"
          >
            <span class="text-ink-muted">{{ c.label }}</span>
            <span class="font-mono-dm">{{ fmt(c.amount) }}</span>
          </div>
        </div>
      </div>
 
      <!-- ── Measurements ── -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="detail-section-label">Measurements</p>
          <button class="text-xs text-gold font-semibold" @click="openMeasurementDialog">
            {{ order.measurementProfileId || hasMeasurements ? 'View / Edit' : 'Add' }}
          </button>
        </div>
 
        <!-- Profile linked -->
        <div v-if="linkedProfile">
          <div class="flex items-center gap-2 mb-1">
            <Ruler :size="14" stroke-width="1.8" class="stroke-gold flex-shrink-0" />
            <p class="text-sm font-medium text-ink">{{ linkedProfile.label }}</p>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            <div
              v-for="(val, key) in linkedProfile.measurements"
              :key="key"
              class="flex justify-between text-xs"
            >
              <span class="text-ink-muted capitalize">{{ String(key).replace(/_/g, ' ') }}</span>
              <span class="font-mono-dm">{{ val }} {{ linkedProfile.unit }}</span>
            </div>
          </div>
          <NuxtLink
            :to="`/measurements/${order.measurementProfileId}`"
            class="text-xs text-gold mt-2 inline-block"
          >
            Open full profile →
          </NuxtLink>
        </div>
 
        <!-- Custom (order-only) measurements -->
        <div
          v-else-if="hasMeasurements"
        >
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs text-ink-muted capitalize">{{ order.measurementCategory }}</p>
            <span class="text-xs text-ink-muted">Order only · not saved to profile</span>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <div
              v-for="(val, key) in order.customMeasurements"
              :key="key"
              class="flex justify-between text-xs"
            >
              <span class="text-ink-muted capitalize">{{ String(key).replace(/_/g, ' ') }}</span>
              <span class="font-mono-dm">{{ val }}"</span>
            </div>
          </div>
        </div>
 
        <p v-else class="text-sm text-ink-muted">No measurements recorded</p>
      </div>
 
      <!-- ── Order details ── -->
      <div class="card p-4">
        <p class="detail-section-label">Details</p>
        <div class="mt-3 space-y-2.5">
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
          <div v-if="order.deliveryDate" class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-ink-muted">
              <PackageCheck :size="14" stroke-width="1.8" />
              <span>Delivered</span>
            </div>
            <span class="text-sm font-medium text-success">{{ formatDate(order.deliveryDate) }}</span>
          </div>
        </div>
      </div>
 
      <!-- ── Style notes ── -->
      <div v-if="order.styleNotes" class="card p-4">
        <p class="detail-section-label">Style notes</p>
        <p class="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">{{ order.styleNotes }}</p>
      </div>
 
      <!-- ── Activity timeline ── -->
      <div class="card p-4">
        <p class="detail-section-label">Activity</p>
        <div v-if="events.length > 0" class="mt-3">
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
        <p v-else class="mt-2 text-sm text-ink-muted">No activity yet</p>
      </div>
 
    </div>
 
 
    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Record Payment
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="paymentDialog" class="overlay" @click.self="paymentDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Record payment</h3>
                <p class="text-sm text-ink-muted mt-0.5">Balance due: {{ fmt(balance) }}</p>
              </div>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                      @click="paymentDialog = false">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="form-label">Amount ({{ auth.shop?.currencySymbol }})</label>
                <input v-model.number="payForm.amount" type="number" :max="balance"
                       class="form-input font-mono-dm text-lg" />
              </div>
              <div>
                <label class="form-label">Payment method</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in paymentMethods" :key="m.value"
                    :class="['btn btn-outline btn-sm text-xs',
                      payForm.method === m.value ? 'bg-ink text-white border-ink' : '']"
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
                Confirm {{ fmt(payForm.amount) }} payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
 
 
    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Cancel Order
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="cancelDialog" class="overlay" @click.self="cancelDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Cancel order?</h3>
                <p class="text-sm text-ink-muted mt-0.5">
                  This will reverse any stock consumed for this order.
                </p>
              </div>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                      @click="cancelDialog = false">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>
 
            <!-- Warn if materials will be reversed -->
            <div
              v-if="(order?.materialUsage ?? []).filter(m => m.source === 'inventory').length > 0"
              class="alert alert-warning mb-4 text-xs"
            >
              <AlertCircle :size="14" stroke-width="2" class="stroke-warning flex-shrink-0" />
              {{ order!.materialUsage.filter(m => m.source === 'inventory').length }} inventory
              material(s) will be returned to stock.
            </div>
 
            <div class="mb-4">
              <label class="form-label">Reason (optional)</label>
              <textarea
                v-model="cancelReason"
                rows="3"
                placeholder="Customer cancelled, design change…"
                class="form-input resize-none text-sm"
              />
            </div>
 
            <div class="flex gap-3">
              <button class="btn btn-outline btn-md flex-1" @click="cancelDialog = false">
                Keep order
              </button>
              <button
                class="btn btn-danger btn-md flex-1"
                :disabled="isCancelling"
                @click="submitCancel"
              >
                <Loader2 v-if="isCancelling" :size="14" class="animate-spin" />
                <span>{{ isCancelling ? 'Cancelling…' : 'Cancel order' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
 
 
    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Edit Materials
      Only reachable when order.status is 'pending' or 'cutting'
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="materialsEditDialog" class="overlay" @click.self="closeMaterialsEdit">
        <div class="drawer drawer-tall">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Edit materials</h3>
                <p class="text-sm text-ink-muted mt-0.5">
                  Changes will update stock levels and repricing.
                </p>
              </div>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                      @click="closeMaterialsEdit">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>
 
            <!-- Material lines -->
            <div class="space-y-3 mb-4 max-h-60 overflow-y-auto">
              <div
                v-for="(entry, idx) in editMaterialUsage"
                :key="idx"
                class="card p-3.5"
              >
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-semibold text-ink">Material {{ idx + 1 }}</p>
                  <button
                    class="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center"
                    @click="editMaterialUsage.splice(idx, 1)"
                  >
                    <X :size="12" stroke-width="2" class="stroke-danger" />
                  </button>
                </div>
 
                <!-- Source toggle -->
                <div class="flex rounded-lg overflow-hidden border border-cream-dark mb-2.5">
                  <button
                    :class="['flex-1 py-1.5 text-xs font-semibold transition-colors',
                      entry.source === 'inventory' ? 'bg-ink text-white' : 'text-ink-muted']"
                    @click="entry.source = 'inventory'"
                  >
                    From stock
                  </button>
                  <button
                    :class="['flex-1 py-1.5 text-xs font-semibold transition-colors',
                      entry.source === 'customer_supplied' ? 'bg-ink text-white' : 'text-ink-muted']"
                    @click="entry.source = 'customer_supplied'; entry.materialId = undefined"
                  >
                    Customer brings
                  </button>
                </div>
 
                <!-- Inventory picker -->
                <div v-if="entry.source === 'inventory'" class="mb-2">
                  <select
                    v-model="entry.materialId"
                    class="form-input text-sm"
                    @change="onEditMaterialSelected(idx)"
                  >
                    <option value="">Choose material…</option>
                    <option v-for="m in availableMaterials" :key="m.id" :value="m.id">
                      {{ m.name }} ({{ m.currentStock }} {{ m.unit }})
                    </option>
                  </select>
                </div>
                <div v-else class="mb-2">
                  <input
                    v-model="entry.materialName"
                    placeholder="Fabric description"
                    class="form-input text-sm"
                  />
                </div>
 
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label class="form-label text-2xs">Qty</label>
                    <input v-model.number="entry.quantity" type="number" min="0.01" step="0.25"
                           class="form-input text-sm" />
                  </div>
                  <div>
                    <label class="form-label text-2xs">Unit</label>
                    <input v-model="entry.unit" class="form-input text-sm" />
                  </div>
                </div>
 
                <div class="flex items-center gap-2 mb-2">
                  <input type="checkbox" :id="`edit-charge-${idx}`"
                         v-model="entry.chargeToCustomer" class="rounded" />
                  <label :for="`edit-charge-${idx}`" class="text-xs text-ink">
                    Add to order total
                  </label>
                </div>
 
                <div v-if="entry.chargeToCustomer">
                  <label class="form-label text-2xs">Price charged ({{ auth.shop?.currencySymbol }}/{{ entry.unit || 'unit' }})</label>
                  <input v-model.number="entry.unitPriceCharged" type="number" min="0"
                         class="form-input text-sm font-mono-dm" />
                </div>
              </div>
            </div>
 
            <button class="btn btn-outline btn-sm btn-full mb-4" @click="addEditMaterial">
              <Plus :size="14" stroke-width="2" />
              Add material
            </button>
 
            <!-- Additional costs -->
            <p class="text-xs font-semibold text-ink mb-2">Additional costs</p>
            <div class="space-y-2 mb-3">
              <div
                v-for="(c, idx) in editAdditionalCosts"
                :key="idx"
                class="flex items-center gap-2"
              >
                <input v-model="c.label" placeholder="Description" class="form-input flex-1 text-sm" />
                <input v-model.number="c.amount" type="number" min="0"
                       class="form-input w-28 font-mono-dm text-sm" />
                <button
                  class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0"
                  @click="editAdditionalCosts.splice(idx, 1)"
                >
                  <X :size="12" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
            </div>
            <button class="btn btn-outline btn-sm mb-5" @click="editAdditionalCosts.push({ id: generateId(), label: '', amount: 0 })">
              <Plus :size="14" /> Add cost
            </button>
 
            <!-- Pricing preview -->
            <div class="card bg-cream p-3.5 mb-4 space-y-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Materials (charged)</span>
                <span class="font-mono-dm">{{ fmt(editMaterialsTotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(editExtrasTotal) }}</span>
              </div>
              <div class="flex justify-between border-t border-cream-dark pt-1.5 font-semibold">
                <span>New total</span>
                <span class="font-mono-dm">{{ fmt(editNewTotal) }}</span>
              </div>
            </div>
 
            <div v-if="materialsEditError" class="alert alert-danger mb-3 text-xs">
              <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
              {{ materialsEditError }}
            </div>
 
            <button
              class="btn btn-gold btn-lg btn-full"
              :disabled="isSavingMaterials"
              @click="submitMaterialsEdit"
            >
              <Loader2 v-if="isSavingMaterials" :size="14" class="animate-spin" />
              <span>{{ isSavingMaterials ? 'Saving…' : 'Save changes' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
 
 
    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Add / Edit Measurements
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="measurementDialog" class="overlay" @click.self="measurementDialog = false">
        <div class="drawer drawer-tall">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Measurements</h3>
                <p class="text-sm text-ink-muted mt-0.5">{{ order!.customerName }}</p>
              </div>
              <button class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                      @click="measurementDialog = false">
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>
 
            <!-- Mode selector -->
            <div class="flex rounded-xl overflow-hidden border border-cream-dark mb-4">
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  mDialogMode === 'existing' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="mDialogMode = 'existing'"
              >
                Saved profiles
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  mDialogMode === 'new' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="mDialogMode = 'new'; seedDialogFields()"
              >
                Record new
              </button>
            </div>
 
            <!-- Existing profiles list -->
            <div v-if="mDialogMode === 'existing'" class="space-y-2 mb-4 max-h-72 overflow-y-auto">
              <div v-if="customerProfiles.length === 0" class="alert alert-info text-xs">
                <Info :size="14" stroke-width="2" class="stroke-info flex-shrink-0" />
                No saved profiles yet for this customer.
              </div>
              <button
                v-for="p in customerProfiles"
                :key="p.id"
                :class="['w-full flex items-center gap-3 card p-3 text-left transition-all',
                  mDialogSelectedProfileId === p.id ? 'border-gold ring-2 ring-gold/20' : '']"
                @click="mDialogSelectedProfileId = p.id"
              >
                <Ruler :size="14" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ p.label }}</p>
                  <p class="text-xs text-ink-muted capitalize">{{ p.category }} · {{ p.takenAt ?? 'No date' }}</p>
                </div>
                <CheckCircle2
                  v-if="mDialogSelectedProfileId === p.id"
                  :size="14" stroke-width="2" class="stroke-gold"
                />
              </button>
            </div>
 
            <!-- New measurement form -->
            <div v-if="mDialogMode === 'new'" class="space-y-3 mb-4">
              <div>
                <label class="form-label">Profile label</label>
                <input v-model="mDialogForm.label" placeholder="e.g. Ankara set – Dec 2025"
                       class="form-input" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Category</label>
                  <select v-model="mDialogForm.category" class="form-input"
                          @change="seedDialogFields">
                    <option v-for="c in garmentCategories" :key="c.value" :value="c.value">
                      {{ c.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Unit</label>
                  <div class="flex rounded-lg overflow-hidden border border-cream-dark mt-1">
                    <button
                      :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                        mDialogForm.unit === 'inches' ? 'bg-ink text-white' : 'text-ink-muted']"
                      @click="mDialogForm.unit = 'inches'"
                    >in</button>
                    <button
                      :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                        mDialogForm.unit === 'cm' ? 'bg-ink text-white' : 'text-ink-muted']"
                      @click="mDialogForm.unit = 'cm'"
                    >cm</button>
                  </div>
                </div>
              </div>
 
              <!-- Dynamic fields -->
              <div class="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                <div v-for="field in dialogMeasurementFields" :key="field">
                  <label class="form-label text-2xs uppercase tracking-wider">
                    {{ field.replace(/_/g, ' ') }}
                  </label>
                  <input
                    v-model.number="mDialogForm.measurements[field]"
                    type="number" min="0" step="0.25" placeholder="0"
                    class="form-input font-mono-dm text-sm"
                  />
                </div>
              </div>
 
              <!-- Custom category free-form fields -->
              <div v-if="mDialogForm.category === 'custom'" class="space-y-2">
                <div
                  v-for="(_, key) in mDialogForm.measurements"
                  :key="key"
                  class="flex items-center gap-2"
                >
                  <input
                    :value="key"
                    placeholder="Field name"
                    class="form-input flex-1 text-sm"
                    @change="renameMDialogField(String(key), ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    v-model.number="mDialogForm.measurements[String(key)]"
                    type="number" min="0" step="0.25"
                    class="form-input w-24 font-mono-dm text-sm"
                  />
                  <button
                    class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center"
                    @click="removeMDialogField(String(key))"
                  >
                    <X :size="12" stroke-width="2" class="stroke-danger" />
                  </button>
                </div>
                <button class="btn btn-outline btn-sm" @click="addMDialogField">
                  <Plus :size="12" /> Add field
                </button>
              </div>
 
              <div>
                <label class="form-label">Notes</label>
                <input v-model="mDialogForm.notes" placeholder="Optional notes"
                       class="form-input text-sm" />
              </div>
 
              <!-- Save to profile toggle -->
              <div class="card p-3 flex items-start gap-3">
                <input type="checkbox" id="m-save-profile"
                       v-model="mDialogForm.saveToProfile" class="rounded mt-0.5" />
                <label for="m-save-profile" class="cursor-pointer">
                  <p class="text-sm font-semibold text-ink">Save as customer profile</p>
                  <p class="text-xs text-ink-muted mt-0.5">
                    Reuse on future orders for {{ order!.customerName }}
                  </p>
                </label>
              </div>
            </div>
 
            <div v-if="measurementError" class="alert alert-danger mb-3 text-xs">
              <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
              {{ measurementError }}
            </div>
 
            <button
              class="btn btn-gold btn-lg btn-full"
              :disabled="isSavingMeasurement || !canSaveMeasurement"
              @click="submitMeasurement"
            >
              <Loader2 v-if="isSavingMeasurement" :size="14" class="animate-spin" />
              <span>{{ isSavingMeasurement ? 'Saving…' : 'Save measurements' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
 
  </div>
 
  <!-- Loading state -->
  <div v-else class="flex items-center justify-center min-h-screen">
    <Loader2 :size="32" class="animate-spin stroke-gold" />
  </div>
</template>
 
<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  ArrowLeft, ArrowRight, Check, X, Banknote, Calendar, Flag, PackageCheck,
  Ruler, CheckCircle2, Info, Plus, AlertCircle, Loader2,
  Tag, MessageSquare, DollarSign, Package, Scissors,
} from 'lucide-vue-next'
import { useOrders, STATUS_LABELS, STATUS_FLOW } from '~/composables/useOrders'
import { useMaterials } from '~/composables/useMaterials'
import { useMeasurements } from '~/composables/useMeasurements'
import { useAuthStore } from '~/stores/auth'
import { generateId } from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type {
  OrderStatus, OrderEvent, PaymentMethod,
  GarmentCategory, MeasurementMap,
  MaterialUsageEntry, AdditionalCost,
} from '~/types/models'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
 
definePageMeta({ layout: 'default' })
 
const route  = useRoute()
const auth   = useAuthStore()
const router = useRouter()
 
const {
  getWithTimeline, advanceStatus, recordPayment,
  cancel: cancelOrder, updateMaterials, update,
} = useOrders()
 
const { materials: allMaterials, loadAll: loadMaterials } = useMaterials()
const { profiles: customerProfiles, loadForCustomer, create: createMeasurement } = useMeasurements()
 
// ── Core state ────────────────────────────────────────────────────────────────
const order  = ref<Awaited<ReturnType<typeof getWithTimeline>>['order'] | null>(null)
const events = ref<OrderEvent[]>([])
 
// ── Computed helpers ──────────────────────────────────────────────────────────
const balance = computed(() =>
  order.value ? Math.max(0, order.value.total - order.value.amountPaid) : 0
)
 
const paymentStatusLabel = computed(() => {
  switch (order.value?.paymentStatus) {
    case 'paid':    return 'Fully paid'
    case 'partial': return 'Partially paid'
    default:        return 'Unpaid'
  }
})
 
const extrasTotal = computed(() =>
  (order.value?.additionalCosts ?? []).reduce((s, c) => s + c.amount, 0)
)
 
const isOverdue = computed(() => {
  if (!order.value?.dueDate) return false
  if (['delivered', 'cancelled'].includes(order.value.status)) return false
  return order.value.dueDate < dayjs().format('YYYY-MM-DD')
})
 
const nextStatus = computed(() => {
  if (!order.value) return null
  const idx = STATUS_FLOW.indexOf(order.value.status)
  return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
})
 
const nextStatusLabel = computed(() =>
  nextStatus.value ? STATUS_LABELS[nextStatus.value] : ''
)
 
const priorityClass = computed(() => ({
  'text-ink-muted': order.value?.priority === 'low',
  'text-ink':       order.value?.priority === 'normal',
  'text-warning':   order.value?.priority === 'high',
  'text-danger':    order.value?.priority === 'urgent',
}))
 
const canEditMaterials = computed(() =>
  order.value ? ['pending', 'cutting'].includes(order.value.status) : false
)
 
const hasMeasurements = computed(() =>
  order.value?.customMeasurements &&
  Object.keys(order.value.customMeasurements).length > 0
)
 
const linkedProfile = computed(() =>
  order.value?.measurementProfileId
    ? customerProfiles.value.find(p => p.id === order.value!.measurementProfileId)
    : null
)
 
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
 
function isPipelineCompleted(status: OrderStatus) {
  if (!order.value) return false
  return STATUS_FLOW.indexOf(status) < STATUS_FLOW.indexOf(order.value.status)
}
 
function pipelineStepClass(status: OrderStatus) {
  if (isPipelineCompleted(status)) return 'bg-success border-success'
  if (order.value?.status === status) return 'bg-info border-info'
  return 'bg-white/10 border-white/20'
}
 
const availableMaterials = computed(() =>
  allMaterials.value.filter(m => !m.isDeleted)
)
 
 
// ── Payment dialog ────────────────────────────────────────────────────────────
const paymentDialog = ref(false)
const payForm = reactive({ amount: 0, method: 'cash' as PaymentMethod, note: '' })
 
async function submitPayment() {
  if (!order.value || payForm.amount <= 0) return
  await recordPayment(order.value.id, payForm.amount, payForm.method, payForm.note)
  paymentDialog.value = false
  payForm.amount = 0
  payForm.note = ''
  await loadOrder()
}
 
const paymentMethods = [
  { value: 'cash',          label: 'Cash',     icon: '💵' },
  { value: 'bank_transfer', label: 'Transfer', icon: '🏦' },
  { value: 'mobile_money',  label: 'Mobile',   icon: '📱' },
  { value: 'card',          label: 'Card',     icon: '💳' },
]
 
 
// ── Cancel dialog ─────────────────────────────────────────────────────────────
const cancelDialog  = ref(false)
const cancelReason  = ref('')
const isCancelling  = ref(false)
 
async function submitCancel() {
  if (!order.value) return
  isCancelling.value = true
  try {
    await cancelOrder(order.value.id, cancelReason.value || undefined)
    cancelDialog.value = false
    await loadOrder()
  } finally {
    isCancelling.value = false
  }
}
 
 
// ── Materials edit dialog ─────────────────────────────────────────────────────
const materialsEditDialog = ref(false)
const editMaterialUsage   = ref<MaterialUsageEntry[]>([])
const editAdditionalCosts = ref<AdditionalCost[]>([])
const isSavingMaterials   = ref(false)
const materialsEditError  = ref('')
 
const editMaterialsTotal = computed(() =>
  editMaterialUsage.value
    .filter(m => m.chargeToCustomer)
    .reduce((s, m) => s + m.quantity * m.unitPriceCharged, 0)
)
const editExtrasTotal = computed(() =>
  editAdditionalCosts.value.reduce((s, c) => s + c.amount, 0)
)
const editNewTotal = computed(() => {
  if (!order.value) return 0
  // Items subtotal stays fixed; only materials + extras change
  const itemsSubtotal = order.value.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const gross = itemsSubtotal + editMaterialsTotal.value + editExtrasTotal.value
  const discountAmt = order.value.discountType === 'percent'
    ? gross * (order.value.discount / 100)
    : order.value.discount
  const taxable = gross - discountAmt
  return taxable + taxable * ((auth.shop?.settings.taxRate ?? 0) / 100)
})
 
function openMaterialsEdit() {
  // Deep-clone current order data into edit buffers
  editMaterialUsage.value = JSON.parse(JSON.stringify(order.value?.materialUsage ?? []))
  editAdditionalCosts.value = JSON.parse(JSON.stringify(order.value?.additionalCosts ?? []))
  materialsEditError.value = ''
  materialsEditDialog.value = true
}
 
function closeMaterialsEdit() {
  materialsEditDialog.value = false
  materialsEditError.value = ''
}
 
function addEditMaterial() {
  editMaterialUsage.value.push({
    id:               generateId(),
    materialId:       undefined as any,
    materialName:     '',
    quantity:         1,
    unit:             'yard',
    source:           'inventory',
    costAtTime:       0,
    unitPriceCharged: 0,
    chargeToCustomer: true,
    locked:           false,
  })
}
 
function onEditMaterialSelected(idx: number) {
  const entry = editMaterialUsage.value[idx]
  const mat = allMaterials.value.find(m => m.id === entry.materialId)
  if (!mat) return
  entry.materialName     = mat.name
  entry.unit             = mat.unit
  entry.costAtTime       = mat.currentUnitCost
  entry.unitPriceCharged = mat.currentUnitCost
}
 
async function submitMaterialsEdit() {
  if (!order.value) return
  isSavingMaterials.value = true
  materialsEditError.value = ''
  try {
    await updateMaterials(order.value.id, editMaterialUsage.value, editAdditionalCosts.value)
    materialsEditDialog.value = false
    await loadOrder()
  } catch (err) {
    materialsEditError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isSavingMaterials.value = false
  }
}
 
 
// ── Measurement dialog ────────────────────────────────────────────────────────
const measurementDialog       = ref(false)
const mDialogMode             = ref<'existing' | 'new'>('existing')
const mDialogSelectedProfileId = ref<string | undefined>(undefined)
const isSavingMeasurement     = ref(false)
const measurementError        = ref('')
 
const mDialogForm = reactive({
  label:         '',
  category:      'dress' as GarmentCategory,
  measurements:  {} as MeasurementMap,
  unit:          'inches' as 'inches' | 'cm',
  notes:         '',
  saveToProfile: false,
})
 
const dialogMeasurementFields = computed<string[]>(() => {
  if (mDialogForm.category === 'custom') return []
  return MEASUREMENT_FIELDS[mDialogForm.category] ?? []
})
 
function seedDialogFields() {
  const fields = MEASUREMENT_FIELDS[mDialogForm.category] ?? []
  const seeded: MeasurementMap = {}
  for (const f of fields) {
    seeded[f] = (mDialogForm.measurements[f] as number) ?? 0
  }
  mDialogForm.measurements = seeded
}
 
function addMDialogField() {
  const key = `field_${Object.keys(mDialogForm.measurements).length + 1}`
  mDialogForm.measurements = { ...mDialogForm.measurements, [key]: 0 }
}
 
function removeMDialogField(key: string) {
  const updated = { ...mDialogForm.measurements }
  delete updated[key]
  mDialogForm.measurements = updated
}
 
function renameMDialogField(oldKey: string, newKey: string) {
  if (!newKey || newKey === oldKey) return
  const entries = Object.entries(mDialogForm.measurements)
  const updated: MeasurementMap = {}
  for (const [k, v] of entries) updated[k === oldKey ? newKey : k] = v
  mDialogForm.measurements = updated
}
 
const canSaveMeasurement = computed(() => {
  if (mDialogMode.value === 'existing') return !!mDialogSelectedProfileId.value
  return mDialogForm.label.trim().length > 0
})
 
function openMeasurementDialog() {
  // Pre-select existing profile if one is linked
  mDialogSelectedProfileId.value = order.value?.measurementProfileId
  mDialogMode.value = order.value?.measurementProfileId ? 'existing' : 'new'
 
  // Pre-fill new form from custom measurements if present
  if (order.value?.customMeasurements && Object.keys(order.value.customMeasurements).length > 0) {
    mDialogForm.measurements = { ...order.value.customMeasurements }
    if (order.value.measurementCategory) {
      mDialogForm.category = order.value.measurementCategory
    }
  } else {
    seedDialogFields()
  }
 
  measurementError.value = ''
  measurementDialog.value = true
}
 
async function submitMeasurement() {
  if (!order.value) return
  isSavingMeasurement.value = true
  measurementError.value = ''
 
  try {
    if (mDialogMode.value === 'existing') {
      // Just link the selected profile
      await update(order.value.id, {
        measurementProfileId: mDialogSelectedProfileId.value,
        customMeasurements:   undefined,
      })
    } else {
      // New measurements
      let profileId: string | undefined
 
      if (mDialogForm.saveToProfile) {
        const profile = await createMeasurement({
          customerId:   order.value.customerId,
          label:        mDialogForm.label,
          category:     mDialogForm.category,
          measurements: mDialogForm.measurements,
          unit:         mDialogForm.unit,
          notes:        mDialogForm.notes || undefined,
          isTemplate:   false,
        })
        profileId = profile.id
      }
 
      await update(order.value.id, {
        measurementProfileId: profileId,
        customMeasurements:   !mDialogForm.saveToProfile ? mDialogForm.measurements : undefined,
        measurementCategory:  mDialogForm.category,
      })
    }
 
    measurementDialog.value = false
    await loadOrder()
  } catch (err) {
    measurementError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isSavingMeasurement.value = false
  }
}
 
// Watch category changes in new-measurement dialog
watch(() => mDialogForm.category, () => {
  if (mDialogMode.value === 'new') seedDialogFields()
})
 
 
// ── Status actions ────────────────────────────────────────────────────────────
async function handleAdvanceStatus() {
  if (!order.value || !nextStatus.value) return
  await advanceStatus(order.value.id)
  await loadOrder()
}
 
 
// ── Timeline helpers ──────────────────────────────────────────────────────────
function timelineDotClass(type: OrderEvent['eventType']): string {
  if (type === 'payment_received') return 'success'
  if (type === 'status_changed')   return 'info'
  if (type === 'material_updated') return 'warning'
  return 'default'
}
 
function timelineIcon(type: OrderEvent['eventType']) {
  if (type === 'payment_received')   return DollarSign
  if (type === 'status_changed')     return Tag
  if (type === 'material_updated')   return Package
  if (type === 'measurement_updated') return Ruler
  return MessageSquare
}
 
function timelineLabel(event: OrderEvent): string {
  switch (event.eventType) {
    case 'created':              return 'Order created'
    case 'status_changed':       return `Status → ${STATUS_LABELS[event.newValue as OrderStatus] ?? event.newValue}`
    case 'payment_received':     return `Payment of ${fmt(Number(event.newValue))} received`
    case 'material_updated':     return 'Materials updated'
    case 'measurement_updated':  return 'Measurements updated'
    case 'note_added':           return event.note ?? 'Note added'
    default:                     return event.note ?? event.eventType
  }
}
 
 
// ── Load ──────────────────────────────────────────────────────────────────────
async function loadOrder() {
  const data = await getWithTimeline(route.params.id as string)
  if (!data.order) { await router.replace('/orders'); return }
  order.value  = data.order
  events.value = data.events as unknown as OrderEvent[]
  payForm.amount = balance.value
  useHead({ title: `${data.order.orderNumber} — eTailor` })
  // Load customer profiles for the measurement dialog
  await loadForCustomer(data.order.customerId)
}
 
// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return `${auth.shop?.currencySymbol ?? ''}${n.toLocaleString()}` }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }
function formatRelative(d: string) { return dayjs(d).fromNow() }
 
const garmentCategories = [
  { value: 'dress',   label: 'Dress'    },
  { value: 'gown',    label: 'Gown'     },
  { value: 'suit',    label: 'Suit'     },
  { value: 'shirt',   label: 'Shirt'    },
  { value: 'trouser', label: 'Trouser'  },
  { value: 'skirt',   label: 'Skirt'    },
  { value: 'blouse',  label: 'Blouse'   },
  { value: 'jacket',  label: 'Jacket'   },
  { value: 'abaya',   label: 'Abaya'    },
  { value: 'ankara',  label: 'Ankara'   },
  { value: 'asoebi',  label: 'Asoebi'   },
  { value: 'agbada',  label: 'Agbada'   },
  { value: 'custom',  label: 'Custom'   },
]
 
onMounted(async () => {
  await loadMaterials()
  await loadOrder()
})
</script>
 
<style scoped>
@reference '~/assets/css/main.css';
.detail-section-label {
  @apply text-xs font-semibold text-ink-muted uppercase tracking-wider;
}
</style>