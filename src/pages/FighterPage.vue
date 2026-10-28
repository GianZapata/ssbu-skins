<script setup lang="ts">
import { QBtn, QPage, QSkeleton } from 'quasar'
import { go } from '../composables/useApp'
import { hdrHidden } from '../composables/useReveal'
import CompareCards from '../features/fighters/components/CompareCards.vue'
import OutfitStrip from '../features/fighters/components/OutfitStrip.vue'
import SkinGrid from '../features/fighters/components/SkinGrid.vue'
import { useFighterPage } from './composables/useFighterPage'
import { state } from '../features/plan/services/sync'

const { model, stage, preview, choice, placeLabel, roamHint, pulse, pick, openDetail, openStage, commit, clear, focusSearch, selectSlot } = useFighterPage()
</script>

<template>
  <q-page class="page fighter-page">
    <div v-if="!model.fighter && state.F.length === 0" class="fighter-ghost" role="status" aria-busy="true" aria-label="Luchador">
      <div class="strip__row"><q-skeleton v-for="n in 5" :key="n" class="cell-sk" animation="pulse" square /></div>
      <div class="cmp"><q-skeleton class="cmp-sk" animation="pulse" square /><q-skeleton class="cmp-sk" animation="pulse" square /></div>
      <div class="sgrid">
        <div v-for="n in 6" :key="'skin-' + n" class="card card--ghost">
          <q-skeleton class="card__img" animation="pulse" square />
          <q-skeleton class="card__name-sk" animation="pulse" type="text" />
        </div>
      </div>
    </div>

    <div v-else-if="!model.fighter" class="empty" role="status">
      <b>Sin resultados</b>
      <q-btn unelevated no-caps color="primary" text-color="dark" label="Elegir luchador" class="btn-main" @click="go('#/luchadores')" />
    </div>

    <div v-else class="fighter-grid" :data-view="'fighter:' + model.code">
      <div class="fighter-left">
        <OutfitStrip :cells="model.cells" :pulse="pulse" :top="hdrHidden" @select="selectSlot" @clear="clear" />
        <CompareCards :stage="stage" :preview="preview" :choice="choice" :place="placeLabel" :hint="roamHint" @detail="openStage" @act="commit" @find="focusSearch" />
      </div>
      <div class="fighter-right">
        <SkinGrid :rows="model.rows" :total="model.total" @pick="pick" @detail="openDetail" />
      </div>
    </div>
  </q-page>
</template>
