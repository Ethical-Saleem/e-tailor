<!-- app/pages/store/new.vue -->
<template>
  <div class="animate-fade-in min-h-screen bg-cream">

    <!-- ── Header ── -->
    <header class="page-header">
      <div class="flex items-center gap-3">
        <button class="header-action-btn" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <div>
          <h1 class="page-title">New store item</h1>
          <p class="page-subtitle">
            Step {{ step + 1 }} of {{ steps.length }} — {{ steps[step].label }}
          </p>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="flex gap-1.5 mt-4">
        <div
          v-for="(s, i) in steps"
          :key="i"
          :class="['flex-1 h-1 rounded-full transition-all duration-300',
            i <= step ? 'bg-gold' : 'bg-white/20']"
        />
      </div>
    </header>

    <div class="px-4 pt-5 pb-28">
      <Transition name="slide-up" mode="out-in">

        <!-- ══════════════════════════════════════════════════════════
          STEP 0 — Item details
        ══════════════════════════════════════════════════════════ -->
        <div v-if="step === 0" key="details">
          <h2 class="section-title mb-1">Item details</h2>
          <p class="text-sm text-ink-muted mb-5">Describe the clothing item you're creating</p>

          <div class="space-y-4">
            <!-- Title -->
            <div>
              <label class="form-label">Item title <span class="text-danger">*</span></label>
              <input
                v-model="form.title"
                placeholder="e.g. Ankara midi dress, Agbada set, Lace blouse"
                class="form-input"
                maxlength="200"
              />
            </div>

            <!-- Category + size label -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Category <span class="text-danger">*</span></label>
                <select v-model="form.category" class="form-input">
                  <option v-for="c in garmentCategories" :key="c.value" :value="c.value">
                    {{ c.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="form-label">Size / label</label>
                <input
                  v-model="form.sizeLabel"
                  placeholder="M, UK 12, 42…"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="form-label">Description</label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Fabric type, style details, colour, occasion…"
                class="form-input resize-none"
                maxlength="1000"
              />
            </div>

            <!-- Design images (placeholder — file upload handled by existing upload util) -->
            <div>
              <label class="form-label">Design images (optional)</label>
              <div class="flex gap-2 flex-wrap">
                <div
                  v-for="(img, idx) in form.designImages"
                  :key="idx"
                  class="relative w-20 h-20 rounded-xl overflow-hidden"
                >
                  <img :src="img" class="w-full h-full object-cover" />
                  <button
                    class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60
                           flex items-center justify-center"
                    @click="form.designImages.splice(idx, 1)"
                  >
                    <X :size="10" stroke-width="3" class="stroke-white" />
                  </button>
                </div>
                <button
                  class="w-20 h-20 rounded-xl border-2 border-dashed border-cream-dark
                         flex flex-col items-center justify-center gap-1 text-ink-muted
                         hover:border-gold/40 transition-colors"
                  @click="triggerImageUpload"
                >
                  <Camera :size="18" stroke-width="1.5" />
                  <span class="text-2xs">Add photo</span>
                </button>
                <input
                  ref="imageInputRef"
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleImageUpload"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
          STEP 1 — Materials & costs
        ══════════════════════════════════════════════════════════ -->
        <div v-else-if="step === 1" key="materials">
          <h2 class="section-title mb-1">Materials & costs</h2>
          <p class="text-sm text-ink-muted mb-5">
            Select materials from inventory and add any additional costs
          </p>

          <!-- Material lines -->
          <div class="space-y-3 mb-4">
            <div
              v-for="(entry, idx) in form.materialUsage"
              :key="idx"
              class="card p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-semibold text-ink">Material {{ idx + 1 }}</p>
                <button
                  class="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center"
                  @click="removeMaterial(idx)"
                >
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>

              <!-- Source: inventory vs external (no customer_supplied for store items) -->
              <div class="flex rounded-lg overflow-hidden border border-cream-dark mb-3">
                <button
                  :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                    entry.source === 'inventory' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="entry.source = 'inventory'"
                >
                  From stock
                </button>
                <button
                  :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                    entry.source === 'external' ? 'bg-ink text-white' : 'text-ink-muted']"
                  @click="entry.source = 'external'; entry.materialId = undefined"
                >
                  External (no stock)
                </button>
              </div>

              <!-- Inventory picker -->
              <div v-if="entry.source === 'inventory'" class="mb-3">
                <label class="form-label">Select material</label>
                <select
                  v-model="entry.materialId"
                  class="form-input"
                  @change="onMaterialSelected(idx)"
                >
                  <option value="">Choose from inventory…</option>
                  <option
                    v-for="m in availableMaterials"
                    :key="m.id"
                    :value="m.id"
                  >
                    {{ m.name }} ({{ m.currentStock }} {{ m.unit }} in stock)
                  </option>
                </select>
              </div>

              <!-- External: name only -->
              <div v-else class="mb-3">
                <label class="form-label">Material name</label>
                <input
                  v-model="entry.materialName"
                  placeholder="e.g. Imported lace (purchased separately)"
                  class="form-input"
                />
              </div>

              <!-- Qty + unit -->
              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="form-label">Quantity</label>
                  <input
                    v-model.number="entry.quantity"
                    type="number" min="0.01" step="0.25"
                    class="form-input"
                    @input="recalcCost"
                  />
                </div>
                <div>
                  <label class="form-label">Unit</label>
                  <input v-model="entry.unit" class="form-input" placeholder="yard" />
                </div>
              </div>

              <!-- Cost at time (editable) -->
              <div>
                <label class="form-label">
                  Unit cost ({{ auth.shop?.currencySymbol }}/{{ entry.unit || 'unit' }})
                </label>
                <input
                  v-model.number="entry.costAtTime"
                  type="number" min="0"
                  class="form-input font-mono-dm"
                  @input="recalcCost"
                />
                <p v-if="entry.source === 'inventory' && entry.quantity > 0 && entry.costAtTime > 0"
                   class="form-hint">
                  Line cost: {{ fmt(entry.quantity * entry.costAtTime) }}
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
            Labour, buttons, embroidery, packaging, etc.
          </p>
          <div class="space-y-2 mb-3">
            <div
              v-for="(cost, idx) in form.additionalCosts"
              :key="idx"
              class="flex items-center gap-2"
            >
              <input
                v-model="cost.label"
                placeholder="Description"
                class="form-input flex-1"
              />
              <input
                v-model.number="cost.amount"
                type="number" min="0"
                class="form-input w-28 font-mono-dm"
                @input="recalcCost"
              />
              <button
                class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center flex-shrink-0"
                @click="form.additionalCosts.splice(idx, 1); recalcCost()"
              >
                <X :size="14" stroke-width="2" class="stroke-danger" />
              </button>
            </div>
          </div>
          <button
            class="btn btn-outline btn-sm mb-6"
            @click="form.additionalCosts.push({ id: generateId(), label: '', amount: 0 }); recalcCost()"
          >
            <Plus :size="14" /> Add cost line
          </button>

          <!-- Cost summary + selling price -->
          <div class="card p-4 space-y-3">
            <h3 class="text-sm font-semibold text-ink">Pricing</h3>

            <div class="space-y-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-ink-muted">Material cost</span>
                <span class="font-mono-dm">{{ fmt(pricing.materialCost) }}</span>
              </div>
              <div v-if="pricing.extrasTotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(pricing.extrasTotal) }}</span>
              </div>
              <div class="flex justify-between border-t border-cream-dark pt-1.5 font-semibold">
                <span>Cost price</span>
                <span class="font-mono-dm">{{ fmt(pricing.costPrice) }}</span>
              </div>
            </div>

            <!-- Selling price -->
            <div>
              <label class="form-label">Selling price ({{ auth.shop?.currencySymbol }})</label>
              <input
                v-model.number="form.sellingPrice"
                type="number" min="0"
                class="form-input font-mono-dm text-lg"
                placeholder="0"
                @input="recalcCost"
              />
              <!-- Margin hint -->
              <div v-if="form.sellingPrice > 0 && pricing.costPrice > 0" class="mt-2">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="text-ink-muted">Profit margin</span>
                  <span
                    :class="['font-semibold font-mono-dm',
                      pricing.marginPercent >= 30 ? 'text-success' :
                      pricing.marginPercent >= 15 ? 'text-warning' : 'text-danger']"
                  >
                    {{ pricing.marginPercent.toFixed(1) }}%
                  </span>
                </div>
                <!-- Margin bar -->
                <div class="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                  <div
                    :class="['h-full rounded-full transition-all duration-300',
                      pricing.marginPercent >= 30 ? 'bg-success' :
                      pricing.marginPercent >= 15 ? 'bg-warning' : 'bg-danger']"
                    :style="{ width: `${Math.min(100, pricing.marginPercent)}%` }"
                  />
                </div>
                <p class="text-2xs text-ink-muted mt-1">
                  Profit: {{ fmt(form.sellingPrice - pricing.costPrice) }} per item
                </p>
              </div>
              <div v-else-if="form.sellingPrice > 0 && pricing.costPrice === 0"
                   class="alert alert-info text-xs mt-2">
                <Info :size="13" stroke-width="2" class="stroke-info flex-shrink-0" />
                Add materials to see margin calculation
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
          STEP 2 — Measurements (optional)
        ══════════════════════════════════════════════════════════ -->
        <div v-else-if="step === 2" key="measurements">
          <h2 class="section-title mb-1">Measurements</h2>
          <p class="text-sm text-ink-muted mb-5">
            Optional — attach size/measurement info to this item
          </p>

          <!-- Mode picker -->
          <div class="mb-4">
            <label class="form-label">Measurements</label>
            <div class="flex rounded-xl overflow-hidden border border-cream-dark">
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  measurementMode === 'none' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('none')"
              >
                Skip
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold border-x border-cream-dark transition-colors',
                  measurementMode === 'template' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('template')"
              >
                Use template
              </button>
              <button
                :class="['flex-1 py-2.5 text-xs font-semibold transition-colors',
                  measurementMode === 'new' ? 'bg-ink text-white' : 'text-ink-muted']"
                @click="setMeasurementMode('new')"
              >
                Record
              </button>
            </div>
          </div>

          <!-- Use template -->
          <div v-if="measurementMode === 'template'" class="mb-4">
            <div v-if="isLoadingTemplates" class="space-y-2">
              <div v-for="i in 3" :key="i" class="h-14 skeleton rounded-xl" />
            </div>
            <div v-else-if="templates.length === 0" class="alert alert-info text-xs">
              <Info :size="14" stroke-width="2" class="stroke-info flex-shrink-0" />
              No measurement templates saved yet. Switch to "Record" to create one.
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="t in templates"
                :key="t.id"
                :class="['w-full flex items-center gap-3 card p-3.5 text-left transition-all',
                  form.measurementProfileId === t.id ? 'border-gold ring-2 ring-gold/20' : '']"
                @click="form.measurementProfileId = form.measurementProfileId === t.id ? undefined : t.id"
              >
                <Ruler :size="16" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ t.label }}</p>
                  <p class="text-xs text-ink-muted capitalize">{{ t.category }}</p>
                </div>
                <CheckCircle2
                  v-if="form.measurementProfileId === t.id"
                  :size="16" stroke-width="2" class="stroke-gold"
                />
              </button>
            </div>
          </div>

          <!-- Record new -->
          <div v-if="measurementMode === 'new'" class="space-y-4 mb-4">
            <div>
              <label class="form-label">Label</label>
              <input
                v-model="form.inlineMeasurement.label"
                placeholder="e.g. Size M standard fit"
                class="form-input"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="form-label">Category</label>
                <select
                  v-model="form.inlineMeasurement.category"
                  class="form-input"
                  @change="seedMeasurementFields"
                >
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
                      form.inlineMeasurement.unit === 'inches' ? 'bg-ink text-white' : 'text-ink-muted']"
                    @click="form.inlineMeasurement.unit = 'inches'"
                  >in</button>
                  <button
                    :class="['flex-1 py-2 text-xs font-semibold transition-colors',
                      form.inlineMeasurement.unit === 'cm' ? 'bg-ink text-white' : 'text-ink-muted']"
                    @click="form.inlineMeasurement.unit = 'cm'"
                  >cm</button>
                </div>
              </div>
            </div>

            <!-- Dynamic field grid -->
            <div v-if="activeMeasurementFields.length > 0">
              <label class="form-label mb-2">
                Measurements ({{ form.inlineMeasurement.unit }})
              </label>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="field in activeMeasurementFields" :key="field">
                  <label class="form-label text-2xs uppercase tracking-wider">
                    {{ field.replace(/_/g, ' ') }}
                  </label>
                  <input
                    v-model.number="form.inlineMeasurement.measurements[field]"
                    type="number" min="0" step="0.25" placeholder="0"
                    class="form-input font-mono-dm"
                  />
                </div>
              </div>
            </div>

            <!-- Custom category free-form -->
            <div v-if="form.inlineMeasurement.category === 'custom'" class="space-y-2">
              <div
                v-for="(_, key) in form.inlineMeasurement.measurements"
                :key="key"
                class="flex items-center gap-2"
              >
                <input
                  :value="key"
                  placeholder="Field name"
                  class="form-input flex-1 text-sm"
                  @change="renameMeasurementField(String(key), ($event.target as HTMLInputElement).value)"
                />
                <input
                  v-model.number="form.inlineMeasurement.measurements[String(key)]"
                  type="number" min="0" step="0.25"
                  class="form-input w-28 font-mono-dm text-sm"
                />
                <button
                  class="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center"
                  @click="removeCustomField(String(key))"
                >
                  <X :size="14" stroke-width="2" class="stroke-danger" />
                </button>
              </div>
              <button class="btn btn-outline btn-sm" @click="addCustomField">
                <Plus :size="14" /> Add field
              </button>
            </div>

            <div>
              <label class="form-label">Notes (optional)</label>
              <textarea
                v-model="form.inlineMeasurement.notes"
                rows="2"
                placeholder="e.g. Standard Nigerian size M, allow 1cm ease"
                class="form-input resize-none text-sm"
              />
            </div>

            <!-- Save as template toggle -->
            <div class="card p-3.5 flex items-start gap-3">
              <input
                type="checkbox"
                id="save-template"
                v-model="form.inlineMeasurement.saveToProfile"
                class="rounded mt-0.5"
              />
              <label for="save-template" class="cursor-pointer">
                <p class="text-sm font-semibold text-ink">Save as reusable template</p>
                <p class="text-xs text-ink-muted mt-0.5">
                  Reuse these measurements on future store items
                </p>
              </label>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
          STEP 3 — Review & create
        ══════════════════════════════════════════════════════════ -->
        <div v-else-if="step === 3" key="review">
          <h2 class="section-title mb-4">Review item</h2>

          <!-- Item details -->
          <div class="card p-4 mb-3">
            <p class="review-label">Item</p>
            <div class="mt-2 flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20
                          flex items-center justify-center flex-shrink-0">
                <Shirt :size="22" stroke-width="1.5" class="stroke-gold" />
              </div>
              <div>
                <p class="text-base font-semibold text-ink">{{ form.title }}</p>
                <p class="text-xs text-ink-muted capitalize mt-0.5">
                  {{ form.category }}
                  <template v-if="form.sizeLabel"> · {{ form.sizeLabel }}</template>
                </p>
                <p v-if="form.description" class="text-xs text-ink-muted mt-0.5 line-clamp-2">
                  {{ form.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Materials -->
          <div v-if="form.materialUsage.length > 0" class="card p-4 mb-3">
            <p class="review-label">Materials</p>
            <div class="mt-2 space-y-2">
              <div
                v-for="m in form.materialUsage"
                :key="m.materialId ?? m.materialName"
                class="flex items-start justify-between"
              >
                <div class="flex-1 min-w-0 pr-3">
                  <p class="text-sm font-medium text-ink">{{ m.materialName || '—' }}</p>
                  <p class="text-xs text-ink-muted">
                    {{ m.quantity }} {{ m.unit }} ·
                    {{ m.source === 'inventory' ? 'From stock' : 'External' }}
                  </p>
                </div>
                <span class="font-mono-dm text-sm text-ink flex-shrink-0">
                  {{ fmt(m.quantity * m.costAtTime) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Additional costs -->
          <div
            v-if="form.additionalCosts.filter(c => c.label && c.amount > 0).length > 0"
            class="card p-4 mb-3"
          >
            <p class="review-label">Additional costs</p>
            <div class="mt-2 space-y-1.5">
              <div
                v-for="c in form.additionalCosts.filter(c => c.label)"
                :key="c.id"
                class="flex justify-between text-sm"
              >
                <span class="text-ink">{{ c.label }}</span>
                <span class="font-mono-dm">{{ fmt(c.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Measurements -->
          <div class="card p-4 mb-3">
            <p class="review-label">Measurements</p>
            <div class="mt-2">
              <div v-if="measurementMode === 'template' && form.measurementProfileId">
                <div class="flex items-center gap-2">
                  <Ruler :size="14" stroke-width="1.8" class="stroke-gold" />
                  <p class="text-sm text-ink">
                    {{ templates.find(t => t.id === form.measurementProfileId)?.label }}
                  </p>
                </div>
              </div>
              <div v-else-if="measurementMode === 'new' && hasInlineMeasurements">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-sm font-medium text-ink">
                    {{ form.inlineMeasurement.label || 'New measurement' }}
                  </p>
                  <span
                    :class="['text-xs font-semibold px-2 py-0.5 rounded-full',
                      form.inlineMeasurement.saveToProfile
                        ? 'bg-success/10 text-success' : 'bg-ink/5 text-ink-muted']"
                  >
                    {{ form.inlineMeasurement.saveToProfile ? 'Saved as template' : 'Item only' }}
                  </span>
                </div>
                <div class="grid grid-cols-3 gap-x-3 gap-y-1">
                  <div
                    v-for="(val, key) in filledMeasurements"
                    :key="key"
                    class="flex justify-between text-xs"
                  >
                    <span class="text-ink-muted capitalize">{{ String(key).replace(/_/g, ' ') }}</span>
                    <span class="font-mono-dm">{{ val }}"</span>
                  </div>
                </div>
              </div>
              <p v-else class="text-sm text-ink-muted">Skipped</p>
            </div>
          </div>

          <!-- Pricing summary -->
          <div class="card p-4 mb-5">
            <p class="review-label">Pricing</p>
            <div class="mt-2 space-y-1.5 text-sm">
              <div v-if="pricing.materialCost > 0" class="flex justify-between">
                <span class="text-ink-muted">Material cost</span>
                <span class="font-mono-dm">{{ fmt(pricing.materialCost) }}</span>
              </div>
              <div v-if="pricing.extrasTotal > 0" class="flex justify-between">
                <span class="text-ink-muted">Additional costs</span>
                <span class="font-mono-dm">{{ fmt(pricing.extrasTotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-ink-muted font-medium">Cost price</span>
                <span class="font-mono-dm font-medium">{{ fmt(pricing.costPrice) }}</span>
              </div>
              <div class="flex justify-between border-t border-cream-dark pt-1.5 font-semibold text-base">
                <span>Selling price</span>
                <span class="font-mono-dm text-gold">{{ fmt(form.sellingPrice) }}</span>
              </div>
              <div v-if="pricing.marginPercent > 0" class="flex justify-between">
                <span class="text-ink-muted">Margin</span>
                <span
                  :class="['font-mono-dm font-semibold',
                    pricing.marginPercent >= 30 ? 'text-success' :
                    pricing.marginPercent >= 15 ? 'text-warning' : 'text-danger']"
                >
                  {{ pricing.marginPercent.toFixed(1) }}%
                  ({{ fmt(form.sellingPrice - pricing.costPrice) }} profit)
                </span>
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
            @click="handleCreate"
          >
            <Loader2 v-if="isCreating" :size="16" class="animate-spin" />
            <span>{{ isCreating ? 'Creating…' : 'Create store item' }}</span>
          </button>
        </div>

      </Transition>
    </div>

    <!-- ── Bottom nav ── -->
    <div class="fixed bottom-4 left-0 right-0 bg-surface border-t border-cream-dark
                px-4 py-3 pb-safe flex gap-3">
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  ArrowLeft, Plus, X, Camera, Ruler, CheckCircle2,
  Info, AlertCircle, Loader2, Shirt,
} from 'lucide-vue-next'
import { useStoreItems } from '~/composables/useStoreItems'
import { useMaterials } from '~/composables/useMaterials'
import { useMeasurements } from '~/composables/useMeasurements'
import { useAuthStore } from '~/stores/auth'
import { generateId } from '~/db/schema'
import { MEASUREMENT_FIELDS } from '~/types/models'
import type {
  GarmentCategory, MeasurementMap,
  MaterialUsageEntry, AdditionalCost,
} from '~/types/models'

definePageMeta({ layout: 'plain' })
useHead({ title: 'New Store Item — eTailor' })

const router = useRouter()
const auth   = useAuthStore()
const { create: createItem } = useStoreItems()
const { materials: allMaterials, loadAll: loadMaterials } = useMaterials()
const {
  templates, isLoading: isLoadingTemplates,
  loadTemplates, create: createMeasurementProfile,
} = useMeasurements()

// ── Steps ─────────────────────────────────────────────────────────────────────
const step = ref(0)
const steps = [
  { label: 'Item details' },
  { label: 'Materials & costs' },
  { label: 'Measurements' },
  { label: 'Review & create' },
]

// ── Form state ────────────────────────────────────────────────────────────────
const form = reactive({
  title:         '',
  description:   '',
  category:      'dress' as GarmentCategory,
  sizeLabel:     '',
  designImages:  [] as string[],
  sellingPrice:  0,
  materialUsage: [] as Array<{
    materialId?:  string
    materialName: string
    quantity:     number
    unit:         string
    source:       'inventory' | 'external'
    costAtTime:   number
  }>,
  additionalCosts:   [] as AdditionalCost[],
  measurementProfileId: undefined as string | undefined,
  inlineMeasurement: {
    label:         '',
    category:      'dress' as GarmentCategory,
    measurements:  {} as MeasurementMap,
    unit:          'inches' as 'inches' | 'cm',
    notes:         '',
    saveToProfile: false,
  },
})

// ── Measurement mode ──────────────────────────────────────────────────────────
type MMode = 'none' | 'template' | 'new'
const measurementMode = ref<MMode>('none')

function setMeasurementMode(mode: MMode) {
  measurementMode.value = mode
  if (mode !== 'template') form.measurementProfileId = undefined
  if (mode !== 'new') {
    form.inlineMeasurement.measurements = {}
    form.inlineMeasurement.label = ''
  }
  if (mode === 'new') seedMeasurementFields()
}

function seedMeasurementFields() {
  const fields = MEASUREMENT_FIELDS[form.inlineMeasurement.category] ?? []
  const existing = form.inlineMeasurement.measurements
  const seeded: MeasurementMap = {}
  for (const f of fields) seeded[f] = existing[f] ?? 0
  form.inlineMeasurement.measurements = seeded
}

watch(() => form.inlineMeasurement.category, () => {
  if (measurementMode.value === 'new') seedMeasurementFields()
})

const activeMeasurementFields = computed<string[]>(() => {
  if (form.inlineMeasurement.category === 'custom') return []
  return MEASUREMENT_FIELDS[form.inlineMeasurement.category] ?? []
})

function addCustomField() {
  const key = `field_${Object.keys(form.inlineMeasurement.measurements).length + 1}`
  form.inlineMeasurement.measurements = { ...form.inlineMeasurement.measurements, [key]: 0 }
}

function removeCustomField(key: string) {
  const updated = { ...form.inlineMeasurement.measurements }
  delete updated[key]
  form.inlineMeasurement.measurements = updated
}

function renameMeasurementField(oldKey: string, newKey: string) {
  if (!newKey || newKey === oldKey) return
  const updated: MeasurementMap = {}
  for (const [k, v] of Object.entries(form.inlineMeasurement.measurements)) {
    updated[k === oldKey ? newKey : k] = v
  }
  form.inlineMeasurement.measurements = updated
}

const hasInlineMeasurements = computed(() =>
  Object.values(form.inlineMeasurement.measurements).some(v => v && v > 0)
)

const filledMeasurements = computed(() =>
  Object.fromEntries(
    Object.entries(form.inlineMeasurement.measurements).filter(([_, v]) => v && v > 0)
  )
)

// ── Materials ─────────────────────────────────────────────────────────────────
const availableMaterials = computed(() =>
  allMaterials.value.filter(m => !m.isDeleted)
)

function addMaterial() {
  form.materialUsage.push({
    materialId:   undefined,
    materialName: '',
    quantity:     1,
    unit:         'yard',
    source:       'inventory',
    costAtTime:   0,
  })
}

function removeMaterial(idx: number) {
  form.materialUsage.splice(idx, 1)
  recalcCost()
}

function onMaterialSelected(idx: number) {
  const entry = form.materialUsage[idx]
  const mat   = allMaterials.value.find(m => m.id === entry.materialId)
  if (!mat) return
  entry.materialName = mat.name
  entry.unit         = mat.unit
  entry.costAtTime   = mat.currentUnitCost
  recalcCost()
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const pricing = computed(() => {
  const materialCost = form.materialUsage
    .filter(m => m.source === 'inventory')
    .reduce((s, m) => s + m.quantity * m.costAtTime, 0)
  const extrasTotal = form.additionalCosts.reduce((s, c) => s + c.amount, 0)
  const costPrice   = materialCost + extrasTotal
  const marginPercent = form.sellingPrice > 0
    ? ((form.sellingPrice - costPrice) / form.sellingPrice) * 100
    : 0
  return { materialCost, extrasTotal, costPrice, marginPercent }
})

function recalcCost() {
  // Pricing is fully computed — this is a no-op trigger for watchers if needed
}

// ── Image upload ──────────────────────────────────────────────────────────────
const imageInputRef = ref<HTMLInputElement | null>(null)

function triggerImageUpload() {
  imageInputRef.value?.click()
}

function handleImageUpload(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const file of Array.from(files)) {
    const url = URL.createObjectURL(file)
    form.designImages.push(url)
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
const canProceed = computed(() => {
  if (step.value === 0) return form.title.trim().length > 0
  if (step.value === 1) return form.sellingPrice >= 0
  if (step.value === 2) {
    if (measurementMode.value === 'new') return form.inlineMeasurement.label.trim().length > 0
    return true
  }
  return true
})

// ── Navigation ────────────────────────────────────────────────────────────────
async function nextStep() {
  if (step.value === 0) {
    // Sync category to inline measurement form
    form.inlineMeasurement.category = form.category
    if (measurementMode.value === 'new') seedMeasurementFields()
  }
  if (step.value === 1 && measurementMode.value === 'template') {
    await loadTemplates()
  }
  step.value++
}

// ── Create ────────────────────────────────────────────────────────────────────
const isCreating = ref(false)
const createError = ref('')

async function handleCreate() {
  isCreating.value = true
  createError.value = ''
  try {
    // Save inline measurement as template if requested
    let measurementProfileId = form.measurementProfileId
    if (measurementMode.value === 'new' && form.inlineMeasurement.saveToProfile) {
      const profile = await createMeasurementProfile({
        label:        form.inlineMeasurement.label,
        category:     form.inlineMeasurement.category,
        measurements: form.inlineMeasurement.measurements,
        unit:         form.inlineMeasurement.unit,
        notes:        form.inlineMeasurement.notes || undefined,
        isTemplate:   true,
      })
      measurementProfileId = profile.id
    }

    const item = await createItem({
      title:                form.title,
      description:          form.description || undefined,
      category:             form.category,
      sizeLabel:            form.sizeLabel || undefined,
      materialUsage:        form.materialUsage.map(m => ({
        materialId:       m.materialId!,
        materialName:     m.materialName,
        quantity:         m.quantity,
        unit:             m.unit,
        source:           m.source === 'external' ? 'inventory' : m.source,
        costAtTime:       m.costAtTime,
        unitPriceCharged: m.costAtTime,
        chargeToCustomer: false,
      })),
      additionalCosts:      form.additionalCosts,
      sellingPrice:         form.sellingPrice,
      measurementProfileId: measurementProfileId,
    })

    await router.replace(`/store/${item.id}`)
  } catch (err: unknown) {
    createError.value = err instanceof Error ? err.message : 'Failed to create item'
  } finally {
    isCreating.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `${auth.shop?.currencySymbol ?? ''}${n.toLocaleString()}`
}

const garmentCategories = [
  { value: 'dress',   label: 'Dress'   },
  { value: 'gown',    label: 'Gown'    },
  { value: 'suit',    label: 'Suit'    },
  { value: 'shirt',   label: 'Shirt'   },
  { value: 'trouser', label: 'Trouser' },
  { value: 'skirt',   label: 'Skirt'   },
  { value: 'blouse',  label: 'Blouse'  },
  { value: 'jacket',  label: 'Jacket'  },
  { value: 'abaya',   label: 'Abaya'   },
  { value: 'ankara',  label: 'Ankara'  },
  { value: 'asoebi',  label: 'Asoebi'  },
  { value: 'agbada',  label: 'Agbada'  },
  { value: 'custom',  label: 'Custom'  },
]

onMounted(async () => {
  await loadMaterials()
})
</script>

<style scoped>
@reference '~/assets/css/main.css';

.review-label {
  @apply text-xs font-semibold text-ink-muted uppercase tracking-wider;
}
</style>
