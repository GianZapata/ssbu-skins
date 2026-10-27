<script setup lang="ts">
import FaceImg from '../features/catalog/components/FaceImg.vue'
import { useChangesPage } from './composables/useChangesPage'

const { groups, legacy, clearAt, showExport, showRecover, trajeName } = useChangesPage()
</script>

<template>
  <div data-view="cambios" class="q-pa-md">
    <button type="button" class="btn p" data-export="1" @click="showExport">Exportar</button>
    <div v-if="legacy.length" class="note">
      <b>Elecciones de antes</b>
      Este dispositivo guardó {{ legacy.length }}.
      <button type="button" class="btn" data-m="recover" @click="showRecover">Revisar</button>
    </div>
    <div v-if="!groups.length" class="empty">
      <b>Nada elegido</b>
      <a class="btn p" href="#/luchadores">Elegir luchador</a>
    </div>
    <section v-for="group in groups" :key="group.fighter.code">
      <h2>{{ group.fighter.name }}</h2>
      <div v-for="row in group.rows" :key="row.code + '_' + row.n" class="chg-row">
        <FaceImg :src="row.img" :alt="row.to" />
        <a :href="'#/luchador/' + encodeURIComponent(row.code) + '/' + (row.n + 1)">
          <span>{{ trajeName(row.n) }}</span>
          <b>{{ row.to }}</b>
          <small>{{ row.from }}</small>
        </a>
        <button type="button" class="btn" :data-undo="row.code + '_' + row.n" :aria-label="'Quitar skin de ' + trajeName(row.n)" @click="clearAt(row.code, row.n)">Quitar</button>
      </div>
    </section>
  </div>
</template>
