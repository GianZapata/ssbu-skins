<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { QAvatar, QBtn, QHeader, QItem, QItemSection, QLayout, QList, QMenu, QPageContainer, QToolbar } from 'quasar'
import { back, go, portraitOf, route, showBack, start, tick, titleOf } from '../composables/useApp'
import { hdrHidden, resetReveal, startReveal } from '../composables/useReveal'
import SkinSheet from '../features/fighters/components/SkinSheet.vue'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../features/plan/composables/usePlan'
import { useSaveStatus } from '../features/plan/saveStatus'

const { problem } = useSaveStatus()

const title = computed(() => {
  tick.value

  return titleOf()
})

const portrait = computed(() => {
  tick.value

  return portraitOf()
})

const canBack = computed(() => {
  tick.value

  return showBack()
})

const chosen = computed(() => {
  tick.value

  return countChosen()
})

const runNotice = () => {
  const current = notice.value

  if (!current) return

  notice.value = null
  if (current.fn) current.fn()
}

watch(() => route.value.v + ':' + route.value.code, () => resetReveal())

onMounted(() => {
  start()
  startReveal()
  bootPlan()
})
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app" :class="{ 'app--hdr-hidden': hdrHidden }">
    <q-header class="app-header" :class="{ 'app-header--hide': hdrHidden }" height-hint="56">
      <div class="app-frame">
      <q-toolbar class="app-header__bar">
        <q-btn v-if="canBack" flat round padding="0" class="icon-btn" icon="arrow_back" aria-label="Volver" @click="back" />
        <q-avatar v-if="portrait" square size="36px" class="app-header__face">
          <img :src="portrait" alt="" decoding="async">
        </q-avatar>
        <h1 id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>
        <span id="sync" class="sync-word"></span>
        <q-btn flat round padding="0" class="icon-btn" icon="more_vert" aria-label="Más opciones">
          <q-menu anchor="bottom right" self="top right">
            <q-list>
              <q-item v-close-popup clickable @click="go('#/notas')">
                <q-item-section>Búsquedas pendientes</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          v-if="chosen > 0"
          flat
          no-caps
          class="hdr-btn"
          :label="'Plan · ' + chosen"
          :aria-label="'Ver el plan, ' + chosen"
          @click="go('#/cambios')"
        />
      </q-toolbar>
      <div v-if="problem" class="sync-fail" role="status">
        <span>{{ problem }}</span>
        <q-btn flat no-caps class="hdr-btn" label="Reintentar" @click="retrySync" />
      </div>
      <div v-if="notice" id="toast" class="notice" role="status">
        <span>{{ notice.text }}</span>
        <button v-if="notice.label" type="button" @click="runNotice">{{ notice.label }}</button>
        <button type="button" aria-label="Cerrar aviso" @click="dismissNotice">Cerrar</button>
      </div>
      </div>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>

    <SkinSheet />
    <SummarySheet />
  </q-layout>
</template>
