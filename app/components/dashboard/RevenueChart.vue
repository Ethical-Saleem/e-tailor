<!-- app/components/dashboard/RevenueChart.vue -->
<template>
  <div class="p-4">
    <svg :width="'100%'" :height="90" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9a84c" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#c9a84c" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <!-- Area fill -->
      <path :d="areaPath" fill="url(#revGradient)" />
      <!-- Line -->
      <path :d="linePath" fill="none" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Month labels -->
      <text
        v-for="(point, i) in points"
        :key="i"
        :x="point.x"
        :y="H"
        font-size="9"
        text-anchor="middle"
        :fill="i === points.length - 1 ? '#c9a84c' : '#b0a090'"
        font-family="DM Mono"
        :font-weight="i === points.length - 1 ? '500' : '400'"
      >
        {{ point.label }}
      </text>

      <!-- Last point dot -->
      <circle
        v-if="points.length > 0"
        :cx="points[points.length-1].x"
        :cy="points[points.length-1].y"
        r="4"
        fill="#c9a84c"
      />
      <circle
        v-if="points.length > 0"
        :cx="points[points.length-1].x"
        :cy="points[points.length-1].y"
        r="8"
        fill="none"
        stroke="#c9a84c"
        stroke-width="1"
        opacity="0.35"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: Array<{ label: string; value: number }>
}>()

const W = 320
const H = 80
const PADDING_BOTTOM = 14

const points = computed(() => {
  const vals = props.data.map(d => d.value)
  const min  = Math.min(...vals, 0)
  const max  = Math.max(...vals, 1)
  const range = max - min || 1
  const chartH = H - PADDING_BOTTOM

  return props.data.map((d, i) => ({
    x:     (i / Math.max(props.data.length - 1, 1)) * (W - 10) + 5,
    y:     chartH - ((d.value - min) / range) * (chartH - 10) + 4,
    label: d.label,
    value: d.value,
  }))
})

const linePath = computed(() => {
  if (points.value.length < 2) return ''
  const pts = points.value
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpX = (pts[i-1].x + pts[i].x) / 2
    d += ` C ${cpX} ${pts[i-1].y} ${cpX} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  return d
})

const areaPath = computed(() => {
  if (points.value.length < 2) return ''
  const chartH = H - PADDING_BOTTOM
  const last = points.value[points.value.length - 1]
  const first = points.value[0]
  return `${linePath.value} L ${last.x} ${chartH + 4} L ${first.x} ${chartH + 4} Z`
})
</script>
