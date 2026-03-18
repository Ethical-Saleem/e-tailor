<!-- app/pages/auth/update-password.vue -->
<!-- Step 2 of 2: User lands here after clicking the link in their email.  -->
<!-- @nuxtjs/supabase exchanges the token at /auth/confirm automatically,  -->
<!-- then redirects here with an active session. We just update the user.  -->
<template>
  <div>

    <!-- ── VERIFYING STATE: checking session on mount ─────────────────── -->
    <Transition name="fade" mode="out-in">
      <div v-if="state === 'verifying'" key="verifying" class="text-center py-8">
        <Loader2 :size="36" class="animate-spin stroke-gold mx-auto mb-4" />
        <p class="text-sm text-ink-muted">Verifying your reset link…</p>
      </div>

      <!-- ── INVALID / EXPIRED LINK ─────────────────────────────────────── -->
      <div v-else-if="state === 'invalid'" key="invalid" class="text-center">
        <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
          <Link :size="26" stroke-width="1.5" class="stroke-danger" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Link expired</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          This password reset link has expired or has already been used.
          Links are only valid for <strong class="text-ink">1 hour</strong>.
        </p>
        <NuxtLink to="/auth/reset-password" class="btn btn-primary btn-lg btn-full">
          Request a new link
        </NuxtLink>
        <NuxtLink to="/auth/login" class="btn btn-ghost btn-md btn-full mt-2 text-ink-muted">
          Back to sign in
        </NuxtLink>
      </div>

      <!-- ── SUCCESS STATE ──────────────────────────────────────────────── -->
      <div v-else-if="state === 'done'" key="done" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck :size="30" stroke-width="1.5" class="stroke-success" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Password updated!</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          Your password has been changed successfully. You can now sign in
          with your new password on all your devices.
        </p>
        <!-- Auto-redirecting -->
        <div class="flex items-center justify-center gap-2 text-xs text-ink-muted mb-5">
          <Loader2 :size="12" class="animate-spin" />
          Redirecting to your shop in {{ redirectCountdown }}s…
        </div>
        <NuxtLink to="/" class="btn btn-gold btn-lg btn-full">
          Go to my shop now →
        </NuxtLink>
      </div>

      <!-- ── FORM STATE ─────────────────────────────────────────────────── -->
      <div v-else key="form">

        <div class="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center mb-5">
          <LockKeyhole :size="22" stroke-width="1.5" class="stroke-gold" />
        </div>

        <h2 class="font-display text-2xl text-ink mb-1">Create new password</h2>
        <p class="text-sm text-ink-muted mb-6">
          Choose a strong password for your eTailor account.
        </p>

        <form class="space-y-5" @submit.prevent="submit">

          <!-- New password -->
          <div>
            <label class="form-label">New password</label>
            <div class="relative">
              <input
                ref="passwordInput"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Min. 8 characters"
                :disabled="isLoading"
                :class="['form-input pr-10', errors.password ? 'form-input-error' : '']"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                tabindex="-1"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="16" stroke-width="1.8" />
                <Eye    v-else              :size="16" stroke-width="1.8" />
              </button>
            </div>
            <p v-if="errors.password" class="form-error">
              <AlertCircle :size="12" stroke-width="2" />
              {{ errors.password }}
            </p>

            <!-- Strength bar -->
            <div v-if="form.password" class="mt-2.5">
              <div class="flex gap-1 mb-1.5">
                <div
                  v-for="i in 4"
                  :key="i"
                  :class="[
                    'flex-1 h-1.5 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.barColor : 'bg-cream-dark',
                  ]"
                />
              </div>
              <p :class="['text-xs font-medium', strength.textColor]">
                {{ strength.label }}
              </p>
            </div>
          </div>

          <!-- Confirm password -->
          <div>
            <label class="form-label">Confirm new password</label>
            <div class="relative">
              <input
                v-model="form.confirm"
                :type="showConfirm ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repeat your new password"
                :disabled="isLoading"
                :class="['form-input pr-10', errors.confirm ? 'form-input-error' : '']"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition-colors"
                tabindex="-1"
                @click="showConfirm = !showConfirm"
              >
                <EyeOff v-if="showConfirm" :size="16" stroke-width="1.8" />
                <Eye    v-else             :size="16" stroke-width="1.8" />
              </button>
            </div>
            <p v-if="errors.confirm" class="form-error">
              <AlertCircle :size="12" stroke-width="2" />
              {{ errors.confirm }}
            </p>
          </div>

          <!-- Password requirements checklist -->
          <div class="bg-cream rounded-xl p-3.5 space-y-2">
            <p class="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-2.5">Password requirements</p>
            <div
              v-for="req in requirements"
              :key="req.label"
              :class="['flex items-center gap-2.5 text-xs transition-colors', req.met ? 'text-success' : 'text-ink-muted']"
            >
              <CheckCircle2 v-if="req.met"  :size="14" stroke-width="2.5" class="stroke-success flex-shrink-0" />
              <Circle       v-else          :size="14" stroke-width="2"   class="stroke-ink-subtle flex-shrink-0" />
              <span>{{ req.label }}</span>
            </div>
          </div>

          <!-- Submit error -->
          <div v-if="submitError" class="alert alert-danger text-xs">
            <AlertCircle :size="14" stroke-width="2" class="stroke-danger flex-shrink-0" />
            <span>{{ submitError }}</span>
          </div>

          <!-- Submit button — disabled until password is at least "fair" (score ≥ 2) -->
          <button
            type="submit"
            class="btn btn-gold btn-lg btn-full"
            :disabled="isLoading || strength.score < 2 || !form.confirm"
          >
            <Loader2 v-if="isLoading" :size="16" class="animate-spin" />
            <span>{{ isLoading ? 'Updating password…' : 'Update password' }}</span>
          </button>

        </form>

      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import {
  Loader2, AlertCircle, LockKeyhole, Eye, EyeOff,
  CheckCircle2, Circle, ShieldCheck, Link,
} from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Update Password — eTailor' })

const supabase = useSupabaseClient()
const router   = useRouter()

// ── UI state machine ──────────────────────────────────────────────────────────
// 'verifying' → checking session on mount
// 'form'      → valid session, show the form
// 'invalid'   → no session / expired token
// 'done'      → password updated successfully
type PageState = 'verifying' | 'form' | 'invalid' | 'done'
const state = ref<PageState>('verifying')

// ── Form state ────────────────────────────────────────────────────────────────
const form = reactive({ password: '', confirm: '' })
const errors = reactive({ password: '', confirm: '' })
const submitError  = ref('')
const isLoading    = ref(false)
const showPassword = ref(false)
const showConfirm  = ref(false)
const passwordInput = ref<HTMLInputElement | null>(null)

// ── Redirect countdown (shown on success screen) ──────────────────────────────
const redirectCountdown = ref(5)
let redirectTimer: ReturnType<typeof setInterval> | null = null

// ── Password requirements ─────────────────────────────────────────────────────
const requirements = computed(() => [
  {
    label: 'At least 8 characters',
    met:   form.password.length >= 8,
  },
  {
    label: 'Contains a number (0–9)',
    met:   /\d/.test(form.password),
  },
  {
    label: 'Contains an uppercase letter (A–Z)',
    met:   /[A-Z]/.test(form.password),
  },
  {
    label: 'Contains a special character (!@#$…)',
    met:   /[^a-zA-Z0-9]/.test(form.password),
  },
])

// ── Password strength ─────────────────────────────────────────────────────────
const strength = computed(() => {
  const score = requirements.value.filter(r => r.met).length
  if (score <= 1) return { score, label: 'Weak — keep going',   barColor: 'bg-danger',  textColor: 'text-danger' }
  if (score === 2) return { score, label: 'Fair',               barColor: 'bg-warning', textColor: 'text-warning' }
  if (score === 3) return { score, label: 'Good',               barColor: 'bg-info',    textColor: 'text-info' }
  return              { score, label: 'Strong 💪',              barColor: 'bg-success', textColor: 'text-success' }
})

// ── On mount: verify the session Supabase set after the email link exchange ───
// @nuxtjs/supabase's /auth/confirm route already exchanged the token and set
// a session before redirecting here. We just confirm the session is present.
onMounted(async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) {
      state.value = 'invalid'
    } else {
      state.value = 'form'
      nextTick(() => passwordInput.value?.focus())
    }
  } catch {
    state.value = 'invalid'
  }
})

onUnmounted(() => {
  if (redirectTimer) clearInterval(redirectTimer)
})

// ── Validation ────────────────────────────────────────────────────────────────
function validate(): boolean {
  errors.password = ''
  errors.confirm  = ''

  if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
    return false
  }
  if (strength.value.score < 2) {
    errors.password = 'Password is too weak — add numbers or special characters'
    return false
  }
  if (!form.confirm) {
    errors.confirm = 'Please confirm your password'
    return false
  }
  if (form.password !== form.confirm) {
    errors.confirm = 'Passwords do not match'
    return false
  }
  return true
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit(): Promise<void> {
  if (!validate()) return

  isLoading.value   = true
  submitError.value = ''

  try {
    const { error } = await supabase.auth.updateUser({
      password: form.password,
    })

    if (error) throw error

    // Revoke all other active sessions (security best practice for password change)
    await supabase.auth.signOut({ scope: 'others' })

    // Show success screen and start redirect countdown
    state.value = 'done'
    startRedirectCountdown()

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''

    if (msg.toLowerCase().includes('same password')) {
      submitError.value = 'Your new password must be different from your current password.'
    } else if (msg.toLowerCase().includes('session')) {
      // Session expired between mount and submit — rare but possible
      state.value = 'invalid'
    } else {
      submitError.value = msg || 'Failed to update password. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

// ── Redirect countdown ────────────────────────────────────────────────────────
function startRedirectCountdown(): void {
  redirectTimer = setInterval(() => {
    redirectCountdown.value--
    if (redirectCountdown.value <= 0 && redirectTimer) {
      clearInterval(redirectTimer)
      redirectTimer = null
      router.push('/')
    }
  }, 1000)
}
</script>
