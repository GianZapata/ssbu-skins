<script setup lang="ts">
import { QBtn, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { ProposalState } from '../../roster/enums/ProposalState'
import { trajeName } from '../../../shared/helpers/text'
import type { Cell } from '../../../pages/composables/useFighterPage'
import { PulseKind } from '../enums/PulseKind'

interface CostumeGridProps {
  cells: Cell[]
  pulse: Record<number, PulseKind>
  /** Con un traje abierto la cuadrícula se vuelve más pequeña y deja ver la comparación. */
  compact: boolean
}

interface CostumeGridEmits {
  select: [n: number]
  clear: [n: number]
  zoom: [n: number]
}

const props = defineProps<CostumeGridProps>()
const emit = defineEmits<CostumeGridEmits>()

const columnsOf = (items: HTMLElement[]) => {
  const top = Math.round(items[0].getBoundingClientRect().top)

  return items.filter((item) => Math.round(item.getBoundingClientRect().top) === top).length
}

const onKeys = (event: KeyboardEvent) => {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return

  const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.cell__btn')]
  const index = items.indexOf(document.activeElement as HTMLElement)

  if (index < 0) return

  event.preventDefault()

  const columns = columnsOf(items)

  let next = index

  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else if (event.key === 'ArrowRight') next = Math.min(items.length - 1, index + 1)
  else if (event.key === 'ArrowLeft') next = Math.max(0, index - 1)
  else if (event.key === 'ArrowDown') next = Math.min(items.length - 1, index + columns)
  else next = Math.max(0, index - columns)

  items[next].focus()
}
</script>

<template>
  <div class="cgrid" :class="{ 'cgrid--compact': props.compact }" role="group" aria-label="Trajes" @keydown="onKeys">
    <div
      v-for="cell in props.cells"
      :key="cell.n"
      class="cell"
      :class="[
        'cell--' + cell.layer,
        {
          'cell--sel': cell.sel,
          'cell--prop': cell.proposal !== ProposalState.None,
          'cell--pulse': props.pulse[cell.n] === PulseKind.Local,
          'cell--live': props.pulse[cell.n] === PulseKind.Live,
        },
      ]"
    >
      <button type="button" class="cell__btn" :aria-label="cell.label" :aria-pressed="cell.sel" :data-slot="cell.n" @click="emit('select', cell.n)">
        <span class="cell__img">
          <AppImg :src="cell.current.img" fit="contain" :missing="cell.current.img ? '' : 'Sin retrato'" eager />
          <span v-if="cell.sel" class="cell__check" aria-hidden="true"><q-icon name="check" size="16px" /></span>
        </span>
        <span class="cell__txt">
          <b>{{ trajeName(cell.n) }}</b>
          <span class="cell__name">{{ cell.current.name || 'Sin nombre' }}</span>
          <em class="cell__layer">{{ cell.layerLabel }}</em>
        </span>
        <span v-if="cell.proposalLabel" class="cell__tag" :data-state="cell.proposal">{{ cell.proposalLabel }}</span>
        <span v-else-if="cell.next" class="cell__tag cell__tag--plan">Plan de Gian</span>
      </button>
      <q-btn
        v-if="cell.current.img"
        flat
        round
        padding="0"
        class="cell__zoom"
        :aria-label="'Ampliar imagen de ' + cell.label"
        :data-zoom-cell="cell.n"
        @click.stop="emit('zoom', cell.n)"
      >
        <span class="cell__zoom-dot"><q-icon name="zoom_in" size="18px" aria-hidden="true" /></span>
      </q-btn>
      <q-btn
        v-if="cell.proposal !== ProposalState.None"
        flat
        round
        padding="0"
        class="cell__x"
        :aria-label="cell.quitar"
        :data-undo-cell="cell.n"
        @click.stop="emit('clear', cell.n)"
      >
        <span class="cell__x-dot"><q-icon name="close" size="13px" aria-hidden="true" /></span>
      </q-btn>
    </div>
  </div>
</template>
