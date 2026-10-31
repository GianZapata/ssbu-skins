<script setup lang="ts">
import { computed } from 'vue'
import { route, tick } from '../../../composables/useApp'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const current = computed(() => {
  tick.value
  return route.value.v
})

const planUpdated = computed(() => {
  const raw = META.plan_updated_at

  if (!raw) return ''

  const [year, month, date] = raw.slice(0, 10).split('-')
  const index = Number(month) - 1

  if (!year || !date || index < 0 || index > 11) return ''

  return `Plan actualizado el ${Number(date)} ${MONTHS[index]} ${year}`
})
</script>

<template>
  <nav class="dest" aria-label="Listas">
    <a href="#/catalogo" :aria-current="current === 'catalogo' ? 'page' : undefined">Catálogo</a>
    <a href="#/instaladas" :aria-current="current === 'instaladas' ? 'page' : undefined">Instaladas</a>
  </nav>
  <p v-if="planUpdated" style="margin: 0 0 12px; color: var(--tx-mu); font-size: 13px; line-height: 18px; font-weight: 600;">{{ planUpdated }}</p>
</template>
