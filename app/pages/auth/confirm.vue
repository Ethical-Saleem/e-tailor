<!-- app/pages/auth/confirm.vue -->
<!--
  Universal auth callback page.
  Registered as `callback: '/auth/confirm'` in nuxt.config.ts.

  Supabase redirects here for every token-based auth flow:
    • Email verification after register         (type = signup)
    • Password reset link from email            (type = recovery)
    • Magic link / OTP login                    (type = magiclink)
    • OAuth provider callback (Google, etc.)    (type = not present — handled by session)
    • Email change confirmation                 (type = email_change)

  The URL arrives in one of two shapes:
    A) Hash fragment  → /auth/confirm#access_token=...&type=recovery
       (Supabase's implicit flow / older PKCE)
    B) Query param    → /auth/confirm?code=...
       (Supabase's PKCE / server-side flow — @nuxtjs/supabase handles exchange automatically)
    C) Custom `next`  → /auth/confirm?next=/auth/update-password
       (We add this ourselves in reset-password.vue's redirectTo)

  Strategy:
    1. On mount, check for a `code` param → let @nuxtjs/supabase exchange it via
       supabase.auth.exchangeCodeForSession(). The module may have already done this
       but we call it defensively.
    2. Check for hash fragment tokens and call setSession() if present.
    3. Determine the flow type and redirect appropriately.
    4. On any error, show a clear error screen with recovery options.
-->
<template>
  <div>
    <Transition name="fade" mode="out-in">

      <!-- ── PROCESSING ────────────────────────────────────────────────── -->
      <div v-if="state === 'processing'" key="processing" class="text-center py-8">
        <div class="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-5">
          <Loader2 :size="30" stroke-width="1.5" class="stroke-gold animate-spin" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">{{ processingLabel }}</h2>
        <p class="text-sm text-ink-muted">Please wait a moment…</p>
      </div>

      <!-- ── EMAIL VERIFIED (signup) ───────────────────────────────────── -->
      <div v-else-if="state === 'verified'" key="verified" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <MailCheck :size="30" stroke-width="1.5" class="stroke-success" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Email verified!</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          Your email address has been confirmed. You're all set to use eTailor.
        </p>
        <div class="flex items-center justify-center gap-2 text-xs text-ink-muted mb-5">
          <Loader2 :size="12" class="animate-spin" />
          Taking you to your shop in {{ countdown }}s…
        </div>
        <NuxtLink to="/" class="btn btn-gold btn-lg btn-full">
          Go to my shop now →
        </NuxtLink>
      </div>

      <!-- ── MAGIC LINK / OTP ──────────────────────────────────────────── -->
      <div v-else-if="state === 'magiclink'" key="magiclink" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <Zap :size="30" stroke-width="1.5" class="stroke-success" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Signed in!</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          Your magic link worked. Redirecting you now…
        </p>
        <div class="flex items-center justify-center gap-2 text-xs text-ink-muted mb-5">
          <Loader2 :size="12" class="animate-spin" />
          Taking you to your shop in {{ countdown }}s…
        </div>
        <NuxtLink to="/" class="btn btn-gold btn-lg btn-full">
          Go to my shop now →
        </NuxtLink>
      </div>

      <!-- ── EMAIL CHANGED ─────────────────────────────────────────────── -->
      <div v-else-if="state === 'email_changed'" key="email_changed" class="text-center">
        <div class="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 :size="30" stroke-width="1.5" class="stroke-success" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2">Email address updated</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6">
          Your new email address has been confirmed and is now active.
        </p>
        <div class="flex items-center justify-center gap-2 text-xs text-ink-muted mb-5">
          <Loader2 :size="12" class="animate-spin" />
          Taking you back in {{ countdown }}s…
        </div>
        <NuxtLink to="/settings" class="btn btn-gold btn-lg btn-full">
          Go to settings →
        </NuxtLink>
      </div>

      <!-- ── ERROR ─────────────────────────────────────────────────────── -->
      <div v-else-if="state === 'error'" key="error">
        <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-5">
          <component :is="errorIcon" :size="26" stroke-width="1.5" class="stroke-danger" />
        </div>
        <h2 class="font-display text-2xl text-ink mb-2 text-center">{{ errorTitle }}</h2>
        <p class="text-sm text-ink-muted leading-relaxed mb-6 text-center">
          {{ errorMessage }}
        </p>

        <!-- Contextual recovery action -->
        <div class="space-y-2">
          <NuxtLink
            v-if="errorType === 'expired_reset'"
            to="/auth/reset-password"
            class="btn btn-primary btn-lg btn-full"
          >
            Request a new reset link
          </NuxtLink>
          <NuxtLink
            v-else-if="errorType === 'expired_signup'"
            to="/auth/register"
            class="btn btn-primary btn-lg btn-full"
          >
            Register again
          </NuxtLink>
          <NuxtLink
            v-else
            to="/auth/login"
            class="btn btn-primary btn-lg btn-full"
          >
            Back to sign in
          </NuxtLink>
          <NuxtLink to="/auth/login" class="btn btn-ghost btn-md btn-full text-ink-muted">
            Go to sign in
          </NuxtLink>
        </div>

        <!-- Debug detail (dev only) -->
        <details v-if="isDev" class="mt-6">
          <summary class="text-xs text-ink-muted cursor-pointer">Debug info</summary>
          <pre class="text-xs text-ink-muted bg-cream rounded-xl p-3 mt-2 overflow-x-auto whitespace-pre-wrap break-all">{{ debugInfo }}</pre>
        </details>
      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Loader2, MailCheck, CheckCircle2, Zap,
  Link, AlertCircle, ShieldAlert,
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Confirming… — eTailor' })

const supabase = useSupabaseClient()
const route    = useRouter()
const nuxtRoute = useRoute()
const isDev    = process.env.NODE_ENV === 'development'

// ── State machine ─────────────────────────────────────────────────────────────
type PageState = 'processing' | 'verified' | 'magiclink' | 'email_changed' | 'error'
type ErrorType = 'expired_reset' | 'expired_signup' | 'invalid_token' | 'unknown'

const state     = ref<PageState>('processing')
const errorType = ref<ErrorType>('unknown')
const debugInfo = ref('')
const countdown = ref(3)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// ── Processing label changes based on what we detect in the URL ───────────────
const processingLabel = computed(() => {
  const type = nuxtRoute.query.type as string | undefined
  if (type === 'recovery')     return 'Verifying reset link…'
  if (type === 'signup')       return 'Confirming your email…'
  if (type === 'magiclink')    return 'Signing you in…'
  if (type === 'email_change') return 'Confirming email change…'
  return 'Verifying…'
})

// ── Error display ─────────────────────────────────────────────────────────────
const errorTitle = computed(() => {
  switch (errorType.value) {
    case 'expired_reset':  return 'Reset link expired'
    case 'expired_signup': return 'Verification link expired'
    case 'invalid_token':  return 'Invalid link'
    default:               return 'Something went wrong'
  }
})

const errorMessage = computed(() => {
  switch (errorType.value) {
    case 'expired_reset':
      return 'This password reset link has expired or has already been used. Links are only valid for 1 hour. Please request a new one.'
    case 'expired_signup':
      return 'This email verification link has expired. Please register again to receive a fresh confirmation email.'
    case 'invalid_token':
      return 'This link is invalid or has already been used. If you believe this is an error, please try the action again.'
    default:
      return 'We couldn\'t complete the verification. Please try again or contact support if the problem persists.'
  }
})

const errorIcon = computed(() => {
  switch (errorType.value) {
    case 'expired_reset':
    case 'expired_signup': return Link
    case 'invalid_token':  return ShieldAlert
    default:               return AlertCircle
  }
})

// ── Main logic ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (import.meta.server) return // Only runs client-side

  try {
    await handleConfirm()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    debugInfo.value = msg
    classifyError(msg)
    state.value = 'error'
  }
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function finishShopSetup(): Promise<void> {
  const raw = localStorage.getItem('pendingShop')
  if (!raw) return // already done or direct navigation — skip silently

  const pending = JSON.parse(raw)

  // Session is now active — auth.uid() will resolve correctly for RLS
  const { error } = await supabase.from('shops').insert({
    owner_id: pending.ownerId,
    name:     pending.shopName,
    phone:    pending.phone || null,
    currency: pending.currency,
    settings: {
      orderNumberPrefix:     'ORD',
      orderNumberFormat:     'YYYY-NNN',
      defaultDepositPercent: 50,
      measurementUnit:       pending.measurementUnit,
      workingDays:           [1, 2, 3, 4, 5, 6],
      whatsappEnabled:       false,
      taxRate:               0,
    },
  })

  localStorage.removeItem('pendingShop') // always clean up

  if (error) {
    // Unique constraint on owner_id would mean shop already created — safe to ignore
    if (error.code === '23505') return
    throw error
  }
}

async function handleConfirm(): Promise<void> {
  const query    = nuxtRoute.query
  const hash     = window.location.hash

  // ── Path A: PKCE code exchange ──────────────────────────────────────────────
  // @nuxtjs/supabase may have already exchanged the code, but we handle it
  // defensively in case the module's auto-exchange didn't fire.
  // if (query.code) {
  //   const { data, error } = await supabase.auth.exchangeCodeForSession(
  //     query.code as string,
  //   )

  //   if (error) {
  //     debugInfo.value = error.message
  //     classifyError(error.message)
  //     state.value = 'error'
  //     return
  //   }

  //   // `next` param tells us where to forward after a successful exchange.
  //   // We set this in reset-password.vue: redirectTo includes ?next=/auth/update-password
  //   const next = query.next as string | undefined
  //   if (next && next.startsWith('/')) {
  //     await route.replace(next)
  //     return
  //   }

  //   // No `next` — determine destination from the session's AMR (Auth Method Reference)
  //   // or fall back to a sensible default based on the flow type.
  //   const flowType = data.session?.user?.app_metadata?.provider ?? ''
  //   await resolveDestination(data.session?.user?.aud ?? '', flowType)
  //   return
  // }
  // OR — just read the session the module already established
  if (query.code) {
    // @nuxtjs/supabase has already exchanged the code by the time
    // this runs. Just grab the active session.
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      debugInfo.value = error?.message ?? 'No session after code exchange'
      classifyError(error?.message ?? '')
      state.value = 'error'
      return
    }

    const next = query.next as string | undefined
    if (next?.startsWith('/')) {
      await route.replace(next)
      return
    }

    await resolveDestination(session.user.aud ?? '', session.user.app_metadata?.provider ?? '')
    return
  }

  // ── Path B: Hash fragment token (implicit flow) ────────────────────────────
  // Older Supabase PKCE or direct links may arrive with tokens in the hash.
  if (hash && hash.includes('access_token')) {
    const params   = new URLSearchParams(hash.slice(1)) // strip leading '#'
    const accessToken  = params.get('access_token') ?? ''
    const refreshToken = params.get('refresh_token') ?? ''
    const type         = params.get('type') ?? ''
    const errorCode    = params.get('error')
    const errorDesc    = params.get('error_description')

    // Supabase sometimes puts the error IN the hash
    if (errorCode) {
      debugInfo.value = `${errorCode}: ${errorDesc}`
      classifyError(errorDesc ?? errorCode)
      state.value = 'error'
      return
    }

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      if (error) {
        debugInfo.value = error.message
        classifyError(error.message)
        state.value = 'error'
        return
      }

      await resolveByType(type)
      return
    }
  }

  // ── Path C: Error params in query string ───────────────────────────────────
  // Supabase can also redirect with ?error=... in query params
  if (query.error) {
    const msg = (query.error_description as string) ?? (query.error as string)
    debugInfo.value = msg
    classifyError(msg)
    state.value = 'error'
    return
  }

  // ── Path D: Already has a valid session (OAuth redirect, etc.) ─────────────
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // Came from OAuth or a flow where the session was set before landing here
    const next = query.next as string | undefined
    if (next && next.startsWith('/')) {
      await route.replace(next)
      return
    }
    await route.replace('/')
    return
  }

  // ── Fallback: nothing to exchange, nothing in hash, no session ─────────────
  debugInfo.value = 'No code, hash token, or session found in URL'
  errorType.value = 'invalid_token'
  state.value = 'error'
}

// ── Resolve destination based on flow type string from hash ──────────────────
async function resolveByType(type: string): Promise<void> {
  switch (type) {
    case 'recovery':
      // Password reset — forward to the update-password page
      await route.replace('/auth/update-password')
      return

    case 'signup':
      await finishShopSetup()   // ← insert shop now that session is active

      const authStore = useAuthStore()
      await authStore.init()

      state.value = 'verified'
      startCountdown('/')
      return
    case 'email_change':
      state.value = 'email_changed'
      startCountdown('/settings')
      return

    case 'magiclink':
    case 'invite':
      state.value = 'magiclink'
      startCountdown('/')
      return

    default:
      // Unknown type but we have a valid session — just go home
      await route.replace('/')
  }
}

// ── Resolve destination based on session data (PKCE flow) ────────────────────
async function resolveDestination(_aud: string, _provider: string): Promise<void> {
  // For PKCE, we don't have an explicit `type` — check the user's email confirmation
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    errorType.value = 'invalid_token'
    state.value = 'error'
    return
  }

  // If email is newly confirmed (just registered), show verified screen
  if (user.email_confirmed_at) {
     await finishShopSetup()   // ← insert shop now that session is active

    const authStore = useAuthStore()
    await authStore.init()

    state.value = 'verified'
    startCountdown('/')
  } else {
    await route.replace('/')
  }
}

// ── Classify errors into actionable types ─────────────────────────────────────
function classifyError(msg: string): void {
  const m = msg.toLowerCase()

  if (m.includes('expired') && (m.includes('recover') || m.includes('reset') || m.includes('password'))) {
    errorType.value = 'expired_reset'
  } else if (m.includes('expired') && m.includes('signup')) {
    errorType.value = 'expired_signup'
  } else if (m.includes('expired') || m.includes('invalid') || m.includes('already used') || m.includes('otp')) {
    errorType.value = 'invalid_token'
  } else {
    errorType.value = 'unknown'
  }
}

// ── Countdown then redirect ───────────────────────────────────────────────────
function startCountdown(destination: string): void {
  countdown.value = 3
  countdownTimer = setInterval(async () => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
      await route.replace(destination)
    }
  }, 1000)
}
</script>
