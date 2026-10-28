<script setup lang="ts">
import { QBtn } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { useSaveStatus } from '../../plan/saveStatus'
import type { Cell } from '../../../pages/composables/useFighterPage'
import type { StageChoice } from '../../../shared/helpers/ssbu'

interface Preview {
  name: string
  img: string | null
  vid: string
}

interface CompareCardsProps {
  stage: Cell | null
  preview: Preview | null
  choice: StageChoice
  place: string
  hint: string
}

interface CompareCardsEmits {
  detail: []
  act: []
  find: []
}

const props = defineProps<CompareCardsProps>()
const emit = defineEmits<CompareCardsEmits>()

const { saving, saved, savedHere } = useSaveStatus()
</script>

<template>
  <section v-if="props.stage" class="cmp" aria-label="Actual y nueva">
    <div class="cmp__col">
      <div class="cmp__label">Actual</div>
      <div class="cmp__img cmp__img--cur">
        <AppImg :src="props.stage.current.img" :alt="'Skin actual' + (props.stage.current.name ? ': ' + props.stage.current.name : '')" fit="contain" eager />
      </div>
      <div class="cmp__name cmp__name--cur">{{ props.stage.current.name || ' ' }}</div>
    </div>

    <div class="cmp__col">
      <div class="cmp__label cmp__label--new">Nueva</div>
      <button
        v-if="props.preview"
        type="button"
        class="cmp__img cmp__img--new"
        :aria-label="'Ver detalle de ' + props.preview.name"
        @click="emit('detail')"
      >
        <AppImg :src="props.preview.img" :alt="'Skin nueva: ' + props.preview.name" fit="contain" eager />
      </button>
      <button
        v-else
        type="button"
        class="cmp__img cmp__img--empty"
        @click="emit('find')"
      >
        Elegir skin
      </button>
      <div class="cmp__name">{{ props.preview ? props.preview.name : ' ' }}</div>
    </div>

    <p v-if="props.hint" class="cmp__line">{{ props.hint }}</p>
    <p v-if="props.choice.line" class="cmp__line">{{ props.choice.line }}</p>
    <p v-if="props.place && props.choice.kind !== 'none'" class="cmp__place">{{ props.place }}</p>
    <p v-if="saving" class="cmp__line" role="status">Guardando…</p>
    <p v-else-if="saved" class="cmp__line" role="status">Elección guardada</p>
    <p v-else-if="savedHere" class="cmp__line" role="status">Guardada en este dispositivo</p>
    <q-btn
      v-if="props.choice.kind !== 'none'"
      unelevated
      no-caps
      class="btn-main cmp__act"
      :label="props.choice.label"
      :data-act="props.choice.kind"
      :data-goto-slot="props.choice.other === null ? undefined : props.choice.other"
      @click="emit('act')"
    />
  </section>
</template>
