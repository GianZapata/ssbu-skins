<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QPageSticky, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import { fighterQuery, useFightersPage } from './composables/useFightersPage'

const { loading, rows, picked, openSummary } = useFightersPage()
</script>

<template>
  <q-page class="page fighters-page">
    <h1 class="sr-only">Luchadores</h1>
    <div class="search-row">
      <q-input
        v-model="fighterQuery"
        class="search"
        outlined
        type="search"
        placeholder="Buscar luchador"
        aria-label="Buscar luchador"
        autocomplete="off"
        :disable="loading"
      >
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
        <template #append>
          <q-btn v-if="fighterQuery" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="fighterQuery = ''" />
        </template>
      </q-input>
    </div>

    <div v-if="loading" class="fgrid" role="status" aria-busy="true" aria-label="Cargando luchadores">
      <div v-for="n in 18" :key="n" class="ft ft--ghost">
        <q-skeleton class="ft__img" animation="pulse" square />
        <q-skeleton class="ft__name-sk" animation="pulse" type="text" />
      </div>
    </div>

    <div v-else-if="!rows.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>Sin resultados</b>
    </div>

    <div v-else class="fgrid">
      <a v-for="row in rows" :key="row.fighter.code" class="ft" :href="row.href" :aria-label="row.label" :data-fighter="row.fighter.code">
        <span class="ft__img">
          <AppImg v-if="row.fighter.portrait" :src="row.fighter.portrait" fit="contain" eager />
          <span v-else class="ft__ph" aria-hidden="true"><span>{{ row.initial }}</span></span>
          <span v-if="row.count" class="ft__badge" aria-hidden="true">{{ row.count }}</span>
        </span>
        <span class="ft__name">{{ row.fighter.name }}</span>
      </a>
    </div>

    <q-page-sticky v-if="picked.total > 0" position="bottom" expand :offset="[0, 0]" class="picked-wrap">
      <div class="picked-fade" aria-hidden="true"></div>
      <q-btn
        unelevated
        no-caps
        padding="0 12px 0 14px"
        class="picked"
        :aria-label="'Ver skins elegidas, ' + picked.total"
        @click="openSummary"
      >
        <span class="picked__thumbs" aria-hidden="true">
          <span v-for="(src, i) in picked.thumbs" :key="i" class="picked__thumb"><AppImg :src="src" eager /></span>
        </span>
        <span class="picked__txt">Elegidas</span>
        <span class="picked__n" aria-hidden="true">{{ picked.total }}</span>
        <q-icon name="expand_less" size="22px" class="picked__chev" aria-hidden="true" />
      </q-btn>
    </q-page-sticky>
  </q-page>
</template>
