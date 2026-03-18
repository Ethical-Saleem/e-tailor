<!-- app/layouts/plain.vue -->
<template>
  <div class="app-shell-plain">
    <SyncStatusBar />
    <main class="flex-1 min-h-0">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell-plain {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-cream);
}
</style>
