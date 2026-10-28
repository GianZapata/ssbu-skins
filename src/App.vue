<script setup lang="ts">
import { computed } from 'vue'
import { route, tick, underCatalog } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import CatalogPage from './pages/CatalogPage.vue'
import FighterPage from './pages/FighterPage.vue'
import FightersPage from './pages/FightersPage.vue'
import InstalledPage from './pages/InstalledPage.vue'
import NotesPage from './pages/NotesPage.vue'

const name = computed(() => {
  tick.value
  const view = route.value.v
  if (underCatalog(route.value)) return 'catalogo'
  if (view === 'traje' || view === 'luchador' || view === 'ficha') return 'fighter'
  if (view === 'catalogo' || view === 'instaladas' || view === 'notas') return view
  return 'luchadores'
})
</script>

<template>
  <AppShell>
    <FighterPage v-if="name === 'fighter'" />
    <CatalogPage v-else-if="name === 'catalogo'" />
    <InstalledPage v-else-if="name === 'instaladas'" />
    <NotesPage v-else-if="name === 'notas'" />
    <FightersPage v-else />
  </AppShell>
</template>
