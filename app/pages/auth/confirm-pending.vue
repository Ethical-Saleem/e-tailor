<!-- app/pages/auth/confirm-pending.vue -->
<!--
  Shown immediately after registration when email confirmation is required.
  The user lands here while waiting to click the link in their inbox.
  Shop setup data is already persisted in localStorage by register.vue —
  confirm.vue will finish creating the shop once the link is clicked.
-->
<template>
  <div>
    <Transition name="fade" mode="out-in">
      <!-- ── DEFAULT: waiting state ──────────────────────────────────────── -->
      <div v-if="!resent" key="waiting" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-5">
          <Mail :size="30" stroke-width="1.5" class="stroke-gold" />
        </div>

        <h2 class="font-display text-2xl text-ink mb-2">Check your inbox</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-1">
          We sent a confirmation link to
        </p>
        <p class="text-sm font-medium text-ink mb-6 break-all">{{ email }}</p>

        <div class="bg-cream rounded-2xl p-4 text-left space-y-3 mb-6">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-gold">1</span>
            </div>
            <p class="text-sm text-ink-muted">Open the email from <span class="font-medium text-ink">eTailor</span></p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-gold">2</span>
            </div>
            <p class="text-sm text-ink-muted">Click <span class="font-medium text-ink">"Confirm your email"</span></p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-bold text-gold">3</span>
            </div>
            <p class="text-sm text-ink-muted">Your shop will be created automatically</p>
          </div>
        </div>

        <!-- Resend -->
        <div class="space-y-3">
          <button
            class="btn btn-outline btn-md btn-full"
            :disabled="resendCooldown > 0 || isResending"
            @click="resendEmail"
          >
            <Loader2 v-if="isResending" :size="16" class="animate-spin mr-2" />
            <span v-if="isResending">Sending…</span>
            <span v-else-if="resendCooldown > 0">Resend in {{ resendCooldown }}s</span>
            <span v-else>Resend confirmation email</span>
          </button>

          <p v-if="resendError" class="form-error text-center">{{ resendError }}</p>

          <NuxtLink to="/auth/login" class="btn btn-ghost btn-md btn-full text-ink-muted">
            Back to sign in
          </NuxtLink>
        </div>

        <!-- Spam nudge -->
        <p class="text-xs text-ink-muted mt-6 leading-relaxed">
          Can't find it? Check your <span class="font-medium">spam</span> or
          <span class="font-medium">junk</span> folder, or search for
          <span class="font-medium">"eTailor"</span>.
        </p>
      </div>

      <!-- ── RESENT: confirmation ─────────────────────────────────────────── -->
      <div v-else key="resent" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <MailCheck :size="30" stroke-width="1.5" class="stroke-success" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Email resent!</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          A fresh confirmation link has been sent to
          <span class="font-medium text-ink">{{ email }}</span>.
          It may take a minute or two to arrive.
        </p>
        <button class="btn btn-outline btn-md btn-full" @click="resent = false">
          ← Back
        </button>
      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Loader2, Mail, MailCheck } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Confirm your email — eTailor' })

const supabase = useSupabaseClient()
const route    = useRoute()

// Pull email from query param (register.vue passes it) or fall back to
// whatever was stored alongside the pending shop data in localStorage.
const pendingRaw = import.meta.client ? localStorage.getItem('pendingShop') : null
const pending    = pendingRaw ? JSON.parse(pendingRaw) : null

const email = ref<string>(
  (route.query.email as string | undefined)
  ?? pending?.email
  ?? '',
)

// ── Resend logic ──────────────────────────────────────────────────────────────
const isResending    = ref(false)
const resendError    = ref('')
const resent         = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

async function resendEmail(): Promise<void> {
  if (!email.value) {
    resendError.value = 'Email address not found. Please register again.'
    return
  }

  isResending.value  = true
  resendError.value  = ''

  try {
    const { error } = await supabase.auth.resend({
      type:  'signup',
      email: email.value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?type=signup`,
      },
    })
    if (error) throw error

    resent.value = true
    startCooldown()
  } catch (err: unknown) {
    resendError.value = err instanceof Error ? err.message : 'Failed to resend. Please try again.'
  } finally {
    isResending.value = false
  }
}

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

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>
