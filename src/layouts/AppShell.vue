<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { QAvatar, QBtn, QHeader, QLayout, QPageContainer, QToolbar } from 'quasar'
import ErrorPage from '../components/ErrorPage.vue'
import { back, portraitOf, route, showBack, start, tick, titleOf } from '../composables/useApp'
import { hdrHidden, resetReveal, startReveal } from '../composables/useReveal'
import SkinSheet from '../features/fighters/components/SkinSheet.vue'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import { bootPlan } from '../features/plan/composables/usePlan'

const onFighter = computed(() => {
  tick.value
  return showBack()
})
const title = computed(() => {
  tick.value
  return titleOf()
})
const portrait = computed(() => {
  tick.value
  return portraitOf()
})

watch(() => route.value.code, () => resetReveal())

onMounted(() => {
  start()
  startReveal()
  bootPlan()
})
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app">
    <q-header v-if="onFighter" class="app-header" :class="{ 'app-header--hide': hdrHidden }" height-hint="56">
      <q-toolbar class="app-header__bar">
        <q-btn flat round padding="0" class="icon-btn" icon="arrow_back" aria-label="Volver a Luchadores" @click="back" />
        <q-avatar v-if="portrait" square size="36px" class="app-header__face">
          <img :src="portrait" alt="" decoding="async">
        </q-avatar>
        <h1 id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>

    <SkinSheet />
    <SummarySheet />
    <ErrorPage />
  </q-layout>
</template>
