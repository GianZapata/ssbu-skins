<script setup lang="ts">
import { computed } from 'vue'
import { QBtn, QIcon, QInput } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { hdrHidden } from '../../../composables/useReveal'

const query = defineModel<string>({ required: true })

interface ExploreBarProps {
  loading: boolean
  section: string
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

const who = computed(() => {
  if (!hdrHidden.value) return props.fighterName

  if (props.filtered && props.fighterName !== 'Todos los personajes') return props.section + ' · ' + props.fighterName

  return props.section
})

const sizeLabel = computed(() => (props.compact ? 'Ampliar' : 'Compactar'))
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
        :aria-label="'Personaje: ' + who"
        :disabled="props.loading"
        @click="emit('openFighter')"
      >
        <span v-if="props.fighterPortrait" class="explore__face"><AppImg :src="props.fighterPortrait" fit="contain" /></span>
        <q-icon v-else name="groups" size="20px" aria-hidden="true" />
        <span class="explore__who">{{ who }}</span>
        <q-icon name="expand_more" size="20px" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="explore__size"
        :aria-label="sizeLabel"
        :disabled="props.loading"
        @click="emit('toggleDensity')"
      >
        <q-icon :name="props.compact ? 'grid_view' : 'view_module'" size="22px" aria-hidden="true" />
        <span class="explore__size-label">{{ sizeLabel }}</span>
      </button>
    </div>
    <div v-if="props.filtered" class="explore__meta">
      <span aria-live="polite">{{ props.countLabel }}</span>
      <button type="button" class="explore__clear" @click="emit('clear')">Limpiar filtros</button>
    </div>
  </div>
</template>
