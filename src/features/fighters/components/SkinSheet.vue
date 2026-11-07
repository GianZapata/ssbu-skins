<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import {
  DrawerClose,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'

import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import { useSkinSheet } from '../composables/useSkinSheet'
import { SkinActionKind } from '../enums/SkinActionKind'

interface SkinSheetProps {
  fighterCode: string
  activeSlot: number
  candidateVid: string
}

interface SkinSheetEmits {
  close: []
}

const props = defineProps<SkinSheetProps>()
const emit = defineEmits<SkinSheetEmits>()

const {
  desktop,
  skin,
  isOpen,
  candidateImage,
  authorLabel,
  variantOptions,
  destinationChips,
  hasIncompatibleSlots,
  targetSlot,
  targetCurrentName,
  targetCurrentImg,
  friendProposalsOnTarget,
  externalModUrl,
  actionState,
  chooseVariant,
  chooseDestination,
  zoomCandidate,
  zoomTargetCurrent,
  runPrimaryAction,
  onDrawerOpenChange,
} = useSkinSheet(props, emit)

const MotionSpan = motion.span
</script>

<template>
  <aside v-if="desktop" class="skin-panel" aria-label="Vista previa y propuesta">
    <div v-if="!skin" class="skin-panel__empty">
      <p class="skin-panel__hint">Toca una skin de la cuadrícula para previsualizarla y elegir en qué traje va.</p>
    </div>

    <div v-else class="skin-sheet-body">
      <div class="skin-sheet-body__head">
        <div>
          <h2 class="sheet__h">{{ skin.name }}</h2>
          <p v-if="authorLabel" class="skin-sheet-body__author">por {{ authorLabel }}</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Cerrar vista previa" @click="emit('close')">✕</button>
      </div>

      <div class="skin-compare">
        <button
          type="button"
          class="skin-compare__cand"
          :aria-label="'Ampliar ' + skin.name"
          @click="zoomCandidate"
        >
          <AppImg :src="candidateImage" :eager="true" :missing="candidateImage ? '' : 'Sin retrato'" fit="contain" />
        </button>

        <button
          type="button"
          class="skin-compare__cur"
          :aria-label="'Ampliar actual de ' + trajeName(targetSlot) + ', ' + targetCurrentName"
          @click="zoomTargetCurrent"
        >
          <span class="skin-compare__cur-img">
            <AppImg :src="targetCurrentImg" :missing="targetCurrentImg ? '' : 'Sin retrato'" fit="contain" />
          </span>
          <span class="skin-compare__cur-lbl">Actual: {{ targetCurrentName }}</span>
        </button>
      </div>

      <LayoutGroup v-if="variantOptions.length" id="skin-variants-desktop">
        <div class="skin-variants" role="group" aria-label="Color de origen del mod">
          <button
            v-for="option in variantOptions"
            :key="option.id"
            type="button"
            class="variant-chip"
            :class="{ 'variant-chip--on': option.isSelected }"
            :aria-pressed="option.isSelected"
            :data-variant="option.id"
            @click="chooseVariant(option.id)"
          >
            <MotionSpan
              v-if="option.isSelected"
              layout-id="active-variant-chip-desktop"
              class="variant-chip__bg"
              aria-hidden="true"
            />
            <span class="variant-chip__txt">{{ option.label }}</span>
          </button>
        </div>
      </LayoutGroup>

      <div class="skin-dest">
        <span class="skin-dest__title">¿En qué traje va?</span>
        <div class="skin-dest__grid" role="group" aria-label="Traje de destino">
          <button
            v-for="chip in destinationChips"
            :key="chip.slot"
            type="button"
            class="dest-chip"
            :class="{
              'dest-chip--on': chip.isSelected,
              'dest-chip--disabled': !chip.isCompatible,
              'dest-chip--own': chip.hasOwnProposal,
            }"
            :aria-pressed="chip.isSelected"
            :aria-disabled="!chip.isCompatible ? 'true' : undefined"
            :aria-describedby="!chip.isCompatible ? 'family-lock-reason-d' : undefined"
            :data-dest-slot="chip.slot"
            @click="chooseDestination(chip)"
          >
            <span>{{ chip.label }}</span>
            <span v-if="chip.hasFriendProposal" class="dest-chip__dot" aria-hidden="true"></span>
          </button>
        </div>
        <p v-if="hasIncompatibleSlots" id="family-lock-reason-d" class="skin-dest__note">
          Los trajes atenuados usan otro modelo base del luchador y no son compatibles con este color.
        </p>
      </div>

      <div v-if="friendProposalsOnTarget.length" class="skin-friends" aria-label="Propuestas de amigos en este traje">
        <div v-for="friend in friendProposalsOnTarget" :key="friend.key" class="skin-friends__row">
          <span class="skin-friends__thumb">
            <AppImg :src="friend.thumb" :missing="friend.thumb ? '' : '★'" fit="cover" />
          </span>
          <span class="skin-friends__txt">
            <b>{{ friend.person }}:</b> {{ friend.skinName }}
          </span>
        </div>
      </div>

      <div class="skin-sheet-body__foot">
        <button
          type="button"
          class="btn-main skin-sheet-body__cta"
          :aria-disabled="actionState.kind === SkinActionKind.Blocked ? 'true' : undefined"
          :data-act="actionState.kind"
          @click="runPrimaryAction"
        >
          {{ actionState.label }}
        </button>

        <a
          v-if="externalModUrl"
          :href="externalModUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="skin-sheet-body__ext"
        >
          Ver página del mod ↗
        </a>
      </div>
    </div>
  </aside>

  <DrawerRoot v-else :open="isOpen" @update:open="onDrawerOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent v-if="skin" class="vaul-sheet sheet sheet--skin" aria-describedby="">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <div>
            <DrawerTitle class="sheet__h">{{ skin.name }}</DrawerTitle>
            <p v-if="authorLabel" class="skin-sheet-body__author">por {{ authorLabel }}</p>
          </div>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <div class="sheet__scroll skin-sheet-body">
          <div class="skin-compare">
            <button
              type="button"
              class="skin-compare__cand"
              :aria-label="'Ampliar ' + skin.name"
              @click="zoomCandidate"
            >
              <AppImg :src="candidateImage" :eager="true" :missing="candidateImage ? '' : 'Sin retrato'" fit="contain" />
            </button>

            <button
              type="button"
              class="skin-compare__cur"
              :aria-label="'Ampliar actual de ' + trajeName(targetSlot) + ', ' + targetCurrentName"
              @click="zoomTargetCurrent"
            >
              <span class="skin-compare__cur-img">
                <AppImg :src="targetCurrentImg" :missing="targetCurrentImg ? '' : 'Sin retrato'" fit="contain" />
              </span>
              <span class="skin-compare__cur-lbl">Actual: {{ targetCurrentName }}</span>
            </button>
          </div>

          <LayoutGroup v-if="variantOptions.length" id="skin-variants-mobile">
            <div class="skin-variants" role="group" aria-label="Color de origen del mod">
              <button
                v-for="option in variantOptions"
                :key="option.id"
                type="button"
                class="variant-chip"
                :class="{ 'variant-chip--on': option.isSelected }"
                :aria-pressed="option.isSelected"
                :data-variant="option.id"
                @click="chooseVariant(option.id)"
              >
                <MotionSpan
                  v-if="option.isSelected"
                  layout-id="active-variant-chip-mobile"
                  class="variant-chip__bg"
                  aria-hidden="true"
                />
                <span class="variant-chip__txt">{{ option.label }}</span>
              </button>
            </div>
          </LayoutGroup>

          <div class="skin-dest">
            <span class="skin-dest__title">¿En qué traje va?</span>
            <div class="skin-dest__grid" role="group" aria-label="Traje de destino">
              <button
                v-for="chip in destinationChips"
                :key="chip.slot"
                type="button"
                class="dest-chip"
                :class="{
                  'dest-chip--on': chip.isSelected,
                  'dest-chip--disabled': !chip.isCompatible,
                  'dest-chip--own': chip.hasOwnProposal,
                }"
                :aria-pressed="chip.isSelected"
                :aria-disabled="!chip.isCompatible ? 'true' : undefined"
                :aria-describedby="!chip.isCompatible ? 'family-lock-reason-m' : undefined"
                :data-dest-slot="chip.slot"
                @click="chooseDestination(chip)"
              >
                <span>{{ chip.label }}</span>
                <span v-if="chip.hasFriendProposal" class="dest-chip__dot" aria-hidden="true"></span>
              </button>
            </div>
            <p v-if="hasIncompatibleSlots" id="family-lock-reason-m" class="skin-dest__note">
              Los trajes atenuados usan otro modelo base del luchador y no son compatibles con este color.
            </p>
          </div>

          <div v-if="friendProposalsOnTarget.length" class="skin-friends" aria-label="Propuestas de amigos en este traje">
            <div v-for="friend in friendProposalsOnTarget" :key="friend.key" class="skin-friends__row">
              <span class="skin-friends__thumb">
                <AppImg :src="friend.thumb" :missing="friend.thumb ? '' : '★'" fit="cover" />
              </span>
              <span class="skin-friends__txt">
                <b>{{ friend.person }}:</b> {{ friend.skinName }}
              </span>
            </div>
          </div>

          <div class="skin-sheet-body__foot">
            <button
              type="button"
              class="btn-main skin-sheet-body__cta"
              :aria-disabled="actionState.kind === SkinActionKind.Blocked ? 'true' : undefined"
              :data-act="actionState.kind"
              @click="runPrimaryAction"
            >
              {{ actionState.label }}
            </button>

            <a
              v-if="externalModUrl"
              :href="externalModUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="skin-sheet-body__ext"
            >
              Ver página del mod ↗
            </a>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
