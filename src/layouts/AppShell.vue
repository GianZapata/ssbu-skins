<script setup lang="ts">
import { QAvatar, QBtn, QHeader, QItem, QItemSection, QLayout, QList, QMenu, QPageContainer, QToolbar } from 'quasar'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import PersonSheet from '../features/plan/components/PersonSheet.vue'
import { useAppShell } from './composables/useAppShell'

const {
  hdrHidden,
  problem,
  notice,
  title,
  portrait,
  canBack,
  chosen,
  personMenuLabel,
  isOpenPerson,
  back,
  go,
  retrySync,
  dismissNotice,
  openPersonSheet,
  closePersonSheet,
  runNotice,
} = useAppShell()
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
        <q-btn flat round padding="0" class="icon-btn" icon="more_vert" aria-label="Más opciones" data-person-opener>
          <q-menu anchor="bottom right" self="top right">
            <q-list>
              <q-item v-close-popup clickable data-person-menu @click="openPersonSheet">
                <q-item-section>{{ personMenuLabel }}</q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="go('#/notas')">
                <q-item-section>Búsquedas pendientes</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn
          flat
          no-caps
          class="hdr-btn"
          :class="{ 'hdr-btn--on': chosen > 0 }"
          :label="'Cambios · ' + chosen"
          :aria-label="'Ver cambios, ' + chosen"
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

    <SummarySheet />
    <PersonSheet :is-open="isOpenPerson" @close="closePersonSheet" />
  </q-layout>
</template>
