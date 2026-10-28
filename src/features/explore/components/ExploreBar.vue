<script setup lang="ts">
import { QBtn, QIcon, QInput } from 'quasar'
import AppImg from '../../../components/AppImg.vue'

const query = defineModel<string>({ required: true })

interface ExploreBarProps {
  loading: boolean
  fighterName: string
  fighterPortrait: string | null
  filtered: boolean
  countLabel: string
  compact: boolean
}

interface ExploreBarEmits {
  openFighter: []
  toggleDensity: []
  clear: []
}

const props = defineProps<ExploreBarProps>()
const emit = defineEmits<ExploreBarEmits>()
</script>

<template>
  <div class="explore">
    <q-input
      v-model="query"
      class="search"
      outlined
      type="search"
      placeholder="Buscar skin"
      aria-label="Buscar skin"
      autocomplete="off"
      :disable="props.loading"
    >
      <template #prepend><q-icon name="search" aria-hidden="true" /></template>
      <template #append>
        <q-btn v-if="query" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="query = ''" />
      </template>
    </q-input>
    <div class="explore__tools">
      <button
        type="button"
        class="explore__fighter"
        :class="{ 'explore__fighter--on': props.filtered && props.fighterName !== 'Todos los personajes' }"
        data-fighter-pick
        :aria-label="'Personaje: ' + props.fighterName"
        :disabled="props.loading"
        @click="emit('openFighter')"
      >
        <span v-if="props.fighterPortrait" class="explore__face"><AppImg :src="props.fighterPortrait" fit="contain" /></span>
        <q-icon v-else name="groups" size="20px" aria-hidden="true" />
        <span class="explore__who">{{ props.fighterName }}</span>
        <q-icon name="expand_more" size="20px" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="explore__size"
        :aria-pressed="!props.compact"
        :aria-label="props.compact ? 'Vista compacta' : 'Vista ampliada'"
        :disabled="props.loading"
        @click="emit('toggleDensity')"
      >
        <q-icon :name="props.compact ? 'grid_view' : 'view_module'" size="22px" aria-hidden="true" />
        <span class="explore__size-label">{{ props.compact ? 'Compacta' : 'Ampliada' }}</span>
      </button>
    </div>
    <div v-if="props.filtered" class="explore__meta">
      <span aria-live="polite">{{ props.countLabel }}</span>
      <button type="button" class="explore__clear" @click="emit('clear')">Limpiar filtros</button>
    </div>
  </div>
</template>
