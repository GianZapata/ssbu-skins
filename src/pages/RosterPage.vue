<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QSkeleton } from 'quasar'
import Destinations from '../features/fighters/components/Destinations.vue'
import RosterRow from '../features/roster/components/RosterRow.vue'
import { rosterFilter as filter, rosterQuery, useRosterPage } from './composables/useRosterPage'

const {
  compact,
  loading,
  rows,
  countsLabel,
  breakdownLabel,
  filterOn,
  filterChoices,
  emptyLabel,
  filterLabel,
  setFilter,
  clearFilters,
  toggleDensity,
} = useRosterPage()
</script>

<template>
  <q-page class="page fighters-page roster">
    <h1 class="sr-only">Luchadores</h1>
    <Destinations />

    <div class="search-row roster-tools">
      <q-input
        v-model="rosterQuery"
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
          <q-btn v-if="rosterQuery" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="rosterQuery = ''" />
        </template>
      </q-input>
      <div class="roster-filters" role="group" aria-label="Filtros">
        <button
          v-for="choice in filterChoices"
          :key="choice"
          type="button"
          class="chip"
          :aria-pressed="filter === choice"
          @click="setFilter(choice)"
        >
          {{ filterLabel(choice) }}
        </button>
      </div>
      <button type="button" class="explore__size" :aria-label="compact ? 'Trajes grandes' : 'Compactar'" :aria-pressed="!compact" :disabled="loading" @click="toggleDensity">
        <q-icon :name="compact ? 'grid_view' : 'view_module'" size="22px" aria-hidden="true" />
        <span class="explore__size-label">{{ compact ? 'Trajes grandes' : 'Compactar' }}</span>
      </button>
    </div>

    <details v-if="!loading" class="roster-counts">
      <summary aria-live="polite">{{ countsLabel }}</summary>
      <p>{{ breakdownLabel }}</p>
    </details>

    <div v-if="loading" class="roster-skel" role="status" aria-busy="true" aria-label="Luchadores">
      <span class="sr-only">Luchadores</span>
      <q-skeleton v-for="n in 6" :key="n" class="roster-skel__row" animation="pulse" square />
    </div>

    <div v-else-if="!rows.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>{{ emptyLabel }}</b>
      <q-btn v-if="filterOn" no-caps unelevated class="btn-quiet" label="Quitar filtros" @click="clearFilters" />
    </div>

    <div v-else class="roster-list">
      <RosterRow v-for="row in rows" :key="row.fighter.code" :row="row" :compact="compact" />
    </div>
  </q-page>
</template>
