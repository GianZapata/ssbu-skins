<script setup lang="ts">
import { QIcon, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import ExploreBar from '../features/explore/components/ExploreBar.vue'
import FighterPickSheet from '../features/explore/components/FighterPickSheet.vue'
import { useFighterPick } from '../features/explore/composables/useFighterPick'
import { useGridDensity } from '../features/explore/composables/useGridDensity'
import Destinations from '../features/fighters/components/Destinations.vue'
import { catalogQuery, useCatalogPage } from './composables/useCatalogPage'

const { loading, groups, skins, fighter, fighterCode, countLabel, hasFilters, picker, pickerTotal, viewSkin, selectFighter, clearFilters } = useCatalogPage()
const { compact, toggle } = useGridDensity()
const { open, show, hide } = useFighterPick()

const choose = (code: string) => hide(() => selectFighter(code))
</script>

<template>
  <q-page class="page list-page list-page--catalog">
    <h1 class="sr-only">Catálogo</h1>
    <Destinations />
    <div class="search-row">
      <ExploreBar
        v-model="catalogQuery"
        :loading="loading"
        section="Catálogo"
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

    <div v-if="loading" class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }" role="status" aria-busy="true" aria-label="Catálogo">
      <div v-for="n in 9" :key="n" class="card card--ghost">
        <q-skeleton class="card__img" animation="pulse" square />
        <q-skeleton class="card__name-sk" animation="pulse" type="text" />
      </div>
    </div>
    <div v-else-if="!groups.length && !skins.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>{{ hasFilters ? 'Sin resultados' : 'Sin skins por ahora' }}</b>
      <a v-if="fighter" class="explore-link" :href="'#/instaladas?pj=' + encodeURIComponent(fighter.code)">Ver instaladas de {{ fighter.name }}</a>
    </div>
    <template v-else-if="fighter">
      <div class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }">
        <div v-for="skin in skins" :key="skin.vid" class="card">
          <button type="button" class="card__btn" :aria-label="skin.label" :data-vid="skin.vid" :data-keep="skin.vid" @click="viewSkin(skin.code, skin.vid)">
            <span class="card__img">
              <AppImg :src="skin.img" :srcset="skin.srcset" :sizes="compact ? '33vw' : '50vw'" fit="contain" />
              <span v-if="skin.withdrawn" class="card__where" aria-hidden="true">Retirada</span>
            </span>
            <span class="card__name">{{ skin.name }}</span>
          </button>
        </div>
      </div>
      <a class="explore-link" :href="'#/instaladas?pj=' + encodeURIComponent(fighter.code)">Ver instaladas de {{ fighter.name }}</a>
    </template>
    <div v-else class="groups">
      <section v-for="group in groups" :key="group.id" class="cgroup">
        <button type="button" class="cgroup__head" :aria-label="'Ver solo las skins de ' + group.name + ', ' + group.skins.length" @click="selectFighter(group.id)">
          <span v-if="group.portrait" class="cgroup__face"><AppImg :src="group.portrait" fit="contain" /></span>
          <h2 class="cgroup__name">{{ group.name }}</h2>
          <span class="cgroup__n">{{ group.skins.length }}</span>
        </button>
        <div class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }">
          <div v-for="skin in group.skins" :key="skin.vid" class="card">
            <button type="button" class="card__btn" :aria-label="skin.label" :data-vid="skin.vid" :data-keep="skin.vid" @click="viewSkin(skin.code, skin.vid)">
              <span class="card__img">
                <AppImg :src="skin.img" :srcset="skin.srcset" :sizes="compact ? '33vw' : '50vw'" fit="contain" />
                <span v-if="skin.withdrawn" class="card__where" aria-hidden="true">Retirada</span>
              </span>
              <span class="card__name">{{ skin.name }}</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <FighterPickSheet
      :open="open"
      :rows="picker"
      :selected="fighterCode"
      :total="pickerTotal"
      one="apariencia"
      many="apariencias"
      empty-label="Sin skins"
      @close="hide()"
      @pick="choose"
    />
  </q-page>
</template>
