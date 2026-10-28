<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import Destinations from '../features/fighters/components/Destinations.vue'
import { catalogQuery, useCatalogPage } from './composables/useCatalogPage'

const { loading, groups, groupLabel, groupHint, viewSkin, toggleGroup } = useCatalogPage()
</script>

<template>
  <q-page class="page list-page">
    <h1 class="sr-only">Catálogo</h1>
    <Destinations />
    <div class="search-row search-row--pair">
      <q-input
        v-model="catalogQuery"
        class="search"
        outlined
        type="search"
        placeholder="Buscar skin"
        aria-label="Buscar skin"
        autocomplete="off"
        :disable="loading"
      >
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
        <template #append>
          <q-btn v-if="catalogQuery" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="catalogQuery = ''" />
        </template>
      </q-input>
      <button
        type="button"
        class="group-toggle"
        :aria-label="groupHint"
        :disabled="loading"
        @click="toggleGroup"
      >
        <q-icon name="swap_vert" size="20px" aria-hidden="true" />
        <span>{{ groupLabel }}</span>
      </button>
    </div>

    <div v-if="loading" class="sgrid sgrid--wide" role="status" aria-busy="true" aria-label="Cargando catálogo">
      <div v-for="n in 8" :key="n" class="card card--ghost">
        <q-skeleton class="card__img" animation="pulse" square />
        <q-skeleton class="card__name-sk" animation="pulse" type="text" />
      </div>
    </div>
    <div v-else-if="!groups.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>{{ catalogQuery ? 'Sin resultados' : 'Sin skins por ahora' }}</b>
    </div>
    <div v-else class="groups">
      <section v-for="group in groups" :key="group.id" class="cgroup">
        <header class="cgroup__head">
          <span v-if="group.portrait" class="cgroup__face"><AppImg :src="group.portrait" fit="contain" /></span>
          <h2 class="cgroup__name">{{ group.name }}</h2>
          <span class="cgroup__n">{{ group.skins.length }}</span>
        </header>
        <div class="sgrid sgrid--wide">
          <div v-for="skin in group.skins" :key="skin.vid" class="card">
            <button type="button" class="card__btn" :aria-label="skin.label" :data-vid="skin.vid" @click="viewSkin(skin.code, skin.vid)">
              <span class="card__img">
                <AppImg :src="skin.img" :srcset="skin.srcset" sizes="(min-width: 1024px) 25vw, (min-width: 700px) 33vw, 50vw" fit="contain" />
                <span v-if="skin.withdrawn" class="card__where" aria-hidden="true">Retirada</span>
              </span>
              <span class="card__name">{{ skin.name }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </q-page>
</template>
