<script setup lang="ts">
import { computed } from 'vue'
import { route, tick } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import CatalogPage from './pages/CatalogPage.vue'
import ChangesPage from './pages/ChangesPage.vue'
import FichaPage from './pages/FichaPage.vue'
import FighterPage from './pages/FighterPage.vue'
import FightersPage from './pages/FightersPage.vue'

const name = computed(() => {
  tick.value
  const view = route.value.v
  if (view === 'traje' || view === 'luchador') return 'fighter'
  if (view === 'ficha') return 'ficha'
  if (view === 'catalogo') return 'catalogo'
  if (view === 'cambios') return 'cambios'
  return 'luchadores'
})
</script>

<template>
  <AppShell>
    <FightersPage v-if="name === 'luchadores'" />
    <FighterPage v-else-if="name === 'fighter'" />
    <CatalogPage v-else-if="name === 'catalogo'" />
    <FichaPage v-else-if="name === 'ficha'" />
    <ChangesPage v-else />
  </AppShell>
</template>
