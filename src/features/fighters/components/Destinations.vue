<script setup lang="ts">
import { computed } from 'vue'
import { route, tick } from '../../../composables/useApp'

const current = computed(() => {
  tick.value
  return route.value.v
})
</script>

<template>
  <nav class="dest" aria-label="Listas">
    <a href="#/catalogo" :aria-current="current === 'catalogo' ? 'page' : undefined">Catálogo</a>
    <a href="#/instaladas" :aria-current="current === 'instaladas' ? 'page' : undefined">Instaladas</a>
  </nav>
</template>
