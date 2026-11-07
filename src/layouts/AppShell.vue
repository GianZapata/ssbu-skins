<script setup lang="ts">
import { QBtn, QHeader, QItem, QItemSection, QLayout, QList, QMenu, QPageContainer, QToolbar } from 'quasar'
import FighterPickSheet from '../features/explore/components/FighterPickSheet.vue'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import PersonSheet from '../features/plan/components/PersonSheet.vue'
import { useAppShell } from './composables/useAppShell'

const {
  problem,
  notice,
  title,
  portrait,
  canBack,
  isFighterHeader,
  chosen,
  countPulse,
  personMenuLabel,
  isOpenPerson,
  isOpenFighterPick,
  back,
  go,
  prevFighter,
  nextFighter,
  openFighterPick,
  closePicker,
  retrySync,
  runNotice,
  dismissNotice,
  openPersonSheet,
  closePersonSheet,
} = useAppShell()
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app">
    <q-header class="app-header" height-hint="56">
      <div class="app-frame">
        <q-toolbar class="app-header__bar">
          <q-btn v-if="canBack" flat round padding="0" class="icon-btn" icon="arrow_back" aria-label="Volver" @click="back" />

          <template v-if="isFighterHeader">
            <q-btn
              flat
              round
              padding="0"
              class="icon-btn"
              icon="chevron_left"
              aria-label="Luchador anterior"
              data-prev-fighter
              @click="prevFighter"
            />
            <h1 class="app-header__title">
              <button
                type="button"
                class="fighter-trigger"
                data-fighter-pick
                :aria-label="'Cambiar luchador, actual ' + title"
                @click="openFighterPick"
              >
                <span v-if="portrait" class="app-header__face">
                  <img :src="portrait" alt="" width="32" height="32" decoding="async">
                </span>
                <span id="ttl" tabindex="-1" class="fighter-trigger__name">{{ title }}</span>
                <svg class="fighter-trigger__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
              </button>
            </h1>
            <q-btn
              flat
              round
              padding="0"
              class="icon-btn"
              icon="chevron_right"
              aria-label="Luchador siguiente"
              data-next-fighter
              @click="nextFighter"
            />
          </template>

          <h1 v-else id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>

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
            :class="{ 'hdr-btn--on': chosen > 0, 'hdr-btn--pulse': countPulse }"
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

    <FighterPickSheet v-if="isOpenFighterPick" :is-open="isOpenFighterPick" @close="closePicker" />
    <PersonSheet v-if="isOpenPerson" :is-open="isOpenPerson" @close="closePersonSheet" />
    <SummarySheet />
  </q-layout>
</template>
