<script setup lang="ts">
import { QBtn, QDialog, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { useSummarySheet } from '../composables/useSummarySheet'

const {
  desktop,
  saving,
  saved,
  savedHere,
  open,
  shownMine,
  shownFriends,
  empty,
  friendTitle,
  close,
  chooseFighter,
  goTo,
  undo,
} = useSummarySheet()
</script>

<template>
  <q-dialog
    :model-value="open"
    :position="desktop ? 'standard' : 'bottom'"
    :full-width="!desktop"
    :transition-show="desktop ? 'scale' : 'slide-up'"
    :transition-hide="desktop ? 'scale' : 'slide-down'"
    :transition-duration="desktop ? 240 : 320"
    class="sheet-dialog"
    @update:model-value="(v: boolean) => { if (!v) close() }"
  >
    <div class="sheet sheet--list" role="dialog" aria-label="Elegidas">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head">
        <h2 class="sheet__h">Elegidas</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
      <p v-else-if="saved" class="sheet__line" role="status">Elección guardada</p>
      <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo</p>

      <div v-if="empty" class="sheet__empty empty" role="status">
        <q-icon name="inventory_2" size="44px" aria-hidden="true" />
        <b>Nada elegido</b>
        <q-btn unelevated no-caps class="btn-main" label="Elegir luchador" @click="chooseFighter" />
      </div>

      <div v-else class="sheet__scroll">
        <section v-for="group in shownMine" :key="group.code" class="grp">
          <div class="grp__head">
            <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
            <span class="grp__name">{{ group.name }}</span>
          </div>
          <div v-for="row in group.rows" :key="row.code + '_' + row.n" class="srow">
            <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
              <span class="srow__from"><AppImg :src="row.fromImg" :missing="row.fromImg ? '' : 'Sin retrato'" fit="contain" /></span>
              <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
              <span class="srow__to"><AppImg :src="row.toImg" :missing="row.toImg ? '' : 'Sin retrato'" fit="contain" /></span>
              <span class="srow__txt">
                <span class="srow__t">{{ row.t }}</span>
                <span class="srow__new">{{ row.to }}</span>
                <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
              </span>
            </button>
            <q-btn flat round padding="0" class="srow__x" :aria-label="row.quitar" :data-undo="row.code + '_' + row.n" @click="undo(row.code, row.n)">
              <span class="srow__x-dot"><q-icon name="close" size="16px" aria-hidden="true" /></span>
            </q-btn>
          </div>
        </section>

        <section v-if="shownFriends.length" class="grp grp--friends">
          <h3 class="grp__origin">{{ friendTitle }}</h3>
          <div v-for="group in shownFriends" :key="'f-' + group.code">
            <div class="grp__head">
              <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
              <span class="grp__name">{{ group.name }}</span>
            </div>
            <div v-for="row in group.rows" :key="row.code + '_' + row.n" class="srow">
              <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
                <span class="srow__from"><AppImg :src="row.fromImg" :missing="row.fromImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
                <span class="srow__to"><AppImg :src="row.toImg" :missing="row.toImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <span class="srow__txt">
                  <span class="srow__t">{{ row.t }}</span>
                  <span class="srow__new">{{ row.to }}</span>
                  <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
                  <span class="srow__who">{{ row.author }}{{ row.when ? ' · ' + row.when : '' }}</span>
                </span>
              </button>
              <q-btn flat round padding="0" class="srow__x" :aria-label="row.quitar" :data-undo="row.code + '_' + row.n" @click="undo(row.code, row.n)">
                <span class="srow__x-dot"><q-icon name="close" size="16px" aria-hidden="true" /></span>
              </q-btn>
            </div>
          </div>
        </section>
      </div>
    </div>
  </q-dialog>
</template>
