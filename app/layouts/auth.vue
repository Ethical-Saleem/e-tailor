<!-- app/layouts/auth.vue -->
<template>
  <div class="min-h-screen bg-ink flex flex-col items-center justify-center px-5 py-10">
    <!-- Logo -->
    <div class="mb-10 text-center">
      <img src="/icons/icon.png" alt="e-Tailor Logo" width="80" height="80" class="mb-4 mx-auto" />
      <h1 class="font-display text-5xl text-white font-light tracking-tight">
        e<span class="text-gold">Tailor</span>
      </h1>
      <p class="text-white/40 text-sm mt-1 italic font-display">Smart Tailor Business Manager</p>
    </div>

    <!-- Card -->
    <div class="w-full max-w-sm bg-surface rounded-2xl shadow-card-lg p-6">
      <slot />
    </div>

    <!-- Footer -->
    <div class="mt-8">
      <p class="text-white/20 text-xs text-center">
        Your data ── always yours
      </p>
      <p class="mt-1 text-white/20 text-xs text-center">
        Primecodes Global Tech · 2026
      </p>
    </div>
  </div>
</template>
