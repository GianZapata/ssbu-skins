<script setup lang="ts">
import { QBtn, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import { useSaveStatus } from '../../plan/saveStatus'
import { PreviewSource } from '../enums/PreviewSource'
import type { Cell, StagePreview } from '../../../pages/composables/useFighterPage'
import type { StageChoice } from '../../../shared/helpers/ssbu'

interface CompareCardsProps {
  stage: Cell | null
  preview: StagePreview | null
  choice: StageChoice
  place: string
}

interface CompareCardsEmits {
  zoomCurrent: []
  zoomNew: []
  act: []
  find: []
  discard: []
  step: [delta: number]
}

const props = defineProps<CompareCardsProps>()
const emit = defineEmits<CompareCardsEmits>()

const { saving, saved, savedHere } = useSaveStatus()
</script>

<template>
  <section v-if="props.stage" class="cmp" aria-label="Actual y nueva">
    <div class="cmp__nav" role="group" aria-label="Cambiar de traje">
      <q-btn flat round padding="0" class="cmp__step" icon="chevron_left" aria-label="Traje anterior" :disable="props.stage.n === 0" @click="emit('step', -1)" />
      <span class="cmp__where">{{ trajeName(props.stage.n) }} de 8</span>
      <q-btn flat round padding="0" class="cmp__step" icon="chevron_right" aria-label="Traje siguiente" :disable="props.stage.n === 7" @click="emit('step', 1)" />
    </div>

    <div class="cmp__col">
      <div class="cmp__label">Actual</div>
      <div class="cmp__img cmp__img--cur">
        <AppImg :src="props.stage.current.img" :alt="'Skin actual' + (props.stage.current.name ? ': ' + props.stage.current.name : '')" :missing="props.stage.current.img ? '' : 'Sin retrato'" fit="contain" eager />
        <q-btn v-if="props.stage.current.img" flat round padding="0" class="cmp__zoom" :aria-label="'Ampliar imagen de ' + (props.stage.current.name || 'la skin actual')" @click="emit('zoomCurrent')">
          <span class="cmp__zoom-dot"><q-icon name="zoom_in" size="18px" aria-hidden="true" /></span>
        </q-btn>
      </div>
      <div class="cmp__name cmp__name--cur">{{ props.stage.current.name || ' ' }}</div>
      <div class="cmp__sub">{{ props.stage.layerLabel }}</div>
    </div>

    <div class="cmp__col">
      <div class="cmp__label cmp__label--new">Nueva</div>
      <div v-if="props.preview" class="cmp__img cmp__img--new">
        <AppImg :src="props.preview.img" :alt="'Skin nueva: ' + props.preview.name" :missing="props.preview.img ? '' : 'Sin retrato'" fit="contain" eager />
        <q-btn flat round padding="0" class="cmp__zoom" :aria-label="'Ampliar imagen de ' + props.preview.name" @click="emit('zoomNew')">
          <span class="cmp__zoom-dot"><q-icon name="zoom_in" size="18px" aria-hidden="true" /></span>
        </q-btn>
      </div>
      <button
        v-else
        type="button"
        class="cmp__img cmp__img--empty"
        @click="emit('find')"
      >
        Elegir skin
      </button>
      <div class="cmp__name">{{ props.preview ? props.preview.name : ' ' }}</div>
      <div class="cmp__sub">
        <template v-if="props.preview && props.preview.source === PreviewSource.Proposal">Propuesta</template>
        <template v-else-if="props.preview && props.preview.source === PreviewSource.Plan">Plan de Gian</template>
        <template v-else-if="props.preview">Sin guardar</template>
        <template v-else>&nbsp;</template>
      </div>
    </div>

    <p v-if="props.preview && (props.preview.author || props.preview.url)" class="cmp__meta">
      <span v-if="props.preview.author">{{ props.preview.author }}</span>
      <a v-if="props.preview.url" :href="props.preview.url" target="_blank" rel="noopener noreferrer" aria-label="Ver página del mod, se abre en una pestaña nueva">
        Ver página del mod<q-icon name="open_in_new" size="14px" aria-hidden="true" />
      </a>
    </p>
    <p v-if="props.choice.line" class="cmp__line">{{ props.choice.line }}</p>
    <p v-if="props.place && props.choice.kind !== 'none'" class="cmp__place">{{ props.place }}</p>
    <p v-if="saving" class="cmp__line" role="status">Guardando…</p>
    <p v-else-if="saved" class="cmp__line" role="status">Propuesta guardada</p>
    <p v-else-if="savedHere" class="cmp__line" role="status">Guardada en este dispositivo, sin enviar</p>
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
    <q-btn
      v-if="props.preview && props.preview.source === PreviewSource.Candidate"
      flat
      no-caps
      class="cmp__discard"
      label="Descartar skin"
      @click="emit('discard')"
    />
  </section>

  <section v-else class="cmp cmp--idle" aria-label="Actual y nueva">
    <p class="cmp__idle">Elige un traje para compararlo con otra skin.</p>
  </section>
</template>
