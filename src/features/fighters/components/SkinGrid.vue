<script setup lang="ts">
import { QBtn, QIcon, QInput } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { S } from '../../../composables/useApp'
import { trajeName } from '../../../shared/helpers/text'

interface SkinRow {
  vid: string
  name: string
  img: string | null
  chosen: boolean
  other: number | null
  label: string
  detail: string
}

interface SkinGridProps {
  rows: SkinRow[]
  total: number
}

const props = defineProps<SkinGridProps>()
const emit = defineEmits<{ (e: 'pick', vid: string): void, (e: 'detail', vid: string): void }>()
</script>

<template>
  <section class="skins" aria-label="Skins">
    <div v-if="props.total === 0" class="empty" role="status">
      <q-icon name="inventory_2" size="40px" aria-hidden="true" />
      <b>Sin skins por ahora</b>
    </div>

    <template v-else>
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

      <div v-if="!props.rows.length" class="empty" role="status">
        <q-icon name="search_off" size="40px" aria-hidden="true" />
        <b>Sin resultados</b>
      </div>

      <div v-else class="sgrid">
        <div v-for="row in props.rows" :key="row.vid" class="card" :class="{ 'card--on': row.chosen }">
          <button type="button" class="card__btn" :aria-label="row.label" :aria-pressed="row.chosen" :data-skin="row.vid" :data-vid="row.vid" @click="emit('pick', row.vid)">
            <span class="card__img">
              <AppImg :src="row.img" fit="contain" />
              <span v-if="row.chosen" class="card__check" aria-hidden="true"><q-icon name="check" size="18px" /></span>
              <span v-else-if="row.other !== null" class="card__where" aria-hidden="true">{{ trajeName(row.other) }}</span>
            </span>
            <span class="card__name">{{ row.name }}</span>
          </button>
          <q-btn flat round padding="0" class="card__more" :aria-label="row.detail" @click="emit('detail', row.vid)">
            <span class="card__more-dot"><q-icon name="open_in_full" size="16px" aria-hidden="true" /></span>
          </q-btn>
        </div>
      </div>
    </template>
  </section>
</template>
