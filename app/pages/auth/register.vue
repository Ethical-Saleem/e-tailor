<!-- app/pages/auth/register.vue -->
<template>
  <div>
    <!-- Step indicator -->
    <div class="flex items-center gap-2 mb-6">
      <div
        v-for="(s, i) in steps"
        :key="i"
        :class="[
          'h-1 flex-1 rounded-full transition-all duration-300',
          i <= step ? 'bg-gold' : 'bg-cream-dark',
        ]"
      />
    </div>

    <!-- Step 1: Account -->
    <Transition name="slide-up" mode="out-in">
      <div v-if="step === 0" key="account">
        <h2 class="font-display text-2xl text-ink mb-1">Create your account</h2>
        <p class="text-sm text-ink-muted mb-5">Start with your login details</p>

        <div class="space-y-4">
          <div>
            <label class="form-label">Email address</label>
            <input v-model="form.email" type="email" placeholder="you@example.com" class="form-input" />
          </div>
          <div>
            <label class="form-label">Password</label>
            <input v-model="form.password" type="password" placeholder="Min. 8 characters" class="form-input" />
          </div>
          <div>
            <label class="form-label">Confirm password</label>
            <input v-model="form.confirmPassword" type="password" placeholder="Repeat password" class="form-input" />
          </div>
          <p v-if="stepError" class="form-error">{{ stepError }}</p>
          <button class="btn btn-primary btn-lg btn-full" @click="nextStep">Continue →</button>
        </div>
      </div>

      <!-- Step 2: Shop setup -->
      <div v-else-if="step === 1" key="shop">
        <h2 class="font-display text-2xl text-ink mb-1">Set up your shop</h2>
        <p class="text-sm text-ink-muted mb-5">Tell us about your business</p>

        <div class="space-y-4">
          <div>
            <label class="form-label">Shop / Business name</label>
            <input v-model="form.shopName" type="text" placeholder="e.g. Adaeze Couture" class="form-input" />
          </div>
          <div>
            <label class="form-label">Phone number</label>
            <input v-model="form.phone" type="tel" placeholder="+234 800 000 0000" class="form-input" />
          </div>
          <div>
            <label class="form-label">Currency</label>
            <select v-model="form.currency" class="form-input">
              <option v-for="c in currencies" :key="c.code" :value="c.code">
                {{ c.flag }} {{ c.name }} ({{ c.symbol }})
              </option>
            </select>
          </div>
          <div>
            <label class="form-label">Measurement unit</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="u in ['inches', 'cm']"
                :key="u"
                :class="['btn btn-outline btn-md', form.measurementUnit === u ? 'bg-ink text-white border-ink' : '']"
                @click="form.measurementUnit = u"
              >
                {{ u === 'inches' ? '📏 Inches' : '📐 Centimetres' }}
              </button>
            </div>
          </div>
          <p v-if="stepError" class="form-error">{{ stepError }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn btn-outline btn-md" @click="step--">← Back</button>
            <button class="btn btn-primary btn-md" @click="nextStep">Continue →</button>
          </div>
        </div>
      </div>

      <!-- Step 3: Creating account -->
      <div v-else-if="step === 2" key="creating">
        <div class="text-center py-8">
          <div class="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 v-if="isLoading" :size="32" class="animate-spin stroke-gold" />
            <CheckCircle2 v-else-if="!authError" :size="32" class="stroke-success" />
            <AlertCircle  v-else                 :size="32" class="stroke-danger" />
          </div>
          <h2 class="font-display text-2xl text-ink mb-2">
            {{ isLoading ? 'Setting up your shop…' : authError ? 'Something went wrong' : 'You\'re all set!' }}
          </h2>
          <p class="text-sm text-ink-muted">
            {{ isLoading
              ? 'Creating your account and shop profile'
              : authError
              ? authError
              : 'Your eTailor shop is ready to use' }}
          </p>
          <button v-if="authError" class="btn btn-primary btn-md mt-6" @click="step = 0; authError = ''">
            Try again
          </button>
        </div>
      </div>
    </Transition>

    <p v-if="step < 2" class="text-center text-sm text-ink-muted mt-5">
      Already have an account?
      <NuxtLink to="/auth/login" class="text-gold font-medium">Sign in</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Create Shop — eTailor' })

const supabase  = useSupabaseClient()
const router    = useRouter()

const step      = ref(0)
const stepError = ref('')
const authError = ref('')
const isLoading = ref(false)
const steps     = ['Account', 'Shop', 'Done']

const form = reactive({
  email:           '',
  password:        '',
  confirmPassword: '',
  shopName:        '',
  phone:           '',
  currency:        'NGN',
  measurementUnit: 'inches',
})

const currencies = [
  { code: 'NGN', name: 'Nigerian Naira',  symbol: '₦', flag: '🇳🇬' },
  { code: 'USD', name: 'US Dollar',       symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound',   symbol: '£', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro',            symbol: '€', flag: '🇪🇺' },
  { code: 'GHS', name: 'Ghanaian Cedi',   symbol: '₵', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
]

async function nextStep() {
  stepError.value = ''

  if (step.value === 0) {
    if (!form.email)    return (stepError.value = 'Email is required')
    if (!form.password) return (stepError.value = 'Password is required')
    if (form.password.length < 8) return (stepError.value = 'Password must be at least 8 characters')
    if (form.password !== form.confirmPassword) return (stepError.value = 'Passwords do not match')
    step.value++
    return
  }

  if (step.value === 1) {
    if (!form.shopName) return (stepError.value = 'Shop name is required')
    step.value = 2
    await createAccount()
  }
}

// async function createAccount() {
//   isLoading.value = true
//   authError.value = ''
//   try {
//     // 1. Create Supabase auth user
//     const { data: authData, error: authErr } = await supabase.auth.signUp({
//       email:    form.email,
//       password: form.password,
//     })
//     if (authErr) throw authErr
//     if (!authData.user) throw new Error('No user returned')

//     // 2. Create shop record
//     const { error: shopErr } = await supabase
//       .from('shops')
//       .insert({
//         name:     form.shopName,
//         owner_id: authData.user.id,
//         phone:    form.phone || null,
//         currency: form.currency,
//         settings: {
//           orderNumberPrefix:     'ORD',
//           orderNumberFormat:     'YYYY-NNN',
//           defaultDepositPercent: 50,
//           measurementUnit:       form.measurementUnit,
//           workingDays:           [1, 2, 3, 4, 5, 6],
//           whatsappEnabled:       false,
//           taxRate:               0,
//         },
//       })
//     if (shopErr) throw shopErr

//     // 3. Navigate to app
//     await new Promise(r => setTimeout(r, 1200)) // show success state briefly
//     await navigateTo('/auth/login')
//   } catch (err: unknown) {
//     authError.value = err instanceof Error ? err.message : 'Registration failed. Please try again.'
//   } finally {
//     isLoading.value = false
//   }
// }
async function createAccount() {
  isLoading.value = true
  authError.value = ''
  try {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?type=signup`,
      },
    })
    if (authErr) throw authErr
    if (!authData.user) throw new Error('No user returned')

    
    // Persist shop setup data so confirm.vue can finish the job
    localStorage.setItem('pendingShop', JSON.stringify({
      ownerId:         authData.user.id,
      email:           form.email,
      shopName:        form.shopName,
      phone:           form.phone,
      currency:        form.currency,
      measurementUnit: form.measurementUnit,
    }))

    await new Promise(r => setTimeout(r, 1200))
    await navigateTo(`/auth/confirm-pending?email=${encodeURIComponent(form.email)}`) // "Check your email" holding page
  } catch (err: unknown) {
    localStorage.removeItem('pendingShop')
    authError.value = err instanceof Error ? err.message : 'Registration failed.'
  } finally {
    isLoading.value = false
  }
}
</script>
