<!-- app/pages/orders/new.vue -->
<template>
  <div class="animate-fade-in min-h-screen bg-cream">
    <!-- Header -->
    <header class="page-header">
      <div class="flex items-center gap-3">
        <button class="header-action-btn" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <div>
          <h1 class="page-title">New Order</h1>
          <p class="page-subtitle">Step {{ step + 1 }} of {{ steps.length }} — {{ steps[step].label }}</p>
        </div>
      </div>
      <!-- Step progress -->
      <div class="flex gap-1.5 mt-4">
        <div
          v-for="(s, i) in steps"
          :key="i"
          :class="['flex-1 h-1 rounded-full transition-all duration-300', i <= step ? 'bg-gold' : 'bg-white/20']"
        />
      </div>
    </header>

    <div class="px-4 pt-5 pb-28">
      <Transition name="slide-up" mode="out-in">

        <!-- ── Step 0: Select Customer ─────────────────────────────────────── -->
        <div v-if="step === 0" key="customer">
          <h2 class="section-title mb-4">Who is this order for?</h2>

          <div class="search-bar mb-3">
            <Search :size="16" stroke-width="2" />
            <input v-model="customerSearch" placeholder="Search by name or phone…" />
          </div>

          <!-- New customer shortcut -->
          <button
            class="flex items-center gap-3 w-full card p-3.5 mb-3 text-left border-dashed hover:border-gold/40 transition-colors"
            @click="createNewCustomer = true"
          >
            <div class="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
              <UserPlus :size="18" stroke-width="1.8" class="stroke-gold" />
            </div>
            <div>
              <p class="text-sm font-semibold text-ink">New customer</p>
              <p class="text-xs text-ink-muted">Add and continue</p>
            </div>
          </button>

          <div v-if="isLoadingCustomers" class="space-y-2">
            <div v-for="i in 5" :key="i" class="h-16 skeleton rounded-xl" />
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="c in filteredCustomers"
              :key="c.id"
              :class="[
                'w-full flex items-center gap-3 card p-3.5 text-left transition-all duration-150',
                selectedCustomer?.id === c.id ? 'border-gold ring-2 ring-gold/20' : 'hover:shadow-card-md',
              ]"
              @click="selectCustomer(c)"
            >
              <div class="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                <span class="font-display text-lg text-gold">{{ c.name.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink truncate">{{ c.name }}</p>
                <p class="text-xs text-ink-muted">{{ c.phone ?? c.email ?? 'No contact' }}</p>
              </div>
              <div v-if="c.totalOrders > 0" class="text-right flex-shrink-0">
                <p class="font-mono-dm text-xs text-gold">{{ c.totalOrders }} orders</p>
              </div>
              <CheckCircle2
                v-if="selectedCustomer?.id === c.id"
                :size="18" stroke-width="2"
                class="stroke-gold flex-shrink-0"
              />
            </button>
          </div>
        </div>

        <!-- ── Step 1: Order Items ─────────────────────────────────────────── -->
        <div v-else-if="step === 1" key="items">
          <h2 class="section-title mb-1">What are you making?</h2>
          <p class="text-sm text-ink-muted mb-4">Add the garments for this order</p>

          <div class="space-y-3 mb-4">
            <div
              v-for="(item, idx) in form.items"
              :key="idx"
              class="card p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-ink">Item {{ idx + 1 }}</p>
                <button
                  v-if="form.items.length > 1"
                  class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center"
                  @click="removeItem(idx)"
                >
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
              <div class="space-y-3">
                <div>
                  <label class="form-label">Garment name</label>
                  <input v-model="item.name" placeholder="e.g. Wedding Gown" class="form-input" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="form-label">Category</label>
                    <select v-model="item.category" class="form-input">
                      <option v-for="c in garmentCategories" :key="c.value" :value="c.value">{{ c.label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Qty</label>
                    <input v-model.number="item.quantity" type="number" min="1" class="form-input" />
                  </div>
                </div>
                <div>
                  <label class="form-label">Price per item ({{ auth.shop?.currencySymbol }})</label>
                  <input v-model.number="item.unitPrice" type="number" min="0" placeholder="0" class="form-input font-mono-dm" />
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn-outline btn-md btn-full mb-4" @click="addItem">
            <Plus :size="16" stroke-width="2" />
            Add another item
          </button>

          <!-- Pricing summary -->
          <div class="card p-4">
            <h3 class="text-sm font-semibold text-ink mb-3">Pricing</h3>
            <div class="space-y-2 mb-3">
              <div class="flex justify-between text-sm">
                <span class="text-ink-muted">Subtotal</span>
                <span class="font-mono-dm">{{ fmt(pricing.subtotal) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm text-ink-muted flex-1">Discount</span>
                <input v-model.number="form.discount" type="number" min="0" class="form-input w-24 text-right font-mono-dm py-1.5 text-sm" />
                <select v-model="form.discountType" class="form-input w-16 py-1.5 text-sm">
                  <option value="fixed">{{ auth.shop?.currencySymbol }}</option>
                  <option value="percent">%</option>
                </select>
              </div>
              <div class="flex justify-between text-sm border-t border-cream-dark pt-2">
                <span class="font-semibold text-ink">Total</span>
                <span class="font-mono-dm font-semibold text-ink text-base">{{ fmt(pricing.total) }}</span>
              </div>
            </div>
            <div>
              <label class="form-label">Deposit amount ({{ auth.shop?.currencySymbol }})</label>
              <input v-model.number="form.depositAmount" type="number" min="0" class="form-input font-mono-dm" />
              <p class="form-hint">Balance: {{ fmt(Math.max(0, pricing.total - form.depositAmount)) }}</p>
            </div>
          </div>
        </div>

        <!-- ── Step 2: Materials & Costs ─────────────────────────────────────────── -->
        <div v-else-if="step === 2" key="materials">
          <h2 class="section-title mb-1">Materials & additional costs</h2>
          <p class="text-sm text-ink-muted mb-4">
            Select materials from your inventory or note customer-supplied fabric
          </p>

          <!-- Material lines -->
          <div class="space-y-3 mb-4">
            <div v-for="(entry, idx) in form.materialUsage" :key="idx" class="card p-4">
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-ink">Material {{ idx + 1 }}</p>
                <button class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center"
                        @click="removeMaterial(idx)">
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>

              <!-- Source toggle -->
              <div class="flex rounded-lg overflow-hidden border border-cream-dark mb-3">
                <button
                  :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                    entry.source === 'inventory' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="entry.source = 'inventory'">
                  From stock
                </button>
                <button
                  :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                    entry.source === 'customer_supplied' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="entry.source = 'customer_supplied'; entry.materialId = undefined">
                  Customer brings
                </button>
              </div>

              <!-- Inventory picker -->
              <div v-if="entry.source === 'inventory'" class="mb-3">
                <label class="form-label">Select material</label>
                <select v-model="entry.materialId" class="form-input" @change="onMaterialSelected(idx)">
                  <option value="">Choose from inventory…</option>
                  <option v-for="m in availableMaterials" :key="m.id" :value="m.id">
                    {{ m.name }} ({{ m.currentStock }} {{ m.unit }} in stock)
                  </option>
                </select>
              </div>

              <!-- Customer-supplied: just a name -->
              <div v-else class="mb-3">
                <label class="form-label">Fabric / material description</label>
                <input v-model="entry.materialName" placeholder="e.g. Aso-oke lace (customer)"
                      class="form-input" />
              </div>

              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="form-label">Quantity</label>
                  <input v-model.number="entry.quantity" type="number" min="0.01" step="0.25"
                        class="form-input" @input="recalc" />
                </div>
                <div>
                  <label class="form-label">Unit</label>
                  <input v-model="entry.unit" class="form-input" placeholder="yard" />
                </div>
              </div>

              <!-- Charge options -->
              <div class="flex items-center gap-2 mb-3">
                <input type="checkbox" :id="`charge-${idx}`" v-model="entry.chargeToCustomer"
                      class="rounded" @change="recalc" />
                <label :for="`charge-${idx}`" class="text-sm text-ink">Add to order total</label>
              </div>

              <div v-if="entry.chargeToCustomer">
                <label class="form-label">Price charged to customer ({{ auth.shop?.currencySymbol }})</label>
                <div class="flex items-center gap-2">
                  <input v-model.number="entry.unitPriceCharged" type="number" min="0"
                        class="form-input font-mono-dm flex-1" @input="recalc" />
                  <span class="text-xs text-ink-muted">per {{ entry.unit }}</span>
                </div>
                <p v-if="entry.source === 'inventory' && entry.costAtTime > 0" class="form-hint">
                  Cost price: {{ fmt(entry.costAtTime) }}/{{ entry.unit }}
                </p>
              </div>
            </div>
          </div>

          <button class="btn btn-outline btn-md btn-full mb-5" @click="addMaterial">
            <Plus :size="16" stroke-width="2" />
            Add material
          </button>

          <!-- Additional costs -->
          <h3 class="text-sm font-semibold text-ink mb-2">Additional costs</h3>
          <p class="text-xs text-ink-muted mb-3">
            Embroidery, logistics, rush fees, etc.
          </p>
          <div class="space-y-2 mb-3">
            <div v-for="(cost, idx) in form.additionalCosts" :key="idx"
                class="flex items-center gap-2">
              <input v-model="cost.label" placeholder="Description" class="form-input flex-1" />
              <input v-model.number="cost.amount" type="number" min="0"
                    class="form-input w-28 font-mono-dm" @input="recalc" />
              <button class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0"
                      @click="form.additionalCosts.splice(idx, 1); recalc()">
                <X :size="14" stroke-width="2" class="stroke-danger" />
              </button>
            </div>
          </div>
          <button class="btn btn-outline btn-sm mb-4" @click="addAdditionalCost">
            <Plus :size="14" /> Add cost
          </button>

          <!-- Pricing preview -->
          <div class="card p-4 bg-cream">
            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Items subtotal</span>
                <span class="font-mono-dm">{{ fmt(pricing.itemsSubtotal) }}</span>
              </div>
              <div v-if="pricing.materialSubtotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Materials</span>
                <span class="font-mono-dm">{{ fmt(pricing.materialSubtotal) }}</span>
              </div>
              <div v-if="pricing.extrasSubtotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(pricing.extrasSubtotal) }}</span>
              </div>
              <div class="flex justify-between font-semibold pt-1.5 border-t border-cream-dark">
                <span>Total</span>
                <span class="font-mono-dm text-base">{{ fmt(pricing.total) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Step 3: Measurements & Details ─────────────────────────────── -->
        <div v-else-if="step === 3" key="details">
          <h2 class="section-title mb-1">Measurements & details</h2>
          <p class="text-sm text-ink-muted mb-4">Attach measurements and order specifics</p>
        
          <!-- ── Measurement source picker ── -->
          <div class="mb-4">
            <label class="form-label">Measurements</label>
            <div class="flex rounded-xl overflow-hidden border border-cream-dark">
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  measurementMode === 'none' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('none')"
              >
                Skip for now
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors border-x border-cream-dark',
                  measurementMode === 'existing' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('existing')"
              >
                Use saved profile
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  measurementMode === 'new' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('new')"
              >
                Record now
              </button>
            </div>
          </div>
        
          <!-- ── Mode: Use existing profile ── -->
          <div v-if="measurementMode === 'existing'" class="mb-4">
            <div v-if="customerProfiles.length > 0" class="space-y-2">
              <button
                v-for="p in customerProfiles"
                :key="p.id"
                :class="[
                  'w-full flex items-center gap-3 card p-3.5 text-left transition-all',
                  form.measurementProfileId === p.id ? 'border-gold ring-2 ring-gold/20' : '',
                ]"
                @click="form.measurementProfileId = form.measurementProfileId === p.id ? undefined : p.id"
              >
                <Ruler :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ p.label }}</p>
                  <p class="text-xs text-ink-muted capitalize">{{ p.category }} · {{ p.takenAt ?? 'No date' }}</p>
                </div>
                <CheckCircle2
                  v-if="form.measurementProfileId === p.id"
                  :size="16" stroke-width="2" class="stroke-gold flex-shrink-0"
                />
              </button>
            </div>
            <div v-else class="alert alert-info text-xs">
              <Info :size="14" stroke-width="2" class="stroke-info flex-shrink-0" />
              No saved profiles for this customer. Switch to "Record now" to add one.
            </div>
          </div>
        
          <!-- ── Mode: Record new measurements ── -->
          <div v-if="measurementMode === 'new'" class="mb-4 space-y-4">
        
            <!-- Profile label -->
            <div>
              <label class="form-label">Profile label</label>
              <input
                v-model="form.inlineMeasurement.label"
                placeholder="e.g. Wedding Gown – Nov 2025"
                class="form-input"
              />
            </div>
        
            <!-- Garment category — drives the field set -->
            <div>
              <label class="form-label">Garment category</label>
              <select v-model="form.inlineMeasurement.category" class="form-input">
                <option v-for="c in garmentCategories" :key="c.value" :value="c.value">
                  {{ c.label }}
                </option>
              </select>
            </div>
        
            <!-- Measurement unit toggle -->
            <div class="flex items-center gap-3">
              <label class="form-label mb-0">Unit</label>
              <div class="flex rounded-lg overflow-hidden border border-cream-dark">
                <button
                  :class="['px-4 py-1.5 text-xs font-semibold transition-colors',
                    form.inlineMeasurement.unit === 'inches' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="form.inlineMeasurement.unit = 'inches'"
                >
                  Inches
                </button>
                <button
                  :class="['px-4 py-1.5 text-xs font-semibold transition-colors',
                    form.inlineMeasurement.unit === 'cm' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="form.inlineMeasurement.unit = 'cm'"
                >
                  cm
                </button>
              </div>
            </div>
        
            <!-- Dynamic measurement fields from category -->
            <div v-if="activeMeasurementFields.length > 0">
              <label class="form-label mb-2">Measurements ({{ form.inlineMeasurement.unit }})</label>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="field in activeMeasurementFields" :key="field">
                  <label class="form-label text-2xs uppercase tracking-wider">
                    {{ field.replace(/_/g, ' ') }}
                  </label>
                  <input
                    v-model.number="form.inlineMeasurement.measurements[field]"
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="0"
                    class="form-input font-mono-dm"
                  />
                </div>
              </div>
            </div>
        
            <!-- Custom category: free-form field entry -->
            <div v-if="form.inlineMeasurement.category === 'custom'" class="space-y-3">
              <div
                v-for="(_, key) in form.inlineMeasurement.measurements"
                :key="key"
                class="flex items-center gap-2"
              >
                <input
                  :value="key"
                  placeholder="Field name"
                  class="form-input flex-1"
                  @change="renameMeasurementField(key, ($event.target as HTMLInputElement).value)"
                />
                <input
                  v-model.number="form.inlineMeasurement.measurements[key]"
                  type="number"
                  min="0"
                  step="0.25"
                  class="form-input w-28 font-mono-dm"
                />
                <button
                  class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0"
                  @click="removeCustomField(key)"
                >
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
              <button class="btn btn-outline btn-sm" @click="addCustomField">
                <Plus :size="14" stroke-width="2" />
                Add field
              </button>
            </div>
        
            <!-- Notes -->
            <div>
              <label class="form-label">Notes (optional)</label>
              <textarea
                v-model="form.inlineMeasurement.notes"
                rows="2"
                placeholder="e.g. Taken with clothes on, add 1cm ease"
                class="form-input resize-none text-sm"
              />
            </div>
        
            <!-- Save to profile toggle -->
            <div class="card p-3.5 flex items-start gap-3">
              <div class="pt-0.5">
                <input
                  type="checkbox"
                  id="save-to-profile"
                  v-model="form.inlineMeasurement.saveToProfile"
                  class="rounded"
                />
              </div>
              <div>
                <label for="save-to-profile" class="text-sm font-semibold text-ink cursor-pointer">
                  Save as customer profile
                </label>
                <p class="text-xs text-ink-muted mt-0.5">
                  Reuse these measurements on future orders for this customer
                </p>
              </div>
            </div>
          </div>
        
          <!-- ── Priority ── -->
          <div class="mb-4">
            <label class="form-label">Priority</label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="p in priorities"
                :key="p.value"
                :class="['btn btn-outline btn-sm text-xs', form.priority === p.value ? 'bg-ink text-white border-ink' : '']"
                @click="form.priority = p.value"
              >
                {{ p.icon }} {{ p.label }}
              </button>
            </div>
          </div>
        
          <!-- ── Due date ── -->
          <div class="mb-4">
            <label class="form-label">Due date</label>
            <input v-model="form.dueDate" type="date" :min="today" class="form-input" />
          </div>
        
          <!-- ── Style notes ── -->
          <div class="mb-4">
            <label class="form-label">Style notes & instructions</label>
            <textarea
              v-model="form.styleNotes"
              rows="4"
              placeholder="Describe the style, design preferences, special instructions…"
              class="form-input resize-none"
            />
          </div>
        </div>

        <!-- ── Step 4: Review & Create ─────────────────────────────────────── -->
        <div v-else-if="step === 4" key="review">
          <h2 class="section-title mb-4">Review order</h2>
        
          <!-- ── Customer ── -->
          <div class="card p-4 mb-3">
            <p class="review-section-label">Customer</p>
            <div class="flex items-center gap-3 mt-2">
              <div class="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                <span class="font-display text-lg text-gold">{{ selectedCustomer?.name.charAt(0) }}</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-ink">{{ selectedCustomer?.name }}</p>
                <p class="text-xs text-ink-muted">{{ selectedCustomer?.phone ?? selectedCustomer?.email ?? 'No contact info' }}</p>
              </div>
            </div>
          </div>
        
          <!-- ── Items ── -->
          <div class="card p-4 mb-3">
            <p class="review-section-label">Garment items</p>
            <div class="mt-2 space-y-2">
              <div v-for="item in form.items" :key="item.name" class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-medium text-ink">
                    {{ item.quantity > 1 ? `${item.quantity}× ` : '' }}{{ item.name }}
                  </p>
                  <p class="text-xs text-ink-muted capitalize">{{ item.category }}</p>
                </div>
                <p class="font-mono-dm text-sm text-ink flex-shrink-0 ml-3">
                  {{ fmt(item.quantity * item.unitPrice) }}
                </p>
              </div>
            </div>
          </div>
        
          <!-- ── Materials ── (only shown if any were added) -->
          <div v-if="form.materialUsage.length > 0" class="card p-4 mb-3">
            <p class="review-section-label">Materials</p>
            <div class="mt-2 space-y-2.5">
              <div
                v-for="m in form.materialUsage"
                :key="m.materialId ?? m.materialName"
                class="flex items-start justify-between"
              >
                <div class="flex-1 min-w-0 pr-3">
                  <p class="text-sm font-medium text-ink">{{ m.materialName || '—' }}</p>
                  <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
                  <p v-else class="text-xs text-ink-muted italic">not charged</p>
                </div>
              </div>
            </div>
          </div>
        
          <!-- ── Additional costs ── (only shown if any were added) -->
          <div v-if="form.additionalCosts.length > 0" class="card p-4 mb-3">
            <p class="review-section-label">Additional costs</p>
            <div class="mt-2 space-y-2">
              <div v-for="c in form.additionalCosts" :key="c.id" class="flex justify-between text-sm">
                <span class="text-ink">{{ c.label || 'Unnamed cost' }}</span>
                <span class="font-mono-dm">{{ fmt(c.amount) }}</span>
              </div>
            </div>
          </div>
        
          <!-- ── Measurements ── -->
          <div class="card p-4 mb-3">
            <p class="review-section-label">Measurements</p>
            <div class="mt-2">
              <!-- Existing profile selected -->
              <div v-if="measurementMode === 'existing' && form.measurementProfileId">
                <div class="flex items-center gap-2">
                  <Ruler :size="14" stroke-width="1.8" class="stroke-gold flex-shrink-0" />
                  <p class="text-sm text-ink">
                    {{ customerProfiles.find(p => p.id === form.measurementProfileId)?.label }}
                  </p>
                </div>
                <p class="text-xs text-ink-muted mt-1 pl-5">Existing profile attached</p>
              </div>
        
              <!-- New inline measurements recorded -->
              <div v-else-if="measurementMode === 'new' && hasInlineMeasurements">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium text-ink">{{ form.inlineMeasurement.label || 'New profile' }}</p>
                  <span
                    :class="['text-xs font-semibold px-2 py-0.5 rounded-full',
                      form.inlineMeasurement.saveToProfile
                        ? 'bg-success/10 text-success'
                        : 'bg-ink/5 text-ink-muted']"
                  >
                    {{ form.inlineMeasurement.saveToProfile ? 'Will save to profile' : 'Order only' }}
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-x-4 gap-y-1.5">
                  <div
                    v-for="(val, key) in filledMeasurements"
                    :key="key"
                    class="flex justify-between text-xs"
                  >
                    <span class="text-ink-muted capitalize">{{ String(key).replace(/_/g, ' ') }}</span>
                    <span class="font-mono-dm text-ink">{{ val }}"</span>
                  </div>
                </div>
              </div>
        
              <!-- Skipped -->
              <p v-else class="text-sm text-ink-muted">Skipped — can be added after creation</p>
            </div>
          </div>
        
          <!-- ── Order details ── -->
          <div class="card p-4 mb-3">
            <p class="review-section-label">Order details</p>
            <div class="mt-2 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Priority</span>
                <span class="text-ink capitalize">{{ form.priority }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted">Due date</span>
                <span class="text-ink">{{ form.dueDate ? formatDate(form.dueDate) : 'Not set' }}</span>
              </div>
              <div v-if="form.styleNotes" class="pt-1">
                <p class="text-ink-muted mb-1">Style notes</p>
                <p class="text-ink text-xs leading-relaxed line-clamp-3">{{ form.styleNotes }}</p>
              </div>
            </div>
          </div>
        
          <!-- ── Full pricing breakdown ── -->
          <div class="card p-4 mb-5">
            <p class="review-section-label">Pricing summary</p>
            <div class="mt-2 space-y-2 text-sm">
              <!-- Items line -->
              <div class="flex justify-between">
                <span class="text-ink-muted">Items subtotal</span>
                <span class="font-mono-dm">{{ fmt(pricing.itemsSubtotal) }}</span>
              </div>
        
              <!-- Materials line (only if any are charged) -->
              <div v-if="pricing.materialSubtotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Materials</span>
                <span class="font-mono-dm">{{ fmt(pricing.materialSubtotal) }}</span>
              </div>
        
              <!-- Additional costs line -->
              <div v-if="pricing.extrasSubtotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(pricing.extrasSubtotal) }}</span>
              </div>
        
              <!-- Gross subtotal (only show if there are multiple contributing lines) -->
              <div
                v-if="hasMultiplePricingLines"
                class="flex justify-between border-t border-cream-dark pt-2"
              >
                <span class="text-ink-muted">Subtotal</span>
                <span class="font-mono-dm">{{ fmt(pricing.subtotal) }}</span>
              </div>
        
              <!-- Discount -->
              <div v-if="form.discount > 0" class="flex justify-between">
                <span class="text-ink-muted">
                  Discount
                  <span v-if="form.discountType === 'percent'" class="text-xs">({{ form.discount }}%)</span>
                </span>
                <span class="font-mono-dm text-success">−{{ fmt(pricing.discount) }}</span>
              </div>
        
              <!-- Tax -->
              <div v-if="pricing.tax > 0" class="flex justify-between">
                <span class="text-ink-muted">Tax ({{ auth.shop?.settings.taxRate }}%)</span>
                <span class="font-mono-dm">{{ fmt(pricing.tax) }}</span>
              </div>
        
              <!-- Total -->
              <div class="flex justify-between border-t border-cream-dark pt-2 font-semibold text-base">
                <span class="text-ink">Total</span>
                <span class="font-mono-dm text-ink">{{ fmt(pricing.total) }}</span>
              </div>
        
              <!-- Payment split -->
              <div class="mt-1 pt-2 space-y-1.5 border-t border-cream-dark">
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Deposit on creation</span>
                  <span class="font-mono-dm text-ink">{{ fmt(form.depositAmount) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Balance remaining</span>
                  <span
                    :class="['font-mono-dm font-semibold',
                      balanceRemaining > 0 ? 'text-danger' : 'text-success']"
                  >
                    {{ fmt(balanceRemaining) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        
          <div v-if="createError" class="alert alert-danger mb-4 text-xs">
            <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
            {{ createError }}
          </div>
        
          <button
            class="btn btn-gold btn-lg btn-full"
            :disabled="isCreating"
            @click="createOrder"
          >
            <Loader2 v-if="isCreating" :size="16" class="animate-spin" />
            <span>{{ isCreating ? 'Creating…' : 'Create order' }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <!-- Bottom nav buttons -->
    <div class="fixed bottom-4 left-0 right-0 bg-surface border-t border-cream-dark px-4 py-3 pb-safe flex gap-3">
      <button v-if="step > 0" class="btn btn-outline btn-md flex-1" @click="step--">
        ← Back
      </button>
      <button
        v-if="step < steps.length - 1"
        class="btn btn-primary btn-md flex-1"
        :disabled="!canProceed"
        @click="nextStep"
      >
        Continue →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ArrowLeft, Search, UserPlus, CheckCircle2, Plus, X,
  Ruler, Info, AlertCircle, Loader2,
} from 'lucide-vue-next'
import { useCustomers } from '~/composables/useCustomers'
import { useOrders } from '~/composables/useOrders'
import { useMeasurements } from '~/composables/useMeasurements'
import { useMaterials } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { generateId } from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type { Customer, OrderItem, OrderPriority, MaterialUsageEntry, AdditionalCost, GarmentCategory, MeasurementMap } from '~/types/models'
import dayjs from 'dayjs'

type MeasurementMode = 'none' | 'existing' | 'new'

definePageMeta({ layout: 'plain' })
useHead({ title: 'New Order — eTailor' })

const auth   = useAuthStore()
const router = useRouter()

const { customers, isLoading: isLoadingCustomers, loadAll: loadCustomers } = useCustomers()
const { create: createOrderFn, calcPricing } = useOrders()
const { profiles: customerProfiles, loadForCustomer } = useMeasurements()
const { materials: allMaterials, loadAll: loadMaterials } = useMaterials()

// ── Wizard state ──────────────────────────────────────────────────────────────
const step = ref(0)
const steps = [
  { label: 'Customer' },
  { label: 'Items & Pricing' },
  { label: 'Materials & Costs' },
  { label: 'Details' },
  { label: 'Review' },
]

const selectedCustomer  = ref<Customer | null>(null)
const customerSearch    = ref('')
const createNewCustomer = ref(false)
const createError       = ref('')
const isCreating        = ref(false)

const measurementMode = ref<MeasurementMode>('none')

const form = reactive({
  items: [{ name: '', category: 'dress', quantity: 1, unitPrice: 0 }] as Omit<OrderItem, "id">[],
  discount:             0,
  discountType:         'fixed' as 'fixed' | 'percent',
  depositAmount:        0,
  measurementProfileId: undefined as string | undefined,
  priority:             'normal' as OrderPriority,
  dueDate:              '',
  styleNotes:           '',
  materialUsage: [] as Omit<MaterialUsageEntry, 'id' | 'locked' | 'stockMovementId'>[],
  additionalCosts: [] as AdditionalCost[],
  inlineMeasurement: {
    label:         '',
    category:      'dress' as GarmentCategory,
    measurements:  {} as MeasurementMap,
    unit:          'inches' as 'inches' | 'cm',
    notes:         '',
    saveToProfile: false,
  },
})

const today = dayjs().format('YYYY-MM-DD')

// ── Filtered customers ────────────────────────────────────────────────────────
const filteredCustomers = computed(() => {
  if (!customerSearch.value) return customers.value.slice(0, 20)
  const q = customerSearch.value.toLowerCase()
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone?.includes(q),
  )
})

// ── Materials ────────────────────────────────────────────────────────
const availableMaterials = computed(() =>
  allMaterials.value.filter(m => !m.isDeleted && m.currentStock > 0)
)

function addMaterial() {
  form.materialUsage.push({
    materialId:       undefined,
    materialName:     '',
    quantity:         1,
    unit:             'yard',
    source:           'inventory',
    costAtTime:       0,
    unitPriceCharged: 0,
    chargeToCustomer: true,
  })
}

function removeMaterial(idx: number) {
  form.materialUsage.splice(idx, 1)
  recalc()
}

function addAdditionalCost() {
  form.additionalCosts.push({ id: generateId(), label: '', amount: 0 })
}

function onMaterialSelected(idx: number) {
  const entry = form.materialUsage[idx]
  const mat = allMaterials.value.find(m => m.id === entry?.materialId)
  if (mat) {
    entry.materialName     = mat.name
    entry.unit             = mat.unit
    entry.costAtTime       = mat.currentUnitCost
    entry.unitPriceCharged = mat.currentUnitCost  // default to cost; tailor can override
  }
  recalc()
}

function recalc() {
  // pricing computed property will auto-update since form is reactive
  // Update deposit suggestion if on step 1
  if (step.value === 1) {
    form.depositAmount = Math.round(
      pricing.value.total * ((auth.shop?.settings.defaultDepositPercent ?? 50) / 100)
    )
  }
}

// ── Measurements ───────────────────────────────────────────────────────────────────
function setMeasurementMode(mode: MeasurementMode) {
  measurementMode.value = mode
  // Clear conflicting selections when switching
  if (mode !== 'existing') form.measurementProfileId = undefined
  if (mode !== 'new') {
    form.inlineMeasurement.measurements = {}
    form.inlineMeasurement.label = ''
  }
  // Seed field keys for the selected category when switching to 'new'
  if (mode === 'new') seedMeasurementFields()
}
 
// ─── Seed measurement fields for the active category ────────────────────────
function seedMeasurementFields() {
  const fields = MEASUREMENT_FIELDS[form.inlineMeasurement.category] ?? []
  const existing = form.inlineMeasurement.measurements
  const seeded: MeasurementMap = {}
  for (const f of fields) {
    seeded[f] = existing[f] ?? 0
  }
  form.inlineMeasurement.measurements = seeded
}

// ─── Custom measurement field helpers ───────────────────────────────────────
function addCustomField() {
  const key = `field_${Object.keys(form.inlineMeasurement.measurements).length + 1}`
  form.inlineMeasurement.measurements = {
    ...form.inlineMeasurement.measurements,
    [key]: 0,
  }
}
 
function removeCustomField(key: string) {
  const updated = { ...form.inlineMeasurement.measurements }
  delete updated[key]
  form.inlineMeasurement.measurements = updated
}
 
function renameMeasurementField(oldKey: string, newKey: string) {
  if (!newKey || newKey === oldKey) return
  const entries = Object.entries(form.inlineMeasurement.measurements)
  const updated: MeasurementMap = {}
  for (const [k, v] of entries) {
    updated[k === oldKey ? newKey : k] = v
  }
  form.inlineMeasurement.measurements = updated
}
 
// ─── Computed: active fields from category ───────────────────────────────────
const activeMeasurementFields = computed<string[]>(() => {
  if (form.inlineMeasurement.category === 'custom') return []
  return MEASUREMENT_FIELDS[form.inlineMeasurement.category] ?? []
})
 
// ─── Computed: review helpers ────────────────────────────────────────────────
const hasInlineMeasurements = computed(() => {
  return Object.values(form.inlineMeasurement.measurements).some(v => v && v > 0)
})
 
const filledMeasurements = computed(() => {
  return Object.fromEntries(
    Object.entries(form.inlineMeasurement.measurements).filter(([_, v]) => v && v > 0)
  )
})
 
const hasMultiplePricingLines = computed(() => {
  let lines = 0
  if (pricing.value.itemsSubtotal > 0) lines++
  if (pricing.value.materialSubtotal > 0) lines++
  if (pricing.value.extrasSubtotal > 0) lines++
  return lines > 1
})
 
const balanceRemaining = computed(() =>
  Math.max(0, pricing.value.total - form.depositAmount)
)

// ── Pricing ───────────────────────────────────────────────────────────────────
const pricing = computed(() =>
  calcPricing(form.items, form.materialUsage, form.additionalCosts, form.discount, form.discountType, auth.shop?.settings.taxRate ?? 0),
)

// ── Validation ────────────────────────────────────────────────────────────────
const canProceed = computed(() => {
  if (step.value === 0) return !!selectedCustomer.value
  if (step.value === 1) {
    return form.items.every(i => i.name && i.unitPrice >= 0) && form.items.length > 0
  }
  if (step.value === 2) return true  // materials step is fully optional
  if (step.value === 3) {
    // If 'new' mode, require at least a label
    if (measurementMode.value === 'new') {
      return form.inlineMeasurement.label.trim().length > 0
    }
    return true
  }
  return true
})

// ── Actions ───────────────────────────────────────────────────────────────────
function selectCustomer(c: Customer) {
  selectedCustomer.value = c
}

async function nextStep() {
  if (step.value === 0 && selectedCustomer.value) {
    await loadForCustomer(selectedCustomer.value.id)
    // Set default deposit
    form.depositAmount = Math.round(pricing.value.total * ((auth.shop?.settings.defaultDepositPercent ?? 50) / 100))
  }
  step.value++
}

function addItem() {
  form.items.push({ name: '', category: 'dress', quantity: 1, unitPrice: 0 })
}

function removeItem(idx: number) {
  form.items.splice(idx, 1)
}

async function createOrder() {
  if (!selectedCustomer.value) return
  isCreating.value = true
  createError.value = ''
  try {
    const order = await createOrderFn({
      customerId:           selectedCustomer.value.id,
      items:                form.items,
      measurementProfileId: form.measurementProfileId,
      priority:             form.priority,
      dueDate:              form.dueDate || undefined,
      depositAmount:        form.depositAmount,
      discount:             form.discount,
      discountType:         form.discountType,
      styleNotes:           form.styleNotes || undefined,
      materialUsage:        form.materialUsage,
      additionalCosts:      form.additionalCosts,
      inlineMeasurement:    measurementMode.value === 'new' ? {
        label:         form.inlineMeasurement.label,
        category:      form.inlineMeasurement.category,
        measurements:  form.inlineMeasurement.measurements,
        unit:          form.inlineMeasurement.unit,
        notes:         form.inlineMeasurement.notes,
        saveToProfile: form.inlineMeasurement.saveToProfile,
      } : undefined,
    }, selectedCustomer.value.name)

    await router.replace(`/orders/${order.id}`)
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Failed to create order'
  } finally {
    isCreating.value = false
  }
}

function fmt(amount: number): string {
  return `${auth.shop?.currencySymbol}${amount.toLocaleString()}`
}

function formatDate(date: string): string {
  return dayjs(date).format('MMM D, YYYY')
}

const garmentCategories = [
  { value: 'dress',   label: 'Dress' },
  { value: 'gown',    label: 'Gown' },
  { value: 'suit',    label: 'Suit' },
  { value: 'shirt',   label: 'Shirt' },
  { value: 'trouser', label: 'Trouser' },
  { value: 'skirt',   label: 'Skirt' },
  { value: 'blouse',  label: 'Blouse' },
  { value: 'jacket',  label: 'Jacket' },
  { value: 'abaya',   label: 'Abaya' },
  { value: 'ankara',  label: 'Ankara' },
  { value: 'asoebi',  label: 'Aso-oke / Asoebi' },
  { value: 'agbada',  label: 'Agbada' },
  { value: 'custom',  label: 'Custom' },
]

const priorities: { value: OrderPriority; label: string; icon: string}[] = [
  { value: 'low',    label: 'Low',    icon: '🔵' },
  { value: 'normal', label: 'Normal', icon: '⚪' },
  { value: 'high',   label: 'High',   icon: '🟡' },
  { value: 'urgent', label: 'Urgent', icon: '🔴' },
]

// Watch category change while in 'new' mode
watch(
  () => form.inlineMeasurement.category,
  () => { if (measurementMode.value === 'new') seedMeasurementFields() }
)

onMounted(() => {
  loadCustomers()
  loadMaterials()
})
</script>
