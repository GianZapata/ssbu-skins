<script setup lang="ts">
import { QBtn, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import type { Cell } from '../../../pages/composables/useFighterPage'
import type { StageChoice } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'

interface Preview {
  name: string
  img: string | null
  vid: string
}

interface CompareCardsProps {
  stage: Cell | null
  preview: Preview | null
  choice: StageChoice
}

const props = defineProps<CompareCardsProps>()
const emit = defineEmits<{ (e: 'detail'): void, (e: 'act'): void }>()
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
      <div v-else class="cmp__img cmp__img--empty" role="img" :aria-label="'Elige una skin para ' + trajeName(props.stage.n)">
        <q-icon name="add_circle_outline" size="48px" aria-hidden="true" />
      </div>
      <div class="cmp__name">{{ props.preview ? props.preview.name : ' ' }}</div>
    </div>

    <p v-if="props.choice.line" class="cmp__line">{{ props.choice.line }}</p>
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
