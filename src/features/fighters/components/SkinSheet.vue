<script setup lang="ts">
import { QBtn, QCarousel, QCarouselSlide, QDialog, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { useSaveStatus } from '../../plan/saveStatus'
import { useSkinSheet } from '../composables/useSkinSheet'

const { desktop, slide, m, open, close, act, chooseCostume, zoom } = useSkinSheet()
const { saving, saved } = useSaveStatus()
</script>

<template>
  <q-dialog
    :model-value="open"
    :position="desktop ? 'standard' : 'bottom'"
    :full-width="!desktop"
    :transition-show="desktop ? 'scale' : 'slide-up'"
    :transition-hide="desktop ? 'scale' : 'slide-down'"
    :transition-duration="desktop ? 240 : 320"
    class="sheet-dialog"
    @update:model-value="(v: boolean) => { if (!v) close() }"
  >
    <div v-if="m" class="sheet" role="dialog" :aria-label="'Detalle de ' + m.entry.p.name">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__top">
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <div class="sheet__body">
        <q-carousel
          v-if="m.shots.length"
          v-model="slide"
          animated
          swipeable
          :arrows="m.shots.length > 1"
          :navigation="m.shots.length > 1 && m.shots.length <= 8"
          control-color="white"
          class="sheet-carousel"
          :aria-label="'Fotos de ' + m.entry.p.name"
        >
          <q-carousel-slide v-for="(shot, i) in m.shots" :key="shot.m + i" :name="i" class="sheet-slide">
            <AppImg :src="shot.m" :alt="'Foto ' + (i + 1) + ' de ' + m.shots.length + ' de ' + m.entry.p.name" fit="contain" retry eager />
            <q-btn flat round padding="0" class="photo__zoom" aria-label="Ampliar foto" data-zoom="1" @click="zoom(i)">
              <span class="photo__zoom-dot"><q-icon name="open_in_full" size="18px" aria-hidden="true" /></span>
            </q-btn>
          </q-carousel-slide>
        </q-carousel>
        <div v-else class="photo photo--solo">
          <AppImg :src="null" alt="No se pudo cargar la foto" />
        </div>

        <p v-if="m.shots.length > 1" class="sheet__count">Foto {{ slide + 1 }} de {{ m.shots.length }}</p>
        <h2 class="sheet__title">{{ m.entry.p.name }}</h2>
        <p v-if="m.entry.p.author" class="sheet__author">{{ m.entry.p.author }}</p>
        <p v-if="m.pick" class="sheet__line">{{ m.pickLine }}</p>
        <p v-if="m.choice.line" class="sheet__line">{{ m.choice.line }}</p>
      </div>

      <div class="sheet__foot">
        <q-btn
          v-if="m.entry.p.url"
          outline
          no-caps
          class="btn-quiet btn-link"
          :href="m.entry.p.url"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ver página del mod, se abre en una pestaña nueva"
        >
          Ver página del mod<q-icon name="open_in_new" size="16px" aria-hidden="true" />
        </q-btn>
        <q-btn
          v-if="m.pick"
          unelevated
          no-caps
          class="btn-main btn-grow"
          label="Elegir traje"
          data-act="pick"
          @click="chooseCostume"
        />
        <q-btn
          v-else-if="m.choice.kind !== 'none'"
          unelevated
          no-caps
          class="btn-main btn-grow"
          :label="m.choice.label"
          data-use="1"
          :data-act="m.choice.kind"
          @click="act"
        />
        <p v-if="!m.pick && m.choice.kind !== 'none'" class="sheet__place">{{ m.place }}</p>
        <p v-if="!m.pick && (m.choice.kind === 'use' || m.choice.kind === 'replace')" class="sheet__note">Se añadirá al plan compartido. La instalación se realiza después.</p>
        <p v-if="saving" class="sheet__line" role="status">Guardando cambios…</p>
        <p v-else-if="saved" class="sheet__line" role="status">Cambios guardados</p>
      </div>
    </div>
  </q-dialog>
</template>
