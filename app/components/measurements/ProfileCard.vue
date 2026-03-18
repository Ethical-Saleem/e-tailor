<!-- app/components/shared/MeasurementProfileCard.vue -->
<template>
  <div
    class="card p-4 cursor-pointer hover:shadow-card-md transition-all duration-150 group"
    @click="$emit('click')"
  >
    <!-- Top row -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1 min-w-0 pr-2">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-base">{{ categoryIcon }}</span>
          <p class="text-sm font-semibold text-ink truncate">{{ profile.label }}</p>
        </div>
        <p class="text-xs text-ink-muted capitalize">
          {{ profile.category.replace(/_/g, ' ') }}
          · {{ profile.unit }}
          <span v-if="profile.takenAt"> · {{ formatDate(profile.takenAt) }}</span>
          <span v-else> · {{ formatDate(profile.createdAt) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <span v-if="profile.isTemplate" class="badge badge-ready text-2xs py-0.5">Template</span>
        <button
          class="w-7 h-7 rounded-lg bg-danger/0 hover:bg-danger/10 flex items-center justify-center
                 opacity-0 group-hover:opacity-100 transition-all duration-150"
          @click.stop="$emit('delete')"
        >
          <Trash2 :size="13" stroke-width="2" class="stroke-danger" />
        </button>
      </div>
    </div>

    <!-- Key measurements grid (up to 6) -->
    <div class="grid grid-cols-3 gap-x-4 gap-y-1.5 bg-cream rounded-xl p-3">
      <div
        v-for="([key, val]) in previewFields"
        :key="key"
        class="flex items-center justify-between"
      >
        <span class="text-2xs text-ink-muted capitalize truncate mr-1">
          {{ key.replace(/_/g, ' ') }}
        </span>
        <span class="font-mono-dm text-2xs text-ink font-medium flex-shrink-0">
          {{ val }}{{ profile.unit === 'inches' ? '"' : '' }}
        </span>
      </div>
      <div v-if="extraCount > 0" class="col-span-3 text-center">
        <span class="text-2xs text-ink-muted">+{{ extraCount }} more fields</span>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="profile.takenBy || profile.notes" class="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-cream-dark">
      <p v-if="profile.takenBy" class="text-2xs text-ink-muted flex items-center gap-1">
        <User :size="10" stroke-width="2" />
        {{ profile.takenBy }}
      </p>
      <p v-if="profile.notes" class="text-2xs text-ink-muted truncate flex-1 italic">
        {{ profile.notes }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trash2, User } from 'lucide-vue-next'
import type { MeasurementProfile, GarmentCategory } from '~/types/models'
import dayjs from 'dayjs'

const props = defineProps<{ profile: MeasurementProfile }>()
defineEmits<{ click: []; delete: [] }>()

const CATEGORY_ICONS: Record<GarmentCategory | string, string> = {
  dress:   '👗', gown:    '💃', suit:    '🤵', shirt:   '👔',
  trouser: '👖', skirt:   '🩱', blouse:  '👚', jacket:  '🧥',
  abaya:   '🧕', ankara:  '🎨', asoebi:  '✨', agbada:  '👘',
  custom:  '📐',
}

const categoryIcon = computed(() => CATEGORY_ICONS[props.profile.category] ?? '📐')

const entries = computed(() => Object.entries(props.profile.measurements).filter(([, v]) => v > 0))
const previewFields = computed(() => entries.value.slice(0, 6))
const extraCount    = computed(() => Math.max(0, entries.value.length - 6))

function formatDate(d: string) {
  return dayjs(d).format('MMM YYYY')
}
</script>
