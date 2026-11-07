<script setup lang="ts">
import AppImg from '../../../components/AppImg.vue'
import { useActiveCostumeBar } from '../composables/useActiveCostumeBar'

interface ActiveCostumeBarProps {
  fighterCode: string
  activeSlot: number
}

const props = defineProps<ActiveCostumeBarProps>()

const {
  slotLabel,
  installedName,
  installedImg,
  ownProposalName,
  moveCandidateVid,
  zoomCurrent,
  openMoveColor,
  clearOwn,
} = useActiveCostumeBar(props)
</script>

<template>
  <div class="active-bar" data-active-costume>
    <button
      type="button"
      class="active-bar__preview"
      :aria-label="'Ampliar imagen de ' + slotLabel + ', ' + installedName"
      @click="zoomCurrent"
    >
      <span class="active-bar__thumb">
        <AppImg :src="installedImg" :eager="true" :missing="installedImg ? '' : 'Sin retrato'" fit="contain" />
      </span>
      <span class="active-bar__txt">
        <span class="active-bar__slot">{{ slotLabel }}</span>
        <span class="active-bar__sep" aria-hidden="true">·</span>
        <span class="active-bar__name">{{ installedName }}</span>
        <span v-if="ownProposalName" class="active-bar__own">→ {{ ownProposalName }}</span>
      </span>
    </button>

    <div class="active-bar__actions">
      <button
        v-if="moveCandidateVid"
        type="button"
        class="chip active-bar__btn"
        data-move-color
        @click="openMoveColor"
      >
        Otro color
      </button>
      <button
        v-if="ownProposalName"
        type="button"
        class="chip active-bar__btn active-bar__btn--clear"
        data-act="clear"
        :aria-label="'Quitar tu propuesta de ' + slotLabel"
        @click="clearOwn"
      >
        Quitar
      </button>
    </div>
  </div>
</template>
