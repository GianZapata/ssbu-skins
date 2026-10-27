<script setup lang="ts">
import FaceImg from './FaceImg.vue'
import { useCatalogPage } from '../../../pages/composables/useCatalogPage'

interface CatalogGridProps {
  embedded?: boolean
}

const props = defineProps<CatalogGridProps>()
const { view, S, search, pickFighter, chooseSkin, clearFilters, showFilters, smallSrc, pillsOf, detailHref, trajeName, more } = useCatalogPage()
</script>

<template>
  <div>
    <input id="cq" :value="view.st.q" type="search" placeholder="Buscar skin" aria-label="Buscar skin" autocomplete="off" @input="search">
    <select v-if="!props.embedded" id="cf" :value="view.st.f" aria-label="Luchador" @change="pickFighter">
      <option value="">Todos los luchadores</option>
      <option v-for="fighter in view.fighters" :key="fighter.code" :value="fighter.code">{{ fighter.name }}</option>
    </select>
    <div class="row q-gutter-sm q-mt-sm">
      <button type="button" class="btn" data-filters="1" aria-haspopup="dialog" @click="showFilters">Filtros</button>
      <button v-if="view.filtersOn" type="button" class="btn" data-clear-filters="1" @click="clearFilters">Limpiar filtros</button>
    </div>
    <p>{{ view.total }} {{ view.total === 1 ? 'skin' : 'skins' }}</p>
    <div id="cg" class="cgrid">
      <article v-for="row in view.scoped ? view.rows : []" :key="row.p.vid" :class="['cd', { on: S.cand === row.p.vid }]" :data-vid="row.p.vid">
        <button type="button" class="skin" :data-skin="row.p.vid" :aria-pressed="S.cand === row.p.vid" :aria-label="row.p.name + ', usar en ' + trajeName(view.slot)" @click="chooseSkin(row.p.vid)">
          <FaceImg :src="smallSrc(row.p) || row.p.img" :alt="row.p.name" />
          <span class="nm">{{ row.p.name }}</span>
        </button>
        <a class="mas" :href="detailHref(row.f.code, row.p.vid, view.slot)" :aria-label="'Ver detalle de ' + row.p.name">
          <svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
        </a>
        <span v-if="row.p.withdrawn" class="pill">Retirada</span>
      </article>
      <a v-for="row in view.scoped ? [] : view.rows" :key="row.p.vid" class="cd" :data-vid="row.p.vid" :href="'#/apariencia/' + encodeURIComponent(row.p.vid)" :aria-label="row.p.name + ', ' + row.f.name">
        <FaceImg :src="row.p.img" :alt="row.p.name" />
        <span class="tx"><span class="nm">{{ row.p.name }}</span><span>{{ row.f.name }}</span></span>
        <span class="pl">
          <span class="pill">{{ pillsOf(row.p).online }}</span>
          <span v-if="pillsOf(row.p).recommended" class="pill">Recomendada</span>
          <span v-if="row.p.withdrawn" class="pill">Retirada</span>
        </span>
      </a>
    </div>
    <button v-if="!view.scoped && view.rows.length < view.total" id="cm" type="button" class="btn" @click="more">Cargar más skins</button>
    <div v-if="!view.total" class="empty">
      <b>{{ view.scoped ? 'Sin skins por ahora' : 'Sin resultados' }}</b>
      <button v-if="view.filtersOn" type="button" class="btn p" data-clear-filters="1" @click="clearFilters">Limpiar filtros</button>
    </div>
  </div>
</template>
