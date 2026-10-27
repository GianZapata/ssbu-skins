<script setup lang="ts">
import { computed } from 'vue'
import { route, tick } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import FighterPage from './pages/FighterPage.vue'
import FightersPage from './pages/FightersPage.vue'

/* La hoja de detalle se abre sobre Luchador y el resumen sobre Luchadores. */
const name = computed(() => {
  tick.value
  const view = route.value.v
  return view === 'traje' || view === 'luchador' || view === 'ficha' ? 'fighter' : 'luchadores'
})
</script>

<template>
  <AppShell>
    <FighterPage v-if="name === 'fighter'" />
    <FightersPage v-else />
  </AppShell>
</template>
