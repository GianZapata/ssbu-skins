<script setup lang="ts">
import { computed } from 'vue'
import { tick, viewRoute } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import CatalogPage from './pages/CatalogPage.vue'
import FighterPage from './pages/FighterPage.vue'
import NotesPage from './pages/NotesPage.vue'
import RosterPage from './pages/RosterPage.vue'

const name = computed(() => {
  tick.value

  const view = viewRoute().v

  if (view === 'traje' || view === 'luchador') return 'fighter'
  if (view === 'catalogo' || view === 'notas') return view

  return 'luchadores'
})
</script>

<template>
  <AppShell>
    <FighterPage v-if="name === 'fighter'" />
    <CatalogPage v-else-if="name === 'catalogo'" />
    <NotesPage v-else-if="name === 'notas'" />
    <RosterPage v-else />
  </AppShell>
</template>
