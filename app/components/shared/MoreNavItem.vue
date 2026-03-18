<!-- app/components/shared/MoreNavItem.vue -->
<!--
  A single navigation row used on the /more page.
  Renders as a NuxtLink with icon, label, description, optional badge,
  and a chevron. Touches the full width of its parent card.
-->
<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-3.5 px-4 py-3.5 group
           hover:bg-cream active:bg-cream-dark transition-colors duration-150"
  >
    <!-- Icon bubble -->
    <div :class="['w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mr-4', iconBg]">
      <component
        :is="icon"
        :size="18"
        stroke-width="1.8"
        :class="iconColor"
      />
    </div>

    <!-- Text -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-ink leading-snug">{{ label }}</p>
      <p v-if="description" class="text-xs text-ink-muted mt-0.5 leading-snug truncate">
        {{ description }}
      </p>
    </div>

    <!-- Badge (e.g. low stock count) -->
    <span
      v-if="badge"
      :class="['text-2xs font-bold text-white px-2 py-0.5 rounded-full flex-shrink-0', badgeColor ?? 'bg-gold']"
    >
      {{ badge }}
    </span>

    <!-- Chevron -->
    <ChevronRight
      :size="16"
      stroke-width="2"
      class="stroke-ink-subtle flex-shrink-0 group-hover:stroke-ink-muted transition-colors"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Component } from 'vue'

defineProps<{
  to:           string
  icon:         Component
  label:        string
  description?: string
  iconBg?:      string   // tailwind bg class, e.g. 'bg-info/10'
  iconColor?:   string   // tailwind stroke class, e.g. 'stroke-info'
  badge?:       string   // text shown in pill, e.g. '3'
  badgeColor?:  string   // tailwind bg class for badge pill
}>()
</script>
