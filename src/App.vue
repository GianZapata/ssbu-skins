<script setup lang="ts">
import { computed } from 'vue'
import { tick, viewRoute } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import BoardPage from './pages/BoardPage.vue'
import CatalogPage from './pages/CatalogPage.vue'
import FighterPage from './pages/FighterPage.vue'
import FightersPage from './pages/FightersPage.vue'
import InstalledPage from './pages/InstalledPage.vue'
import NotesPage from './pages/NotesPage.vue'

const name = computed(() => {
  tick.value

  const view = viewRoute().v

  if (view === 'traje' || view === 'luchador') return 'fighter'
  if (view === 'tarjeta' || view === 'catalogo' || view === 'instaladas' || view === 'notas') return view
  return 'luchadores'
})
</script>

<template>
  <AppShell>
    <BoardPage v-if="name === 'tarjeta'" />
    <FighterPage v-else-if="name === 'fighter'" />
    <CatalogPage v-else-if="name === 'catalogo'" />
    <InstalledPage v-else-if="name === 'instaladas'" />
    <NotesPage v-else-if="name === 'notas'" />
    <FightersPage v-else />
  </AppShell>
</template>
