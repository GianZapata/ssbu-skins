<script setup lang="ts">
import CatalogGrid from '../features/catalog/components/CatalogGrid.vue'
import FaceImg from '../features/catalog/components/FaceImg.vue'
import { useFighterPage } from './composables/useFighterPage'

const { model, moveSlot, selectSlot, trajeName, clearAt, clearCand, confirmCandidate, zoomSkin } = useFighterPage()
</script>

<template>
  <div v-if="!model.fighter" class="q-pa-md empty">No encontramos ese luchador</div>
  <div v-else-if="model.fighter.mii" class="q-pa-md note"><b>Trajes Mii</b>Estos luchadores no usan los ocho trajes habituales.</div>
  <div v-else class="q-pa-md fighter" :data-view="'fighter:' + model.code">
    <div id="slots" class="tgrid" role="radiogroup" aria-label="Trajes" @keydown="moveSlot">
      <button v-for="slot in model.slots" :key="slot.n" type="button" class="tj" role="radio" :data-slot="slot.n" :aria-checked="slot.n === model.slot" :tabindex="slot.n === model.slot ? 0 : -1" :aria-label="trajeName(slot.n) + ': ' + (slot.current ? slot.current.name : '')" @click="selectSlot(slot.n)">
        <FaceImg :src="slot.current && slot.current.img" :alt="slot.current ? slot.current.name : ''" />
        <span class="tj-n">{{ trajeName(slot.n) }}</span>
        <span class="nm">{{ slot.current ? slot.current.name : '' }}</span>
      </button>
    </div>
    <div id="stage" class="q-mt-md">
      <div v-if="model.stage && !model.stage.comparing" class="cur">
        <FaceImg :src="model.stage.current.img" :alt="model.stage.current.name" eager />
        <div>
          <em>Actual</em>
          <b class="nm">{{ model.stage.current.name }}</b>
          <p v-if="model.stage.current.replace && model.stage.current.kind !== 'original'" class="note-replace">Por reemplazar: sigue instalado hasta elegir sustituto.</p>
        </div>
      </div>
      <div v-else-if="model.stage" class="cmp2">
        <div class="card2">
          <em>Actual</em>
          <FaceImg :src="model.stage.current.img" :alt="model.stage.current.name" eager />
          <b>{{ model.stage.current.name }}</b>
          <p v-if="model.stage.current.replace && model.stage.current.kind !== 'original'" class="note-replace">Por reemplazar</p>
        </div>
        <div class="card2 prop">
          <em>{{ model.stage.candidate ? 'Nueva' : 'Elegida' }}</em>
          <button v-if="model.stage.right" type="button" class="hero" data-gal="0" :aria-label="'Ampliar las fotos de ' + model.stage.right.name" @click="zoomSkin(model.stage.right, model.stage.index)">
            <img :src="(model.stage.shots[model.stage.index] && model.stage.shots[model.stage.index].m) || model.stage.right.img || ''" :alt="model.stage.right.name">
            <span v-if="model.stage.shots && model.stage.shots.length > 1" class="n">{{ model.stage.index + 1 }} / {{ model.stage.shots.length }}</span>
          </button>
          <b>{{ model.stage.right ? model.stage.right.name : '' }}</b>
        </div>
      </div>
      <div v-if="model.stage && model.stage.candidate && model.stage.block && model.stage.block.kind === 'duplicate'" class="q-mt-sm">
        <div class="note y" role="status"><b>Ya está en el {{ trajeName(model.stage.block.other || 0) }}</b>Esta skin no se duplica en otro traje. Elige otra, o revisa la que ya está.</div>
        <button type="button" class="btn p" :data-goto-slot="model.stage.block.other" @click="selectSlot(model.stage.block.other || 0)">Ver {{ trajeName(model.stage.block.other || 0) }}</button>
        <button type="button" class="btn" data-clear-cand="1" @click="clearCand">Elegir otra</button>
      </div>
      <div v-else-if="model.stage && model.stage.candidate && model.stage.block && (model.stage.block.kind === 'free' || model.stage.block.kind === 'replace')" class="q-mt-sm">
        <p v-if="model.stage.block.kind === 'replace'" class="note y" role="status">{{ trajeName(model.slot) }} ya tiene una skin. Si sigues, la reemplazas.</p>
        <button type="button" class="btn p" data-add="1" @click="confirmCandidate">{{ model.stage.addLabel }}</button>
      </div>
      <button v-else-if="model.stage && model.stage.saved" type="button" class="btn" :data-undo="model.code + '_' + model.slot" :aria-label="'Quitar skin de ' + trajeName(model.slot)" @click="clearAt(model.code, model.slot)">Quitar</button>
    </div>
    <CatalogGrid embedded />
  </div>
</template>
