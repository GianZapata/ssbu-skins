<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import ActiveCostumeBar from '../features/fighters/components/ActiveCostumeBar.vue'
import CostumeStrip from '../features/fighters/components/CostumeStrip.vue'
import SkinGrid from '../features/fighters/components/SkinGrid.vue'
import SkinSheet from '../features/fighters/components/SkinSheet.vue'
import { useFighterPage } from './composables/useFighterPage'

const {
  desktop,
  fighter,
  fighterCode,
  activeSlot,
  candidateVid,
  onlyDownloaded,
  allPicks,
  skinRows,
  swipeZone,
  topSentinel,
  showScrollTop,
  onSelectSlot,
  onPickSkin,
  onDetailSkin,
  onToggleDownloaded,
  onCloseSkinSheet,
  scrollToTop,
} = useFighterPage()

const MotionButton = motion.button
</script>

<template>
  <main
    id="main"
    class="fighter-page"
    :data-view="fighter ? 'fighter:' + fighterCode : undefined"
  >
    <template v-if="fighter">
      <div ref="topSentinel" class="top-sentinel" aria-hidden="true"></div>

      <div class="fighter-sticky">
        <div class="app-frame">
          <CostumeStrip
            :fighter-code="fighterCode"
            :active-slot="activeSlot"
            @select-slot="onSelectSlot"
          />
          <ActiveCostumeBar
            :fighter-code="fighterCode"
            :active-slot="activeSlot"
          />
        </div>
      </div>

      <div ref="swipeZone" class="app-frame fighter-stage">
        <div class="fighter-workspace" :class="{ 'fighter-workspace--split': desktop }">
          <SkinGrid
            :rows="skinRows"
            :total="allPicks.length"
            :only-downloaded="onlyDownloaded"
            @pick="onPickSkin"
            @detail="onDetailSkin"
            @toggle-downloaded="onToggleDownloaded"
          />

          <SkinSheet
            v-if="desktop || candidateVid"
            :fighter-code="fighterCode"
            :active-slot="activeSlot"
            :candidate-vid="candidateVid"
            @close="onCloseSkinSheet"
          />
        </div>
      </div>

      <AnimatePresence>
        <MotionButton
          v-if="showScrollTop"
          type="button"
          class="back-top-fab"
          aria-label="Volver arriba"
          :initial="{ opacity: 0, scale: 0.9, y: 12 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :exit="{ opacity: 0, scale: 0.9, y: 12 }"
          @click="scrollToTop"
        >
          ↑ Arriba
        </MotionButton>
      </AnimatePresence>
    </template>
  </main>
</template>
