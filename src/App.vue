<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { useApp } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import FighterPage from './pages/FighterPage.vue'
import NotesPage from './pages/NotesPage.vue'

const { view } = useApp()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <AppShell>
      <NotesPage v-if="view === 'notas'" />
      <FighterPage v-else />
    </AppShell>
  </MotionConfig>
</template>
