<!-- app/pages/store/[id].vue -->
<template>
  <div v-if="item" class="animate-fade-in">

    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="header-action-btn" @click="$router.back()">
            <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
          </button>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono-dm text-xs text-white/40 uppercase tracking-wider capitalize">
                {{ item.category }}
              </span>
              <span v-if="item.sizeLabel"
                    class="text-xs text-white/40">· {{ item.sizeLabel }}</span>
            </div>
            <h1 class="font-display text-2xl text-white leading-tight truncate">
              {{ item.title }}
            </h1>
          </div>
        </div>
        <span :class="['badge flex-shrink-0', storeStatusBadgeClass(item.status)]">
          {{ STORE_ITEM_STATUS_LABELS[item.status] }}
        </span>
      </div>

      <!-- ── Status pipeline ── -->
      <div
        v-if="!['sold', 'archived'].includes(item.status)"
        class="mt-4 step-pipeline"
      >
        <div class="absolute h-0.5 bg-white/10" style="top:10px;left:0;right:0;" />
        <div
          class="absolute h-0.5 bg-gold transition-all duration-500"
          :style="{ top: '10px', left: 0, width: pipelineProgress }"
        />
        <div
          v-for="s in PIPELINE_STEPS"
          :key="s.status"
          class="relative z-10 flex flex-col items-center gap-1"
        >
          <div
            :class="['w-5 h-5 rounded-full border-2 flex items-center justify-center',
              pipelineStepClass(s.status)]"
          >
            <Check
              v-if="isPipelineCompleted(s.status)"
              :size="10" stroke-width="3" class="stroke-white"
            />
            <div
              v-else-if="item.status === s.status"
              class="w-1.5 h-1.5 rounded-full bg-white"
            />
          </div>
          <span class="text-[9px] text-white/50">{{ s.short }}</span>
        </div>
      </div>
    </header>

    <div class="px-4 pt-4 pb-24 space-y-4">

      <!-- ── Primary action button ── -->
      <div
        v-if="!['sold', 'archived'].includes(item.status)"
        class="flex gap-2"
      >
        <button
          class="btn btn-gold btn-md flex-1"
          :disabled="isAdvancing"
          @click="handleAdvance"
        >
          <Loader2 v-if="isAdvancing" :size="16" class="animate-spin" />
          <template v-else>
            <component :is="advanceIcon" :size="16" stroke-width="2" />
            {{ advanceLabel }}
          </template>
        </button>
        <button class="btn btn-outline btn-md" @click="archiveDialog = true">
          <Archive :size="16" stroke-width="2" />
        </button>
      </div>

      <!-- ── Cost / pricing summary card ── -->
      <div class="card-ink p-4">
        <p class="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">
          Pricing
        </p>
        <div class="flex items-end justify-between mb-3">
          <div>
            <p class="text-xs text-white/40 mb-1">Selling price</p>
            <p class="font-display text-4xl text-white font-light">{{ fmt(item.sellingPrice) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-white/40 mb-1">Cost price</p>
            <p class="font-mono-dm text-lg text-white/70">{{ fmt(item.costPrice) }}</p>
          </div>
        </div>

        <!-- Margin bar -->
        <div v-if="item.sellingPrice > 0 && item.costPrice > 0" class="mb-3">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="text-white/40">Profit margin</span>
            <span
              :class="['font-mono-dm font-semibold',
                marginPercent >= 30 ? 'text-success' :
                marginPercent >= 15 ? 'text-warning' : 'text-danger']"
            >
              {{ marginPercent.toFixed(1) }}% · {{ fmt(item.sellingPrice - item.costPrice) }} profit
            </span>
          </div>
          <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all duration-500',
                marginPercent >= 30 ? 'bg-success' :
                marginPercent >= 15 ? 'bg-warning' : 'bg-danger']"
              :style="{ width: `${Math.min(100, marginPercent)}%` }"
            />
          </div>
        </div>

        <!-- Cost breakdown grid -->
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ fmt(item.materialCost) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Materials</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ fmt(extrasTotal) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Extras</p>
          </div>
          <div class="bg-white/5 rounded-xl p-2.5 text-center">
            <p class="font-mono-dm text-sm text-white">{{ fmt(item.costPrice) }}</p>
            <p class="text-2xs text-white/40 uppercase tracking-wide mt-0.5">Total cost</p>
          </div>
        </div>
      </div>

      <!-- ── Sale card (only when sold) ── -->
      <div v-if="item.status === 'sold'" class="card p-4 border-l-4 border-success">
        <div class="flex items-center gap-2 mb-3">
          <CheckCircle :size="16" stroke-width="2" class="stroke-success" />
          <p class="text-sm font-semibold text-success">Item sold</p>
          <span class="text-xs text-ink-muted ml-auto">{{ formatDate(item.soldAt!) }}</span>
        </div>
        <div class="space-y-2 text-sm">
          <div v-if="item.soldToName" class="flex justify-between">
            <span class="text-ink-muted">Buyer</span>
            <span class="text-ink font-medium">{{ item.soldToName }}</span>
          </div>
          <div v-if="item.soldToPhone" class="flex justify-between">
            <span class="text-ink-muted">Phone</span>
            <span class="text-ink">{{ item.soldToPhone }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-ink-muted">Sold price</span>
            <span class="font-mono-dm font-semibold text-ink">{{ fmt(item.soldPrice!) }}</span>
          </div>
          <div v-if="item.salePaymentMethod" class="flex justify-between">
            <span class="text-ink-muted">Payment</span>
            <span class="text-ink capitalize">{{ item.salePaymentMethod.replace(/_/g, ' ') }}</span>
          </div>
          <div v-if="item.saleNotes" class="pt-1">
            <p class="text-ink-muted mb-0.5">Notes</p>
            <p class="text-ink text-xs">{{ item.saleNotes }}</p>
          </div>
        </div>
      </div>

      <!-- ── Materials ── -->
      <div class="card p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="detail-label">Materials</p>
          <button
            v-if="canEditMaterials"
            class="text-xs text-gold font-semibold"
            @click="openMaterialsEdit"
          >
            Edit
          </button>
          <span v-else-if="item.materialUsage.length > 0" class="text-xs text-ink-muted">
            {{ item.status === 'sold' ? 'Sold' : 'Locked' }}
          </span>
        </div>

        <div v-if="item.materialUsage.length > 0" class="space-y-3">
          <div
            v-for="m in item.materialUsage"
            :key="m.id"
            class="flex items-start justify-between"
          >
            <div class="flex-1 min-w-0 pr-3">
              <p class="text-sm font-medium text-ink">{{ m.materialName }}</p>
              <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span class="text-xs text-ink-muted">{{ m.quantity }} {{ m.unit }}</span>
                <span class="text-xs text-ink-muted">·</span>
                <span class="text-xs text-ink-muted">
                  {{ m.source === 'inventory' ? 'From stock' : 'External' }}
                </span>
                <template v-if="m.costAtTime > 0">
                  <span class="text-xs text-ink-muted">·</span>
                  <span class="text-xs font-mono-dm text-ink-muted">
                    {{ fmt(m.costAtTime) }}/{{ m.unit }}
                  </span>
                </template>
              </div>
            </div>
            <span class="font-mono-dm text-sm text-ink flex-shrink-0">
              {{ fmt(m.quantity * m.costAtTime) }}
            </span>
          </div>
        </div>
        <p v-else class="text-sm text-ink-muted">
          No materials recorded.
          <button
            v-if="canEditMaterials"
            class="text-gold underline underline-offset-2 ml-1"
            @click="openMaterialsEdit"
          >
            Add materials
          </button>
        </p>

        <!-- Additional costs sub-section -->
        <div
          v-if="(item.additionalCosts ?? []).length > 0"
          class="mt-3 pt-3 border-t border-cream-dark space-y-1.5"
        >
          <p class="text-xs font-semibold text-ink-muted mb-1.5">Additional costs</p>
          <div
            v-for="c in item.additionalCosts"
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
          <p class="detail-label">Measurements</p>
          <button
            v-if="!['sold', 'archived'].includes(item.status)"
            class="text-xs text-gold font-semibold"
            @click="openMeasurementDialog"
          >
            {{ item.measurementProfileId ? 'View / Edit' : 'Add' }}
          </button>
        </div>

        <div v-if="linkedProfile">
          <div class="flex items-center gap-2 mb-2">
            <Ruler :size="14" stroke-width="1.8" class="stroke-gold flex-shrink-0" />
            <p class="text-sm font-medium text-ink">{{ linkedProfile.label }}</p>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            <div
              v-for="(val, key) in linkedProfile.measurements"
              :key="key"
              class="flex justify-between text-xs"
            >
              <span class="text-ink-muted capitalize">{{ String(key).replace(/_/g, ' ') }}</span>
              <span class="font-mono-dm">{{ val }} {{ linkedProfile.unit }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-ink-muted">No measurements attached</p>
      </div>

      <!-- ── Description ── -->
      <div v-if="item.description" class="card p-4">
        <p class="detail-label">Description</p>
        <p class="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {{ item.description }}
        </p>
      </div>

      <!-- ── Activity timeline ── -->
      <div class="card p-4">
        <p class="detail-label">Activity</p>
        <div v-if="storeEvents.length > 0" class="mt-3">
          <div v-for="ev in storeEvents" :key="ev.id" class="timeline-item">
            <div :class="['timeline-dot flex-shrink-0', timelineDotClass(ev.type)]">
              <component :is="timelineIcon(ev.type)" :size="12" stroke-width="2" />
            </div>
            <div class="flex-1 pt-0.5">
              <p class="text-sm text-ink font-medium">{{ ev.label }}</p>
              <p class="text-xs text-ink-muted">{{ formatRelative(ev.createdAt) }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-ink-muted">No activity yet</p>
      </div>

    </div>


    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Record Sale
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="saleDialog" class="overlay" @click.self="saleDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-2">
              <div>
                <h3 class="font-display text-2xl text-ink">Record sale</h3>
                <p class="text-sm text-ink-muted mt-0.5">{{ item!.title }}</p>
              </div>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                @click="saleDialog = false"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <div class="space-y-4 mt-5">
              <div>
                <label class="form-label">Sold price ({{ auth.shop?.currencySymbol }})</label>
                <input
                  v-model.number="saleForm.soldPrice"
                  type="number" min="0"
                  class="form-input font-mono-dm text-lg"
                />
                <p v-if="saleForm.soldPrice > 0 && item!.costPrice > 0"
                   class="form-hint">
                  Profit: {{ fmt(saleForm.soldPrice - item!.costPrice) }}
                  ({{ ((saleForm.soldPrice - item!.costPrice) / saleForm.soldPrice * 100).toFixed(1) }}% margin)
                </p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Buyer name (optional)</label>
                  <input
                    v-model="saleForm.soldToName"
                    placeholder="Customer name"
                    class="form-input"
                  />
                </div>
                <div>
                  <label class="form-label">Phone (optional)</label>
                  <input
                    v-model="saleForm.soldToPhone"
                    placeholder="08012345678"
                    class="form-input"
                    type="tel"
                  />
                </div>
              </div>

              <div>
                <label class="form-label">Payment method</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in paymentMethods"
                    :key="m.value"
                    :class="['btn btn-outline btn-sm text-xs',
                      saleForm.salePaymentMethod === m.value ? 'bg-ink text-white border-ink' : '']"
                    @click="saleForm.salePaymentMethod = m.value"
                  >
                    {{ m.icon }} {{ m.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="form-label">Notes (optional)</label>
                <input
                  v-model="saleForm.saleNotes"
                  placeholder="Any notes about this sale…"
                  class="form-input"
                />
              </div>
            </div>

            <div v-if="saleError" class="alert alert-danger mt-4 text-xs">
              <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
              {{ saleError }}
            </div>

            <button
              class="btn btn-gold btn-lg btn-full mt-5"
              :disabled="isRecordingSale || saleForm.soldPrice <= 0"
              @click="submitSale"
            >
              <Loader2 v-if="isRecordingSale" :size="16" class="animate-spin" />
              <span>{{ isRecordingSale ? 'Saving…' : `Confirm ${fmt(saleForm.soldPrice)} sale` }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>


    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Archive item
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="archiveDialog" class="overlay" @click.self="archiveDialog = false">
        <div class="drawer">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Archive item?</h3>
                <p class="text-sm text-ink-muted mt-0.5">
                  This item will be removed from active production.
                </p>
              </div>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                @click="archiveDialog = false"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <div
              v-if="['in_production', 'ready'].includes(item!.status)"
              class="alert alert-warning mb-4 text-xs"
            >
              <AlertCircle :size="14" stroke-width="2" class="stroke-warning flex-shrink-0" />
              {{ item!.materialUsage.filter(m => m.source === 'inventory').length }} inventory
              material(s) will be returned to stock.
            </div>

            <div class="flex gap-3">
              <button class="btn btn-outline btn-md flex-1" @click="archiveDialog = false">
                Keep item
              </button>
              <button
                class="btn btn-danger btn-md flex-1"
                :disabled="isArchiving"
                @click="submitArchive"
              >
                <Loader2 v-if="isArchiving" :size="14" class="animate-spin" />
                <span>{{ isArchiving ? 'Archiving…' : 'Archive' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>


    <!-- ══════════════════════════════════════════════════════════════════════
      DIALOG: Edit Materials
      (editable while draft or in_production)
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="materialsDialog" class="overlay" @click.self="closeMaterialsDialog">
        <div class="drawer drawer-tall">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <div>
                <h3 class="font-display text-2xl text-ink">Edit materials</h3>
                <p class="text-sm text-ink-muted mt-0.5">
                  Changes will update stock levels and cost price.
                </p>
              </div>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                @click="closeMaterialsDialog"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <!-- Material lines -->
            <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
              <div
                v-for="(entry, idx) in editUsage"
                :key="idx"
                class="card p-3.5"
              >
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-semibold text-ink">Material {{ idx + 1 }}</p>
                  <button
                    class="w-6 h-6 rounded-lg bg-danger/10 flex items-center justify-center"
                    @click="editUsage.splice(idx, 1)"
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
                  >From stock</button>
                  <button
                    :class="['flex-1 py-1.5 text-xs font-semibold transition-colors',
                      entry.source !== 'inventory' ? 'bg-ink text-white' : 'text-ink-muted']"
                    @click="entry.source = 'external' as any; entry.materialId = undefined as any"
                  >External</button>
                </div>

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
                  <input v-model="entry.materialName" placeholder="Material name"
                         class="form-input text-sm" />
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="form-label text-2xs">Qty</label>
                    <input v-model.number="entry.quantity" type="number" min="0.01" step="0.25"
                           class="form-input text-sm" />
                  </div>
                  <div>
                    <label class="form-label text-2xs">Unit</label>
                    <input v-model="entry.unit" class="form-input text-sm" />
                  </div>
                  <div>
                    <label class="form-label text-2xs">Cost/unit</label>
                    <input v-model.number="entry.costAtTime" type="number" min="0"
                           class="form-input text-sm font-mono-dm" />
                  </div>
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
                v-for="(c, idx) in editAdditional"
                :key="idx"
                class="flex items-center gap-2"
              >
                <input v-model="c.label" placeholder="Description"
                       class="form-input flex-1 text-sm" />
                <input v-model.number="c.amount" type="number" min="0"
                       class="form-input w-24 font-mono-dm text-sm" />
                <button
                  class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0"
                  @click="editAdditional.splice(idx, 1)"
                >
                  <X :size="12" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
            </div>
            <button
              class="btn btn-outline btn-sm mb-5"
              @click="editAdditional.push({ id: generateId(), label: '', amount: 0 })"
            >
              <Plus :size="14" /> Add cost
            </button>

            <!-- New cost preview -->
            <div class="card bg-cream p-3.5 mb-4 space-y-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Material cost</span>
                <span class="font-mono-dm">{{ fmt(editMaterialCost) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(editExtrasTotal) }}</span>
              </div>
              <div class="flex justify-between border-t border-cream-dark pt-1.5 font-semibold">
                <span>New cost price</span>
                <span class="font-mono-dm">{{ fmt(editCostPrice) }}</span>
              </div>
              <div v-if="item!.sellingPrice > 0" class="flex justify-between text-xs">
                <span class="text-ink-muted">New margin</span>
                <span
                  :class="['font-mono-dm font-semibold',
                    editNewMargin >= 30 ? 'text-success' :
                    editNewMargin >= 15 ? 'text-warning' : 'text-danger']"
                >
                  {{ editNewMargin.toFixed(1) }}%
                </span>
              </div>
            </div>

            <div v-if="materialsError" class="alert alert-danger mb-3 text-xs">
              <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
              {{ materialsError }}
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
      DIALOG: Measurements
    ══════════════════════════════════════════════════════════════════════ -->
    <Transition name="fade">
      <div v-if="measurementDialog" class="overlay" @click.self="measurementDialog = false">
        <div class="drawer drawer-tall">
          <div class="drawer-handle" />
          <div class="px-5 pb-8">
            <div class="flex items-start justify-between mb-5">
              <h3 class="font-display text-2xl text-ink">Measurements</h3>
              <button
                class="w-8 h-8 rounded-lg bg-cream flex items-center justify-center"
                @click="measurementDialog = false"
              >
                <X :size="16" stroke-width="2" class="stroke-ink-muted" />
              </button>
            </div>

            <!-- Mode -->
            <div class="flex rounded-xl overflow-hidden border border-cream-dark mb-4">
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  mMode === 'template' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="mMode = 'template'"
              >
                Use template
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  mMode === 'new' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="mMode = 'new'; seedMDialogFields()"
              >
                Record new
              </button>
            </div>

            <!-- Template list -->
            <div v-if="mMode === 'template'" class="space-y-2 mb-4 max-h-72 overflow-y-auto">
              <div v-if="templates.length === 0" class="alert alert-info text-xs">
                <Info :size="14" stroke-width="2" class="stroke-info flex-shrink-0" />
                No templates yet.
              </div>
              <button
                v-for="t in templates"
                :key="t.id"
                :class="['w-full flex items-center gap-3 card p-3 text-left transition-all',
                  mSelectedId === t.id ? 'border-gold ring-2 ring-gold/20' : '']"
                @click="mSelectedId = t.id"
              >
                <Ruler :size="14" stroke-width="1.8" class="stroke-ink-muted" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ t.label }}</p>
                  <p class="text-xs text-ink-muted capitalize">{{ t.category }}</p>
                </div>
                <CheckCircle2 v-if="mSelectedId === t.id" :size="14" stroke-width="2" class="stroke-gold" />
              </button>
            </div>

            <!-- New measurement form -->
            <div v-if="mMode === 'new'" class="space-y-3 mb-4">
              <div>
                <label class="form-label">Label</label>
                <input v-model="mForm.label" placeholder="e.g. Size M fit"
                       class="form-input" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Category</label>
                  <select v-model="mForm.category" class="form-input" @change="seedMDialogFields">
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
                        mForm.unit === 'inches' ? 'bg-ink text-white' : 'text-ink-muted']"
                      @click="mForm.unit = 'inches'"
                    >in</button>
                    <button
                      :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                        mForm.unit === 'cm' ? 'bg-ink text-white' : 'text-ink-muted']"
                      @click="mForm.unit = 'cm'"
                    >cm</button>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                <div v-for="field in mDialogFields" :key="field">
                  <label class="form-label text-2xs uppercase tracking-wider">
                    {{ field.replace(/_/g, ' ') }}
                  </label>
                  <input
                    v-model.number="mForm.measurements[field]"
                    type="number" min="0" step="0.25" placeholder="0"
                    class="form-input font-mono-dm text-sm"
                  />
                </div>
              </div>
              <!-- Save as template toggle -->
              <div class="card p-3 flex items-start gap-3">
                <input type="checkbox" id="m-store-template"
                       v-model="mForm.saveAsTemplate" class="rounded mt-0.5" />
                <label for="m-store-template" class="cursor-pointer">
                  <p class="text-sm font-semibold text-ink">Save as reusable template</p>
                  <p class="text-xs text-ink-muted mt-0.5">Reuse on future store items</p>
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

  <!-- Loading -->
  <div v-else class="flex items-center justify-center min-h-screen">
    <Loader2 :size="32" class="animate-spin stroke-gold" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  ArrowLeft, Check, X, Archive, Ruler, CheckCircle2, CheckCircle,
  Info, Plus, AlertCircle, Loader2, Scissors, PackageCheck,
  ShoppingBag, Package, Tag,
} from 'lucide-vue-next'
import {
  useStoreItems, STORE_ITEM_STATUS_LABELS, STORE_STATUS_FLOW,
} from '~/composables/useStoreItems'
import { useMaterials } from '~/composables/useMaterials'
import { useMeasurements } from '~/composables/useMeasurements'
import { useAuthStore } from '~/stores/auth'
import { generateId } from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type {
  StoreItemStatus, StoreItem,
  MaterialUsageEntry, AdditionalCost,
  GarmentCategory, MeasurementMap, PaymentMethod,
} from '~/types/models'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

definePageMeta({ layout: 'default' })

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const {
  getById, advanceStatus, recordSale, archive,
  update: updateItem, STORE_ITEM_STATUS_LABELS: labels,
} = useStoreItems()

const { materials: allMaterials, loadAll: loadMaterials } = useMaterials()
const {
  templates, loadTemplates, create: createMeasurementProfile,
} = useMeasurements()

// ── Core state ────────────────────────────────────────────────────────────────
const item = ref<StoreItem | null>(null)

async function loadItem() {
  const data = await getById(route.params.id as string)
  if (!data) { await router.replace('/store'); return }
  item.value = data
  useHead({ title: `${data.title} — eTailor` })
}

// ── Computed helpers ──────────────────────────────────────────────────────────
const marginPercent = computed(() => {
  if (!item.value || !item.value.sellingPrice) return 0
  return ((item.value.sellingPrice - item.value.costPrice) / item.value.sellingPrice) * 100
})

const extrasTotal = computed(() =>
  (item.value?.additionalCosts ?? []).reduce((s, c) => s + c.amount, 0)
)

const canEditMaterials = computed(() =>
  item.value ? ['draft', 'in_production'].includes(item.value.status) : false
)

const linkedProfile = computed(() =>
  item.value?.measurementProfileId
    ? templates.value.find(t => t.id === item.value!.measurementProfileId)
    : null
)

// ── Pipeline ──────────────────────────────────────────────────────────────────
const PIPELINE_STEPS: Array<{ status: StoreItemStatus; short: string }> = [
  { status: 'draft',         short: 'Draft' },
  { status: 'in_production', short: 'Making' },
  { status: 'ready',         short: 'Ready' },
  { status: 'sold',          short: 'Sold' },
]

const pipelineProgress = computed(() => {
  if (!item.value) return '0%'
  const idx = PIPELINE_STEPS.findIndex(s => s.status === item.value!.status)
  if (idx <= 0) return '0%'
  return `${(idx / (PIPELINE_STEPS.length - 1)) * 100}%`
})

function isPipelineCompleted(status: StoreItemStatus) {
  if (!item.value) return false
  return STORE_STATUS_FLOW.indexOf(status) < STORE_STATUS_FLOW.indexOf(item.value.status)
}

function pipelineStepClass(status: StoreItemStatus) {
  if (isPipelineCompleted(status)) return 'bg-success border-success'
  if (item.value?.status === status) return 'bg-info border-info'
  return 'bg-white/10 border-white/20'
}

// ── Advance action label + icon ───────────────────────────────────────────────
const advanceLabel = computed(() => {
  switch (item.value?.status) {
    case 'draft':         return 'Start production'
    case 'in_production': return 'Mark as ready'
    case 'ready':         return 'Record sale'
    default:              return ''
  }
})

const advanceIcon = computed(() => {
  switch (item.value?.status) {
    case 'draft':         return Scissors
    case 'in_production': return PackageCheck
    case 'ready':         return ShoppingBag
    default:              return Check
  }
})

// ── Status badge ──────────────────────────────────────────────────────────────
function storeStatusBadgeClass(status: StoreItemStatus): string {
  switch (status) {
    case 'draft':         return 'badge-pending'
    case 'in_production': return 'badge-cutting'
    case 'ready':         return 'badge-ready'
    case 'sold':          return 'badge-delivered'
    case 'archived':      return 'badge-cancelled'
    default:              return ''
  }
}

// ── Activity feed (synthesised from item fields for now) ──────────────────────
const storeEvents = computed(() => {
  if (!item.value) return []
  const ev: Array<{ id: string; type: string; label: string; createdAt: string }> = []

  ev.push({
    id: 'created',
    type: 'created',
    label: 'Item created',
    createdAt: item.value.createdAt,
  })

  if (item.value.status !== 'draft') {
    ev.push({
      id: 'production',
      type: 'status',
      label: 'Started production',
      createdAt: item.value.updatedAt,
    })
  }

  if (['ready', 'sold'].includes(item.value.status)) {
    ev.push({
      id: 'ready',
      type: 'status',
      label: 'Marked as ready to sell',
      createdAt: item.value.updatedAt,
    })
  }

  if (item.value.status === 'sold' && item.value.soldAt) {
    ev.push({
      id: 'sold',
      type: 'sold',
      label: `Sold for ${fmt(item.value.soldPrice ?? 0)}${item.value.soldToName ? ` to ${item.value.soldToName}` : ''}`,
      createdAt: item.value.soldAt,
    })
  }

  return ev.reverse()
})

function timelineDotClass(type: string) {
  if (type === 'sold')   return 'success'
  if (type === 'status') return 'info'
  return 'default'
}

function timelineIcon(type: string) {
  if (type === 'sold')    return ShoppingBag
  if (type === 'status')  return Tag
  if (type === 'created') return Package
  return Tag
}

// ── Advance status ────────────────────────────────────────────────────────────
const isAdvancing = ref(false)

async function handleAdvance() {
  if (!item.value) return
  // "Record sale" opens the sale dialog instead of advancing directly
  if (item.value.status === 'ready') {
    saleForm.soldPrice = item.value.sellingPrice
    saleDialog.value = true
    return
  }
  isAdvancing.value = true
  try {
    await advanceStatus(item.value.id)
    await loadItem()
  } finally {
    isAdvancing.value = false
  }
}

// ── Sale dialog ───────────────────────────────────────────────────────────────
const saleDialog      = ref(false)
const isRecordingSale = ref(false)
const saleError       = ref('')

const saleForm = reactive({
  soldPrice:           0,
  soldToName:          '',
  soldToPhone:         '',
  salePaymentMethod:   'cash' as PaymentMethod,
  saleNotes:           '',
})

async function submitSale() {
  if (!item.value || saleForm.soldPrice <= 0) return
  isRecordingSale.value = true
  saleError.value = ''
  try {
    await recordSale(item.value.id, {
      soldPrice:          saleForm.soldPrice,
      soldToName:         saleForm.soldToName || undefined,
      soldToPhone:        saleForm.soldToPhone || undefined,
      salePaymentMethod:  saleForm.salePaymentMethod,
      saleNotes:          saleForm.saleNotes || undefined,
    })
    saleDialog.value = false
    await loadItem()
  } catch (err) {
    saleError.value = err instanceof Error ? err.message : 'Failed to record sale'
  } finally {
    isRecordingSale.value = false
  }
}

const paymentMethods = [
  { value: 'cash',          label: 'Cash',     icon: '💵' },
  { value: 'bank_transfer', label: 'Transfer', icon: '🏦' },
  { value: 'mobile_money',  label: 'Mobile',   icon: '📱' },
  { value: 'card',          label: 'Card',     icon: '💳' },
]

// ── Archive dialog ────────────────────────────────────────────────────────────
const archiveDialog = ref(false)
const isArchiving   = ref(false)

async function submitArchive() {
  if (!item.value) return
  isArchiving.value = true
  try {
    await archive(item.value.id)
    archiveDialog.value = false
    await router.replace('/store')
  } finally {
    isArchiving.value = false
  }
}

// ── Materials edit dialog ─────────────────────────────────────────────────────
const materialsDialog   = ref(false)
const editUsage         = ref<MaterialUsageEntry[]>([])
const editAdditional    = ref<AdditionalCost[]>([])
const isSavingMaterials = ref(false)
const materialsError    = ref('')

const editMaterialCost = computed(() =>
  editUsage.value
    .filter(m => m.source === 'inventory')
    .reduce((s, m) => s + m.quantity * m.costAtTime, 0)
)
const editExtrasTotal = computed(() =>
  editAdditional.value.reduce((s, c) => s + c.amount, 0)
)
const editCostPrice = computed(() => editMaterialCost.value + editExtrasTotal.value)
const editNewMargin = computed(() => {
  if (!item.value?.sellingPrice || item.value.sellingPrice <= 0) return 0
  return ((item.value.sellingPrice - editCostPrice.value) / item.value.sellingPrice) * 100
})

const availableMaterials = computed(() => allMaterials.value.filter(m => !m.isDeleted))

function openMaterialsEdit() {
  editUsage.value      = JSON.parse(JSON.stringify(item.value?.materialUsage ?? []))
  editAdditional.value = JSON.parse(JSON.stringify(item.value?.additionalCosts ?? []))
  materialsError.value = ''
  materialsDialog.value = true
}

function closeMaterialsDialog() {
  materialsDialog.value = false
  materialsError.value  = ''
}

function addEditMaterial() {
  editUsage.value.push({
    id:               generateId(),
    materialId:       undefined as any,
    materialName:     '',
    quantity:         1,
    unit:             'yard',
    source:           'inventory',
    costAtTime:       0,
    unitPriceCharged: 0,
    chargeToCustomer: false,
    locked:           false,
  })
}

function onEditMaterialSelected(idx: number) {
  const entry = editUsage.value[idx]
  const mat   = allMaterials.value.find(m => m.id === entry.materialId)
  if (!mat) return
  entry.materialName = mat.name
  entry.unit         = mat.unit
  entry.costAtTime   = mat.currentUnitCost
}

async function submitMaterialsEdit() {
  if (!item.value) return
  isSavingMaterials.value = true
  materialsError.value = ''
  try {
    await updateItem(item.value.id, {
      materialUsage:   editUsage.value,
      additionalCosts: editAdditional.value,
    })
    materialsDialog.value = false
    await loadItem()
  } catch (err) {
    materialsError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isSavingMaterials.value = false
  }
}

// ── Measurement dialog ────────────────────────────────────────────────────────
const measurementDialog    = ref(false)
const mMode                = ref<'template' | 'new'>('template')
const mSelectedId          = ref<string | undefined>(undefined)
const isSavingMeasurement  = ref(false)
const measurementError     = ref('')

const mForm = reactive({
  label:          '',
  category:       'dress' as GarmentCategory,
  measurements:   {} as MeasurementMap,
  unit:           'inches' as 'inches' | 'cm',
  saveAsTemplate: false,
})

const mDialogFields = computed<string[]>(() => {
  if (mForm.category === 'custom') return []
  return MEASUREMENT_FIELDS[mForm.category] ?? []
})

function seedMDialogFields() {
  const fields  = MEASUREMENT_FIELDS[mForm.category] ?? []
  const seeded: MeasurementMap = {}
  for (const f of fields) seeded[f] = (mForm.measurements[f] as number) ?? 0
  mForm.measurements = seeded
}

watch(() => mForm.category, () => {
  if (mMode.value === 'new') seedMDialogFields()
})

const canSaveMeasurement = computed(() =>
  mMode.value === 'template' ? !!mSelectedId.value : mForm.label.trim().length > 0
)

function openMeasurementDialog() {
  mSelectedId.value = item.value?.measurementProfileId
  mMode.value = item.value?.measurementProfileId ? 'template' : 'new'
  measurementError.value = ''
  seedMDialogFields()
  measurementDialog.value = true
}

async function submitMeasurement() {
  if (!item.value) return
  isSavingMeasurement.value = true
  measurementError.value = ''
  try {
    let profileId: string | undefined

    if (mMode.value === 'template') {
      profileId = mSelectedId.value
    } else {
      if (mForm.saveAsTemplate) {
        const profile = await createMeasurementProfile({
          label:        mForm.label,
          category:     mForm.category,
          measurements: mForm.measurements,
          unit:         mForm.unit,
          isTemplate:   true,
        })
        profileId = profile.id
      }
    }

    await updateItem(item.value.id, { measurementProfileId: profileId })
    measurementDialog.value = false
    await loadItem()
  } catch (err) {
    measurementError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    isSavingMeasurement.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return `${auth.shop?.currencySymbol ?? ''}${n.toLocaleString()}` }
function formatDate(d: string) { return dayjs(d).format('MMM D, YYYY') }
function formatRelative(d: string) { return dayjs(d).fromNow() }

const garmentCategories = [
  { value: 'dress',   label: 'Dress'   }, { value: 'gown',    label: 'Gown'    },
  { value: 'suit',    label: 'Suit'    }, { value: 'shirt',   label: 'Shirt'   },
  { value: 'trouser', label: 'Trouser' }, { value: 'skirt',   label: 'Skirt'   },
  { value: 'blouse',  label: 'Blouse'  }, { value: 'jacket',  label: 'Jacket'  },
  { value: 'abaya',   label: 'Abaya'   }, { value: 'ankara',  label: 'Ankara'  },
  { value: 'asoebi',  label: 'Asoebi'  }, { value: 'agbada',  label: 'Agbada'  },
  { value: 'custom',  label: 'Custom'  },
]

onMounted(async () => {
  await Promise.all([loadMaterials(), loadTemplates()])
  await loadItem()
})
</script>

<style scoped>
@reference "~/assets/css/main.css";

.detail-label {
  @apply text-xs font-semibold text-ink-muted uppercase tracking-wider;
}
</style>
