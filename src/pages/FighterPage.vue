<script setup lang="ts">
import { QBtn, QPage, QSkeleton } from 'quasar'
import { go } from '../composables/useApp'
import CompareCards from '../features/fighters/components/CompareCards.vue'
import CompareBar from '../features/fighters/components/CompareBar.vue'
import CostumeGrid from '../features/fighters/components/CostumeGrid.vue'
import CostumeMeter from '../features/roster/components/CostumeMeter.vue'
import PlacingBand from '../features/fighters/components/PlacingBand.vue'
import SkinGrid from '../features/fighters/components/SkinGrid.vue'
import { useFighterPage } from './composables/useFighterPage'
import { state } from '../features/plan/services/sync'

const { model, stage, preview, choice, placeLabel, placing, onlyDownloaded, panel, barOn, pulse, pick, openDetail, openStage, zoomCell, zoomCurrent, step, commit, discard, clear, toggleDownloaded, focusSearch, selectSlot } = useFighterPage()
</script>

<template>
  <q-page class="page fighter-page">
    <div v-if="!model.fighter && state.F.length === 0" class="fighter-ghost" role="status" aria-busy="true" aria-label="Luchador">
      <span class="sr-only">Luchador</span>
      <div class="cgrid"><q-skeleton v-for="n in 8" :key="n" class="cell-sk" animation="pulse" square /></div>
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
        <div class="fhead">
          <CostumeMeter :costumes="model.meter" :label="model.meterLabel" />
          <p class="fhead__txt">{{ model.summary }}</p>
        </div>
        <PlacingBand v-if="placing" :name="placing.name" :img="placing.img" @cancel="discard" />
        <CostumeGrid :cells="model.cells" :pulse="pulse" :compact="model.withSlot" @select="selectSlot" @clear="clear" @zoom="zoomCell" />
      </div>
      <div ref="panel" class="fighter-panel">
        <CompareCards :stage="stage" :preview="preview" :choice="choice" :place="placeLabel" @zoom-current="zoomCurrent" @zoom-new="openStage" @act="commit" @find="focusSearch" @discard="discard" @step="step" />
      </div>
      <div class="fighter-right">
        <CompareBar v-if="barOn && stage" :stage="stage" :preview="preview" :choice="choice" @act="commit" />
        <SkinGrid :rows="model.rows" :total="model.total" :only-downloaded="onlyDownloaded" @pick="pick" @detail="openDetail" @toggle-downloaded="toggleDownloaded" />
      </div>
    </div>
  </q-page>
</template>
