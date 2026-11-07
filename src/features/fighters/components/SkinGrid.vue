<script setup lang="ts">
import { QBtn, QIcon, QInput } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { S } from '../../../composables/useApp'
import { trajeName } from '../../../shared/helpers/text'
import { useGridDensity } from '../../explore/composables/useGridDensity'

interface SkinRow {
  vid: string
  name: string
  img: string | null
  chosen: boolean
  other: number | null
  label: string
  detail: string
  tag: string
}

interface SkinGridProps {
  rows: SkinRow[]
  total: number
  onlyDownloaded: boolean
}

interface SkinGridEmits {
  pick: [vid: string]
  detail: [vid: string]
  toggleDownloaded: []
}

const props = defineProps<SkinGridProps>()
const emit = defineEmits<SkinGridEmits>()

const { compact, toggle } = useGridDensity()
</script>

<template>
  <section class="skins" aria-label="Skins">
    <div v-if="props.total === 0" class="empty" role="status">
      <q-icon name="inventory_2" size="40px" aria-hidden="true" />
      <b>Sin skins por ahora</b>
    </div>

    <template v-else>
      <div class="skins__tools">
        <q-input
          v-model="S.tc.q"
          class="search"
          outlined
          type="search"
          placeholder="Buscar skin"
          aria-label="Buscar skin"
          id="skin-search"
          autocomplete="off"
        >
          <template #prepend><q-icon name="search" aria-hidden="true" /></template>
          <template #append>
            <q-btn v-if="S.tc.q" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="S.tc.q = ''" />
          </template>
        </q-input>
        <button type="button" class="chip" :aria-pressed="props.onlyDownloaded" @click="emit('toggleDownloaded')">Descargadas</button>
        <button
          type="button"
          class="explore__size"
          :aria-label="compact ? 'Skins grandes' : 'Compactar'"
          :aria-pressed="!compact"
          @click="toggle"
        >
          <q-icon :name="compact ? 'grid_view' : 'view_module'" size="22px" aria-hidden="true" />
          <span class="explore__size-label">{{ compact ? 'Skins grandes' : 'Compactar' }}</span>
        </button>
      </div>

      <div v-if="!props.rows.length" class="empty" role="status">
        <q-icon name="search_off" size="40px" aria-hidden="true" />
        <b>Sin resultados</b>
      </div>

      <div v-else class="sgrid" :class="{ 'sgrid--compact': compact, 'sgrid--large': !compact }">
        <div v-for="(row, index) in props.rows" :key="row.vid" class="card" :class="{ 'card--on': row.chosen }">
          <button type="button" class="card__btn" :aria-label="row.label" :aria-pressed="row.chosen" :data-skin="row.vid" :data-vid="row.vid" :data-keep="row.vid" @click="emit('pick', row.vid)">
            <span class="card__img">
              <AppImg :src="row.img" :eager="index < 4" :missing="row.img ? '' : 'Sin retrato'" fit="cover" />
              <span v-if="row.chosen" class="card__check" aria-hidden="true"><q-icon name="check" size="18px" /></span>
              <span v-else-if="row.other !== null" class="card__where" aria-hidden="true">{{ trajeName(row.other) }}</span>
            </span>
            <span class="card__name">{{ row.name }}</span>
            <span v-if="row.tag" class="card__tag">{{ row.tag }}</span>
          </button>
          <q-btn flat round padding="0" class="card__more" :aria-label="row.detail" @click="emit('detail', row.vid)">
            <span class="card__more-dot"><q-icon name="zoom_in" size="18px" aria-hidden="true" /></span>
          </q-btn>
        </div>
      </div>
    </template>
  </section>
</template>
