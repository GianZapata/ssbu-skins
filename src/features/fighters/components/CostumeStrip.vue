<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import AppImg from '../../../components/AppImg.vue'
import { useCostumeStrip } from '../composables/useCostumeStrip'

interface CostumeStripProps {
  fighterCode: string
  activeSlot: number
}

interface CostumeStripEmits {
  selectSlot: [slot: number]
}

const props = defineProps<CostumeStripProps>()
const emit = defineEmits<CostumeStripEmits>()

const {
  cells,
  setButtonRef,
  onCellClick,
  onStripKeydown,
} = useCostumeStrip(props, emit)

const MotionSpan = motion.span
</script>

<template>
  <LayoutGroup id="costume-strip">
    <div class="costume-strip" role="group" aria-label="Trajes del luchador">
      <button
        v-for="cell in cells"
        :key="cell.n"
        :ref="(el) => setButtonRef(cell.n, el)"
        type="button"
        class="costume-cell"
        :class="{
          'costume-cell--active': cell.isActive,
          'costume-cell--own': cell.hasOwnProposal,
          'costume-cell--pulse': cell.isPulsing,
        }"
        :aria-label="cell.ariaLabel"
        :aria-pressed="cell.isActive"
        :data-costume="cell.n"
        @click="onCellClick(cell)"
        @keydown="onStripKeydown($event, cell.n)"
      >
        <MotionSpan
          v-if="cell.isActive"
          layout-id="active-costume-frame"
          class="costume-cell__frame"
          aria-hidden="true"
        />

        <span class="costume-cell__art">
          <AppImg :src="cell.img" :eager="cell.isActive" :missing="cell.img ? '' : 'Sin retrato'" fit="contain" />
          <span class="costume-cell__num" aria-hidden="true">{{ cell.number }}</span>
          <span v-if="cell.hasOwnProposal" class="costume-cell__corner" aria-hidden="true">
            <AppImg :src="cell.ownThumb" :missing="cell.ownThumb ? '' : '★'" fit="cover" />
          </span>
          <span
            v-else-if="cell.hasFriendProposal"
            class="costume-cell__friend-dot"
            data-friend-dot
            aria-hidden="true"
          ></span>
        </span>

        <span
          class="costume-cell__badge"
          :class="{ 'costume-cell__badge--mod': !cell.isOriginal }"
          aria-hidden="true"
        >
          {{ cell.badge }}
        </span>
      </button>
    </div>
  </LayoutGroup>
</template>
