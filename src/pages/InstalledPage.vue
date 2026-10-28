<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import Destinations from '../features/fighters/components/Destinations.vue'
import { installedQuery, useInstalledPage } from './composables/useInstalledPage'

const { loading, rows } = useInstalledPage()
</script>

<template>
  <q-page class="page list-page">
    <h1 class="sr-only">Instaladas</h1>
    <Destinations />
    <div class="search-row">
      <q-input
        v-model="installedQuery"
        class="search"
        outlined
        type="search"
        placeholder="Buscar luchador o skin"
        aria-label="Buscar luchador o skin"
        autocomplete="off"
        :disable="loading"
      >
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
        <template #append>
          <q-btn v-if="installedQuery" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="installedQuery = ''" />
        </template>
      </q-input>
    </div>

    <div v-if="loading" class="sgrid" role="status" aria-busy="true" aria-label="Cargando instaladas">
      <div v-for="n in 8" :key="n" class="card card--ghost">
        <q-skeleton class="card__img" animation="pulse" square />
        <q-skeleton class="card__name-sk" animation="pulse" type="text" />
      </div>
    </div>
    <div v-else-if="!rows.length" class="empty" role="status">
      <q-icon name="inventory_2" size="40px" aria-hidden="true" />
      <b>{{ installedQuery ? 'Sin resultados' : 'Nada instalado en el inventario revisado' }}</b>
    </div>
    <div v-else class="sgrid">
      <div v-for="row in rows" :key="row.key" class="card">
        <a class="card__btn" :href="row.href" :aria-label="row.label">
          <span class="card__img">
            <AppImg :src="row.img" fit="contain" />
          </span>
          <span class="card__name">{{ row.title }}</span>
          <span class="card__sub">{{ row.sub }}</span>
        </a>
      </div>
    </div>
  </q-page>
</template>
