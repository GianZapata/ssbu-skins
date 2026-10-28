<script setup lang="ts">
import { QIcon, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import ExploreBar from '../features/explore/components/ExploreBar.vue'
import FighterPickSheet from '../features/explore/components/FighterPickSheet.vue'
import { useFighterPick } from '../features/explore/composables/useFighterPick'
import { useGridDensity } from '../features/explore/composables/useGridDensity'
import Destinations from '../features/fighters/components/Destinations.vue'
import { installedQuery, useInstalledPage } from './composables/useInstalledPage'

const { loading, rows, fighter, fighterCode, countLabel, hasFilters, picker, pickerTotal, selectFighter, clearFilters } = useInstalledPage()
const { compact, toggle } = useGridDensity()
const { open, show, hide } = useFighterPick()

const choose = (code: string) => hide(() => selectFighter(code))
</script>

<template>
  <q-page class="page list-page">
    <h1 class="sr-only">Instaladas</h1>
    <Destinations />
    <div class="search-row">
      <ExploreBar
        v-model="installedQuery"
        :loading="loading"
        :fighter-name="fighter ? fighter.name : 'Todos los personajes'"
        :fighter-portrait="fighter ? fighter.portrait || null : null"
        :filtered="hasFilters"
        :count-label="countLabel"
        :compact="compact"
        @open-fighter="show"
        @toggle-density="toggle"
        @clear="clearFilters"
      />
    </div>

    <div v-if="loading" class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }" role="status" aria-busy="true" aria-label="Cargando instaladas">
      <div v-for="n in 9" :key="n" class="card card--ghost">
        <q-skeleton class="card__img" animation="pulse" square />
        <q-skeleton class="card__name-sk" animation="pulse" type="text" />
      </div>
    </div>
    <div v-else-if="!rows.length" class="empty" role="status">
      <q-icon name="inventory_2" size="40px" aria-hidden="true" />
      <b>{{ hasFilters ? 'Sin resultados' : 'Nada instalado en el inventario revisado' }}</b>
      <a v-if="fighter" class="explore-link" :href="'#/catalogo?pj=' + encodeURIComponent(fighter.code)">Explorar catálogo de {{ fighter.name }}</a>
    </div>
    <template v-else>
      <div class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }">
        <div v-for="row in rows" :key="row.key" class="card">
          <a class="card__btn" :href="row.href" :aria-label="row.label" :data-keep="row.key">
            <span class="card__img">
              <AppImg :src="row.img" fit="contain" />
            </span>
            <span class="card__name">{{ row.title }}</span>
            <span class="card__sub">{{ row.sub }}</span>
          </a>
        </div>
      </div>
      <a v-if="fighter" class="explore-link" :href="'#/catalogo?pj=' + encodeURIComponent(fighter.code)">Explorar catálogo de {{ fighter.name }}</a>
    </template>

    <FighterPickSheet
      :open="open"
      :rows="picker"
      :selected="fighterCode"
      :total="pickerTotal"
      empty-label="Sin instaladas"
      @close="hide()"
      @pick="choose"
    />
  </q-page>
</template>
