<script setup lang="ts">
import { QBtn, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import type { Cell } from '../../../pages/composables/useFighterPage'

interface CompareCardsProps {
  stage: Cell | null
  hasSkins: boolean
}

const props = defineProps<CompareCardsProps>()
const emit = defineEmits<{ (e: 'detail'): void, (e: 'clear', n: number): void }>()
</script>

<template>
  <section v-if="props.stage" class="cmp" aria-label="Actual y nueva">
    <div class="cmp__col">
      <div class="cmp__label">Actual</div>
      <div class="cmp__frame">
        <div class="cmp__img cmp__img--cur">
          <AppImg :src="props.stage.current.img" :alt="'Skin actual' + (props.stage.current.name ? ': ' + props.stage.current.name : '')" eager />
        </div>
        <span class="cmp__arrow" :class="{ 'cmp__arrow--on': !!props.stage.next }">
          <q-icon name="east" size="18px" :aria-label="props.stage.next ? 'cambia a' : undefined" :aria-hidden="props.stage.next ? undefined : 'true'" />
        </span>
      </div>
      <div class="cmp__name cmp__name--cur">{{ props.stage.current.name || ' ' }}</div>
    </div>

    <div class="cmp__col">
      <div class="cmp__label cmp__label--new">Nueva</div>
      <Transition name="swap" mode="out-in">
        <button
          v-if="props.stage.next"
          :key="props.stage.next.vid"
          type="button"
          class="cmp__img cmp__img--new"
          :aria-label="'Ver detalle de ' + props.stage.next.name"
          @click="emit('detail')"
        >
          <AppImg :src="props.stage.next.img" :alt="'Skin nueva: ' + props.stage.next.name" eager />
        </button>
        <div v-else key="empty" class="cmp__img cmp__img--empty" role="img" :aria-label="'Elige una skin para ' + trajeName(props.stage.n)">
          <q-icon name="add_circle_outline" size="64px" aria-hidden="true" />
        </div>
      </Transition>
      <Transition name="swap" mode="out-in">
        <div v-if="props.stage.next" :key="props.stage.next.vid" class="cmp__name">{{ props.stage.next.name }}</div>
        <div v-else key="none" class="cmp__name">&nbsp;</div>
      </Transition>
      <q-btn
        v-if="props.stage.next"
        no-caps
        unelevated
        icon="close"
        label="Quitar"
        class="btn-quiet cmp__remove"
        :aria-label="'Quitar skin de ' + trajeName(props.stage.n)"
        :data-undo="props.stage.n"
        @click="emit('clear', props.stage.n)"
      />
    </div>

  </section>
</template>
