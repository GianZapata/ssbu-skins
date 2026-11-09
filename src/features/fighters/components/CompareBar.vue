<script setup lang="ts">
import { QBtn } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import type { Cell, StagePreview } from '../../../pages/composables/useFighterPage'
import type { StageChoice } from '../../../shared/helpers/ssbu'

interface CompareBarProps {
  stage: Cell
  preview: StagePreview | null
  choice: StageChoice
}

interface CompareBarEmits {
  act: []
}

const props = defineProps<CompareBarProps>()
const emit = defineEmits<CompareBarEmits>()
</script>

<template>
  <div class="cbar" role="group" :aria-label="'Comparación del ' + trajeName(props.stage.n)">
    <span class="cbar__img"><AppImg :src="props.stage.current.img" fit="contain" :missing="props.stage.current.img ? '' : 'Sin retrato'" /></span>
    <span class="cbar__arrow" aria-hidden="true">→</span>
    <span class="cbar__img cbar__img--new"><AppImg :src="props.preview ? props.preview.img : null" fit="contain" :missing="props.preview && props.preview.img ? '' : 'Sin retrato'" /></span>
    <span class="cbar__txt">
      <b>{{ trajeName(props.stage.n) }}</b>
      <span>{{ props.preview ? props.preview.name : 'Elige una skin' }}</span>
    </span>
    <q-btn
      v-if="props.choice.kind !== 'none'"
      unelevated
      no-caps
      class="btn-main cbar__act"
      :label="props.choice.label"
      :data-bar-act="props.choice.kind"
      @click="emit('act')"
    />
  </div>
</template>
