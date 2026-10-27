<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { S } from '../composables/useApp'
import { useFightersPage } from './composables/useFightersPage'

const { rows, find, initialsOf } = useFightersPage()
const findBox = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (findBox.value) findBox.value.value = S.fq
})
</script>

<template>
  <div data-view="luchadores" class="q-pa-md">
    <input id="fq" ref="findBox" type="search" placeholder="Buscar luchador" aria-label="Buscar luchador" autocomplete="off" @input="find">
    <div id="fg" class="fgrid q-mt-md">
      <a v-for="row in rows" :key="row.fighter.code" :class="['ft', { has: row.count > 0 }]" :href="row.href" :aria-label="row.label">
        <span class="im">
          <img v-if="row.fighter.portrait" :src="row.fighter.portrait" alt="" decoding="async">
          <span v-else class="mono" aria-hidden="true">{{ initialsOf(row.fighter.name) }}</span>
        </span>
        <span v-if="row.count" class="cnt">{{ row.count }}</span>
        <b>{{ row.fighter.name }}</b>
      </a>
    </div>
    <p v-if="!rows.length" class="empty">Sin resultados</p>
  </div>
</template>
