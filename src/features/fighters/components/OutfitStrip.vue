<script setup lang="ts">
import { QBtn, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import type { Cell } from '../../../pages/composables/useFighterPage'

interface OutfitStripProps {
  cells: Cell[]
  pulse: Record<number, 'local' | 'live'>
  /** Con la cabecera oculta al hacer scroll, la tira sube hasta el borde. */
  top: boolean
}

const props = defineProps<OutfitStripProps>()
const emit = defineEmits<{ (e: 'select', n: number): void, (e: 'clear', n: number): void }>()

const onKeys = (event: KeyboardEvent) => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.cell__btn')]
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (index < 0) return
  event.preventDefault()
  let next = index
  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else if (event.key === 'ArrowRight') next = Math.min(items.length - 1, index + 1)
  else next = Math.max(0, index - 1)
  items[next].focus()
}
</script>

<template>
  <div class="strip" :class="{ 'strip--top': props.top }">
    <div class="strip__row" role="group" aria-label="Trajes" @keydown="onKeys">
      <div
        v-for="cell in props.cells"
        :key="cell.n"
        class="cell"
        :class="{ 'cell--sel': cell.sel, 'cell--pulse': props.pulse[cell.n] === 'local', 'cell--live': props.pulse[cell.n] === 'live' }"
      >
        <button type="button" class="cell__btn" :aria-label="cell.label" :aria-pressed="cell.sel" :data-slot="cell.n" @click="emit('select', cell.n)">
          <template v-if="!cell.next">
            <AppImg :src="cell.current.img" eager class="cell__img" />
          </template>
          <template v-else>
            <AppImg :src="cell.current.img" eager class="cell__img cell__img--cur" />
            <AppImg :src="cell.next.img" eager class="cell__img cell__img--new" />
            <span class="cell__arrow" aria-hidden="true"><q-icon name="east" size="14px" /></span>
          </template>
          <span class="cell__tag">{{ trajeName(cell.n) }}</span>
        </button>
        <q-btn
          v-if="cell.next"
          flat
          round
          padding="0"
          class="cell__x"
          :aria-label="cell.quitar"
          :data-undo="cell.n"
          @click.stop="emit('clear', cell.n)"
        >
          <span class="cell__x-dot"><q-icon name="close" size="13px" aria-hidden="true" /></span>
        </q-btn>
      </div>
    </div>
    <div class="strip__fade" aria-hidden="true"></div>
  </div>
</template>
