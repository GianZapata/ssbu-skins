<script setup lang="ts">
import { QBtn, QDialog, QIcon, QInput } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { useFighterPickSheet, type PickerFighter } from '../composables/useFighterPickSheet'

interface FighterPickSheetProps {
  open: boolean
  rows: PickerFighter[]
  selected: string
  total: number
  emptyLabel: string
}

interface FighterPickSheetEmits {
  close: []
  pick: [code: string]
}

const props = defineProps<FighterPickSheetProps>()
const emit = defineEmits<FighterPickSheetEmits>()

const { query, rows } = useFighterPickSheet(props)
</script>

<template>
  <q-dialog
    :model-value="props.open"
    position="bottom"
    full-width
    transition-show="slide-up"
    transition-hide="slide-down"
    :transition-duration="320"
    class="sheet-dialog"
    @update:model-value="(v: boolean) => { if (!v) emit('close') }"
  >
    <div class="sheet" role="dialog" aria-label="Personaje">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head">
        <h2 class="sheet__h">Personaje</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>
      <div class="sheet__body">
        <div class="sheet__search">
          <q-input v-model="query" class="search" outlined type="search" placeholder="Buscar personaje" aria-label="Buscar personaje" autocomplete="off">
            <template #prepend><q-icon name="search" aria-hidden="true" /></template>
          </q-input>
        </div>
        <button type="button" class="pick-all" :aria-pressed="!props.selected" @click="emit('pick', '')">
          <span>Todos los personajes</span>
          <b>{{ props.total }}</b>
        </button>
        <div class="fgrid pick-grid">
          <button
            v-for="row in rows"
            :key="row.code"
            type="button"
            class="ft"
            :class="{ 'ft--empty': row.count === 0 }"
            :aria-pressed="row.code === props.selected"
            :aria-label="row.name + ', ' + row.count"
            :data-fighter="row.code"
            @click="emit('pick', row.code)"
          >
            <span class="ft__img">
              <AppImg v-if="row.portrait" :src="row.portrait" fit="contain" />
              <span v-else class="ft__ph" aria-hidden="true"><span>{{ row.name.slice(0, 1) }}</span></span>
              <span class="ft__badge" aria-hidden="true">{{ row.count }}</span>
            </span>
            <span class="ft__name">{{ row.name }}</span>
            <span v-if="row.count === 0" class="pick-empty">{{ props.emptyLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>
