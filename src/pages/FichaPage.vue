<script setup lang="ts">
import FaceImg from '../features/catalog/components/FaceImg.vue'
import { useFichaPage } from './composables/useFichaPage'

const { model, setDest, trajeName, useHere, zoomSkin } = useFichaPage()
</script>

<template>
  <div v-if="!model" class="q-pa-md empty">Esta apariencia ya no está en el catálogo</div>
  <div v-else class="q-pa-md" :data-view="'ficha:' + model.entry.p.vid">
    <button v-if="model.shots.length" type="button" class="hero" :data-gal="model.index" aria-label="Ampliar foto" @click="zoomSkin(model.entry.p, model.index)">
      <img :src="model.shots[model.index].m" :alt="model.entry.p.name">
      <span class="n">{{ model.index + 1 }} / {{ model.shots.length }}</span>
    </button>
    <div v-else class="hero"><span class="noimg" role="img" aria-label="No se pudo cargar la foto">Sin foto</span></div>
    <h2>{{ model.entry.p.name }}</h2>
    <p>por {{ model.entry.p.author }}</p>
    <p class="pl">
      <span class="pill">{{ model.pills.recommended ? 'Recomendada' : 'Alternativa' }}</span>
      <span class="pill">{{ model.pills.online }}</span>
    </p>
    <div v-if="model.entry.p.pack" class="note"><b>Paquete compartido</b>Las fotos pueden mostrar otros luchadores del paquete.</div>
    <div v-if="model.entry.p.withdrawn" class="note y"><b>Retirada</b>Esta skin ya no se puede elegir.</div>
    <div v-if="model.cond.length" class="note y"><b>Condiciones</b><span v-for="line in model.cond" :key="line">{{ line }}</span></div>
    <div id="usebox">
      <div v-if="model.entry.p.mii" class="note"><b>Traje Mii</b>Los Mii no usan los ocho trajes, así que esta apariencia no se puede asignar.</div>
      <template v-else-if="!model.entry.p.withdrawn">
        <h2>{{ model.para ? 'Destino: ' + trajeName(model.para.n) : '¿En qué traje?' }}</h2>
        <div v-if="!model.para" class="dest" role="group" aria-label="Elegir traje">
          <button v-for="slot in model.slots" :key="slot" type="button" :data-dest="slot" :aria-pressed="model.dest === slot" @click="setDest(slot)">{{ trajeName(slot) }}</button>
        </div>
        <div v-if="model.current" class="row2">
          <div class="card2"><em>Actual</em><FaceImg :src="model.current.img" :alt="model.current.name" /><b>{{ model.current.name }}</b></div>
          <div class="card2 prop"><em>Nueva</em><FaceImg :src="model.entry.p.img" :alt="model.entry.p.name" /><b>{{ model.entry.p.name }}</b></div>
        </div>
        <p v-if="model.outside" class="note y" role="status">Este mod trae otros trajes. Usarlo en el {{ trajeName(model.dest || 0) }} exige moverlo y no está comprobado.</p>
        <button type="button" class="btn p" data-use="1" :disabled="model.dest == null" @click="useHere(model.entry.f.code, model.entry.p.vid)">{{ model.dest == null ? 'Elige un traje' : 'Usar en ' + trajeName(model.dest) }}</button>
      </template>
    </div>
    <details>
      <summary>Detalles y fuentes</summary>
      <div class="dl">
        <p v-if="model.entry.p.dl != null"><b>Descargas:</b> {{ model.entry.p.dl }}</p>
        <p v-if="model.entry.p.images_scope"><b>Fotos:</b> {{ model.entry.p.images_scope }}</p>
        <p v-if="model.entry.p.audit_scope"><b>Revisión:</b> {{ model.entry.p.audit_scope }}</p>
        <p v-if="model.entry.p.dest"><b>Destino sugerido por el análisis:</b> {{ model.entry.p.dest }} (solo orientativo: ese traje puede estar ocupado)</p>
        <p><a :href="model.entry.p.url" target="_blank" rel="noopener">GameBanana</a></p>
      </div>
    </details>
  </div>
</template>
