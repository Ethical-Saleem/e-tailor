<!-- app/pages/customers/new.vue -->
<template>
  <div class="animate-fade-in min-h-screen">
    <header class="page-header">
      <div class="flex items-center gap-3">
        <button class="header-action-btn" @click="$router.back()">
          <ArrowLeft :size="18" stroke-width="2" class="stroke-white/70" />
        </button>
        <h1 class="page-title">New Client</h1>
      </div>
    </header>

    <div class="px-4 pt-5 pb-24">
      <form class="space-y-4" @submit.prevent="handleSubmit">

        <!-- Name -->
        <div>
          <label class="form-label">Full name <span class="text-danger">*</span></label>
          <input v-model="form.name" placeholder="e.g. Chidinma Okafor" class="form-input" :class="{ 'form-input-error': errors.name }" />
          <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
        </div>

        <!-- Phone -->
        <div>
          <label class="form-label">Phone number</label>
          <input v-model="form.phone" type="tel" placeholder="+234 800 000 0000" class="form-input" />
        </div>

        <!-- Email -->
        <div>
          <label class="form-label">Email address</label>
          <input v-model="form.email" type="email" placeholder="name@email.com" class="form-input" :class="{ 'form-input-error': errors.email }" />
          <p v-if="errors.email" class="form-error">{{ errors.email }}</p>
        </div>

        <!-- Address -->
        <div>
          <label class="form-label">Address</label>
          <input v-model="form.address" placeholder="Street, city, state" class="form-input" />
        </div>

        <!-- Tags -->
        <div>
          <label class="form-label">Tags</label>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="tag in availableTags"
              :key="tag.value"
              type="button"
              :class="[
                'chip text-sm',
                form.tags.includes(tag.value) ? 'chip-active' : 'chip-inactive',
              ]"
              @click="toggleTag(tag.value)"
            >
              {{ tag.icon }} {{ tag.label }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="form-label">Notes</label>
          <textarea
            v-model="form.notes"
            rows="3"
            placeholder="Any special preferences, notes, or reminders about this client…"
            class="form-input resize-none"
          />
        </div>

        <!-- Error -->
        <div v-if="submitError" class="alert alert-danger text-xs">
          <AlertCircle :size="14" class="stroke-danger flex-shrink-0" />
          {{ submitError }}
        </div>

        <!-- Buttons -->
        <div class="fixed bottom-4 left-4 right-4">
          <div class="grid grid-cols-2 gap-3 pt-2">
            <button type="button" class="btn btn-outline btn-lg" @click="$router.back()">Cancel</button>
            <button type="submit" class="btn btn-gold btn-lg" :disabled="isLoading">
              <Loader2 v-if="isLoading" :size="16" class="animate-spin" />
              <span>{{ isLoading ? 'Saving…' : 'Add Client' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-vue-next'
import { useCustomers } from '~/composables/useCustomers'

definePageMeta({ layout: 'plain' })
useHead({ title: 'New Client — eTailor' })

const router = useRouter()
const { create } = useCustomers()

const form = reactive({
  name: '', phone: '', email: '', address: '', notes: '', tags: [] as string[],
})
const errors = reactive({ name: '', email: '' })
const submitError = ref('')
const isLoading   = ref(false)

const availableTags = [
  { value: 'vip',       label: 'VIP',       icon: '⭐' },
  { value: 'wedding',   label: 'Wedding',   icon: '💍' },
  { value: 'corporate', label: 'Corporate', icon: '💼' },
  { value: 'regular',   label: 'Regular',   icon: '👤' },
  { value: 'new',       label: 'New',       icon: '🆕' },
]

function toggleTag(tag: string) {
  const idx = form.tags.indexOf(tag)
  if (idx === -1) form.tags.push(tag)
  else form.tags.splice(idx, 1)
}

function validate(): boolean {
  errors.name = ''
  errors.email = ''
  let ok = true
  if (!form.name.trim()) { errors.name = 'Name is required'; ok = false }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Invalid email'; ok = false
  }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  isLoading.value = true
  submitError.value = ''
  try {
    const customer = await create({
      name:    form.name.trim(),
      phone:   form.phone || undefined,
      email:   form.email || undefined,
      address: form.address || undefined,
      notes:   form.notes || undefined,
      tags:    form.tags,
    })
    await router.replace(`/customers/${customer.id}`)
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Failed to add client'
  } finally {
    isLoading.value = false
  }
}
</script>
