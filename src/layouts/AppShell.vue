<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { QAvatar, QBtn, QHeader, QLayout, QPageContainer, QToolbar } from 'quasar'
import { back, go, portraitOf, route, showBack, start, tick, titleOf } from '../composables/useApp'
import { resetReveal, startReveal } from '../composables/useReveal'
import SkinSheet from '../features/fighters/components/SkinSheet.vue'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../features/plan/composables/usePlan'
import { skinOf } from '../features/plan/helpers/lookup'
import { state, syncInfo } from '../features/plan/services/sync'

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
const syncWord = computed(() => {
  tick.value
  const [kind, text] = syncInfo() as [string, string]
  if (kind === 'err') return 'No se pudo guardar'
  if (kind === 'saving') return 'Guardando'
  if (String(text).startsWith('Pendiente')) return 'Pendiente'
  if (text === 'Sin conexión') return 'Sin conexión'
  if (kind === 'ok') return 'Guardado'
  return ''
})
const failing = computed(() => {
  tick.value
  const on = state.syncKind === 'service'
  const op = (state.PEND as Array<{ to: string | null }>)[0]
  const skin = op && op.to ? skinOf(op.to) : null
  return { on, name: skin ? skin.name : '' }
})

const runNotice = () => {
  const current = notice.value
  if (!current) return
  notice.value = null
  if (current.fn) current.fn()
}

watch(() => route.value.code, () => resetReveal())

onMounted(() => {
  start()
  startReveal()
  bootPlan()
})
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app">
    <q-header class="app-header" height-hint="56">
      <q-toolbar class="app-header__bar">
        <q-btn v-if="canBack" flat round padding="0" class="icon-btn" icon="arrow_back" aria-label="Volver" @click="back" />
        <q-avatar v-if="portrait" square size="36px" class="app-header__face">
          <img :src="portrait" alt="" decoding="async">
        </q-avatar>
        <h1 id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>
        <span id="sync" class="sync-word" :data-kind="syncWord ? 'on' : 'off'">{{ syncWord }}</span>
        <q-btn flat no-caps class="hdr-btn" label="Notas" aria-label="Notas de búsqueda" @click="go('#/notas')" />
        <q-btn
          v-if="chosen > 0"
          flat
          no-caps
          class="hdr-btn"
          label="Elegidas"
          :aria-label="'Ver skins elegidas, ' + chosen"
          @click="go('#/cambios')"
        />
      </q-toolbar>
      <div v-if="failing.on" class="sync-fail" role="alert">
        <span>{{ failing.name ? failing.name + '. No se pudo guardar.' : 'No se pudo guardar.' }}</span>
        <q-btn flat no-caps class="hdr-btn" label="Reintentar" @click="retrySync" />
      </div>
      <div v-if="notice" id="toast" class="notice" role="status">
        <span>{{ notice.text }}</span>
        <button v-if="notice.label" type="button" @click="runNotice">{{ notice.label }}</button>
        <button type="button" aria-label="Cerrar aviso" @click="dismissNotice">Cerrar</button>
      </div>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>

    <SkinSheet />
    <SummarySheet />
  </q-layout>
</template>
