<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { back, go, portraitOf, route, showBack, start, tick, titleOf } from '../composables/useApp'
import { bootPlan, countChosen } from '../features/plan/composables/usePlan'
import AppDialog from './AppDialog.vue'

const title = computed(() => {
  tick.value
  return titleOf()
})
const backOn = computed(() => {
  tick.value
  return showBack()
})
const portrait = computed(() => {
  tick.value
  return portraitOf()
})
const chosen = computed(() => {
  tick.value
  return countChosen()
})
const onList = computed(() => {
  tick.value
  return route.value.v === 'luchadores' || route.value.v === ''
})

onMounted(() => {
  start()
  bootPlan()
})
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="bar">
        <button id="back" type="button" class="ib" aria-label="Volver" :hidden="!backOn" @click="back">
          <svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span v-if="portrait" class="fh"><img :src="portrait" alt=""></span>
        <div class="brand">
          <h1 id="ttl" tabindex="-1">{{ title }}</h1>
          <span id="sync" v-once role="status" aria-live="polite">Conectando…</span>
        </div>
      </div>
      <nav class="desk gt-sm" aria-label="Secciones">
        <a href="#/luchadores">Luchadores</a>
        <a href="#/catalogo">Catálogo</a>
        <a href="#/cambios">Cambios</a>
      </nav>
    </header>
    <main>
      <div id="saveErr" v-once hidden>
        <span data-err-name></span>
      </div>
      <slot />
    </main>
    <button id="picked" type="button" class="picked" :hidden="!(onList && chosen > 0)" :aria-label="'Ver skins elegidas, ' + chosen" @click="go('#/cambios')">
      <span class="picked-txt">Elegidas</span>
      <span id="pickedN">{{ chosen }}</span>
    </button>
    <div id="toast" v-once role="status" aria-live="polite"></div>
    <AppDialog />
  </div>
</template>
