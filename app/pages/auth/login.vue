<!-- app/pages/auth/login.vue -->
<template>
  <div>
    <h2 class="font-display text-2xl text-ink mb-1">Welcome back</h2>
    <p class="text-sm text-ink-muted mb-6">Sign in to your shop account</p>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email -->
      <div>
        <label class="form-label">Email</label>
        <input
          v-model="form.email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          class="form-input"
          :class="{ 'form-input-error': errors.email }"
        >
        <p v-if="errors.email" class="form-error">{{ errors.email }}</p>
      </div>

      <!-- Password -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="form-label mb-0">Password</label>
          <NuxtLink to="/auth/reset-password" class="text-xs text-gold">Forgot password?</NuxtLink>
        </div>
        <div class="relative">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="••••••••"
            class="form-input pr-10"
            :class="{ 'form-input-error': errors.password }"
          >
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
            @click="showPassword = !showPassword"
          >
            <Eye v-if="!showPassword" :size="16" stroke-width="1.8" />
            <EyeOff v-else           :size="16" stroke-width="1.8" />
          </button>
        </div>
        <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
      </div>

      <!-- Error message -->
      <div v-if="authError" class="alert alert-danger text-xs">
        <AlertCircle :size="14" stroke-width="2" class="stroke-danger flex-shrink-0" />
        {{ authError }}
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isLoading"
        class="btn btn-primary btn-lg btn-full mt-2"
      >
        <Loader2 v-if="isLoading" :size="16" class="animate-spin" />
        <span>{{ isLoading ? 'Signing in…' : 'Sign in' }}</span>
      </button>
    </form>

    <!-- Divider -->
    <div class="flex items-center gap-3 my-5">
      <div class="flex-1 h-px bg-cream-dark" />
      <span class="text-xs text-ink-muted">or</span>
      <div class="flex-1 h-px bg-cream-dark" />
    </div>

    <!-- Register link -->
    <p class="text-center text-sm text-ink-muted">
      New to eTailor?
      <NuxtLink to="/auth/register" class="text-gold font-medium">Create your shop</NuxtLink>
    </p>

    <!-- Offline note -->
    <!-- <div class="mt-5 flex items-center gap-2 bg-cream rounded-xl p-3">
      <WifiOff :size="14" stroke-width="1.8" class="stroke-ink-muted flex-shrink-0" />
      <p class="text-xs text-ink-muted">
        Once signed in, eTailor works fully offline. Your data is always available.
      </p>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Eye, EyeOff, AlertCircle, Loader2, WifiOff } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

useHead({ title: 'Sign In — eTailor' })

const supabase    = useSupabaseClient()
const router      = useRouter()
const auth = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const authError   = ref('')
const isLoading   = ref(false)
const showPassword = ref(false)

function validate(): boolean {
  errors.email    = ''
  errors.password = ''
  let ok = true
  if (!form.email)    { errors.email    = 'Email is required';    ok = false }
  if (!form.password) { errors.password = 'Password is required'; ok = false }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  isLoading.value = true
  authError.value = ''

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email:    form.email,
      password: form.password,
    })

    if (error) throw error
    await auth.init()
    await router.push('/')
  } catch (err: unknown) {
    authError.value = err instanceof Error ? err.message : 'Sign in failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
