<!-- app/pages/auth/reset-password.vue -->
<!-- Step 1 of 2: User enters their email address.                          -->
<!-- Supabase sends a magic link → user lands on /auth/update-password.    -->
<template>
  <div>

    <!-- Back to login -->
    <NuxtLink
      to="/auth/login"
      class="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
    >
      <ArrowLeft :size="14" stroke-width="2" />
      Back to sign in
    </NuxtLink>

    <Transition name="slide-up" mode="out-in">

      <!-- ── FORM STATE ─────────────────────────────────────────────────── -->
      <div v-if="!sent" key="form">

        <div class="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center mb-5">
          <KeyRound :size="22" stroke-width="1.5" class="stroke-gold" />
        </div>

        <h2 class="font-display text-2xl text-ink mb-1">Forgot your password?</h2>
        <p class="text-sm text-ink-muted mb-6 leading-relaxed">
          No problem. Enter your registered email address and we'll send you
          a secure link to create a new password.
        </p>

        <form class="space-y-4" @submit.prevent="submit">

          <!-- Email field -->
          <div>
            <label class="form-label">Email address</label>
            <input
              ref="emailInput"
              v-model.trim="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              :disabled="isLoading"
              :class="['form-input', fieldError ? 'form-input-error' : '']"
            />
            <p v-if="fieldError" class="form-error">
              <AlertCircle :size="12" stroke-width="2" />
              {{ fieldError }}
            </p>
          </div>

          <!-- Offline warning -->
          <div v-if="!isOnline" class="alert alert-warning text-xs">
            <WifiOff :size="14" stroke-width="2" class="stroke-warning flex-shrink-0" />
            <p>You're offline. Connect to the internet to reset your password.</p>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-primary btn-lg btn-full"
            :disabled="isLoading || !email || !isOnline"
          >
            <Loader2 v-if="isLoading" :size="16" class="animate-spin" />
            <span>{{ isLoading ? 'Sending…' : 'Send reset link' }}</span>
          </button>

        </form>

        <!-- Register link -->
        <p class="text-center text-sm text-ink-muted mt-5">
          Don't have an account?
          <NuxtLink to="/auth/register" class="text-gold font-medium">Create your shop</NuxtLink>
        </p>

      </div>

      <!-- ── SENT STATE ─────────────────────────────────────────────────── -->
      <div v-else key="sent" class="text-center">

        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <MailCheck :size="30" stroke-width="1.5" class="stroke-success" />
        </div>

        <h2 class="font-display text-2xl text-ink mb-2">Check your inbox</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-1">
          We sent a password reset link to
        </p>
        <p class="text-sm font-semibold text-ink mb-5">{{ email }}</p>

        <!-- Tips box -->
        <div class="bg-cream rounded-xl p-4 text-left space-y-2 mb-6">
          <p class="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Didn't receive it?</p>
          <div class="flex items-start gap-2 text-xs text-ink-muted">
            <span class="text-base leading-none mt-px">📬</span>
            <span>Check your <strong class="text-ink">spam or junk</strong> folder — it sometimes ends up there.</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-ink-muted">
            <span class="text-base leading-none mt-px">⏱</span>
            <span>The link is valid for <strong class="text-ink">1 hour</strong> from when it was sent.</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-ink-muted">
            <span class="text-base leading-none mt-px">✉️</span>
            <span>Make sure <strong class="text-ink">{{ email }}</strong> is the address you registered with.</span>
          </div>
        </div>

        <!-- Resend button with cooldown -->
        <button
          class="text-sm font-medium transition-colors mb-4"
          :class="resendCooldown > 0 ? 'text-ink-muted cursor-not-allowed' : 'text-gold hover:text-gold-light'"
          :disabled="resendCooldown > 0"
          @click="resend"
        >
          <template v-if="resendCooldown > 0">
            Resend available in {{ resendCooldown }}s
          </template>
          <template v-else>
            Resend email
          </template>
        </button>

        <div class="divider" />

        <NuxtLink to="/auth/login" class="btn btn-outline btn-md btn-full">
          Back to sign in
        </NuxtLink>

      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ArrowLeft, KeyRound, AlertCircle, Loader2, WifiOff, MailCheck } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Reset Password — eTailor' })

const supabase = useSupabaseClient()

// ── State ─────────────────────────────────────────────────────────────────────
const email       = ref('')
const fieldError  = ref('')
const isLoading   = ref(false)
const sent        = ref(false)
const isOnline    = ref(true)
const resendCooldown = ref(0)
const emailInput  = ref<HTMLInputElement | null>(null)

let cooldownTimer: ReturnType<typeof setInterval> | null = null

// ── Network detection ─────────────────────────────────────────────────────────
onMounted(() => {
  isOnline.value = navigator.onLine
  window.addEventListener('online',  () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })
  // Auto-focus the email field
  nextTick(() => emailInput.value?.focus())
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

// ── Send reset email ──────────────────────────────────────────────────────────
async function sendEmail(addr: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(addr, {
    // Supabase will append the token to this URL as a query param.
    // @nuxtjs/supabase exchanges the token and then redirects to /auth/update-password.
    redirectTo: `${window.location.origin}/auth/confirm?next=/auth/update-password`,
  })
  if (error) throw error
}

// ── Submit handler ────────────────────────────────────────────────────────────
async function submit(): Promise<void> {
  fieldError.value = ''

  if (!email.value) {
    fieldError.value = 'Email address is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    fieldError.value = 'Please enter a valid email address'
    return
  }
  if (!isOnline.value) {
    fieldError.value = 'You are offline — please connect and try again'
    return
  }

  isLoading.value = true
  try {
    await sendEmail(email.value)
  } catch (err: unknown) {
    // Rate limit is the only real error worth surfacing.
    // For any other error we still show the success screen —
    // this prevents leaking whether an email address exists.
    const msg = err instanceof Error ? err.message.toLowerCase() : ''
    if (msg.includes('rate') || msg.includes('too many')) {
      fieldError.value = 'Too many requests. Please wait a few minutes before trying again.'
      isLoading.value = false
      return
    }
    // For all other errors: fall through to show "sent" (security best practice)
  } finally {
    isLoading.value = false
  }

  sent.value = true
  startCooldown()
}

// ── Resend handler ────────────────────────────────────────────────────────────
async function resend(): Promise<void> {
  if (resendCooldown.value > 0) return
  try {
    await sendEmail(email.value)
  } catch {
    // Silently ignore resend errors
  }
  startCooldown()
}

// ── Cooldown timer ────────────────────────────────────────────────────────────
function startCooldown(): void {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}
</script>
