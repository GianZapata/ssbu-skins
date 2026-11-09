<script setup lang="ts">
import { QBtn, QDialog, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { useFocusLoop } from '../../../composables/useFocusLoop'
import { ProposalOrigin } from '../../plan/enums/ProposalOrigin'
import { useSummarySheet } from '../composables/useSummarySheet'

const {
  desktop,
  saving,
  saved,
  savedHere,
  open,
  sections,
  empty,
  hasFriends,
  close,
  chooseFighter,
  goTo,
  isConfirming,
  undo,
  keep,
} = useSummarySheet()

const { loop } = useFocusLoop()
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
    <div class="sheet sheet--list" role="dialog" aria-label="Cambios" @keydown="loop">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head">
        <h2 class="sheet__h">Cambios</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
      <p v-else-if="saved" class="sheet__line" role="status">Propuesta guardada</p>
      <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo, sin enviar</p>

      <div v-if="empty" class="sheet__empty empty" role="status">
        <q-icon name="inventory_2" size="44px" aria-hidden="true" />
        <b>Aún no hay propuestas</b>
        <q-btn unelevated no-caps class="btn-main" label="Ir a Luchadores" @click="chooseFighter" />
      </div>

      <div v-else class="sheet__scroll">
        <p class="sheet__note">Gian revisa las propuestas y decide cuáles instala.</p>

        <section v-for="section in sections" :key="section.origin" class="grp" :class="{ 'grp--friends': section.origin === ProposalOrigin.Friend }" :data-section="section.origin">
          <h3 class="grp__origin">{{ section.title }}</h3>
          <div v-for="group in section.groups" :key="section.origin + group.code">
            <div class="grp__head">
              <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
              <span class="grp__name">{{ group.name }}</span>
            </div>
            <div v-for="row in group.rows" :key="row.key" class="srow">
              <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
                <span class="srow__from"><AppImg :src="row.fromImg" :missing="row.fromImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
                <span class="srow__to"><AppImg :src="row.toImg" :missing="row.toImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <span class="srow__txt">
                  <span class="srow__t">{{ row.t }}</span>
                  <span class="srow__new">{{ row.to }}</span>
                  <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
                  <span v-if="section.origin === ProposalOrigin.Friend" class="srow__who">{{ row.author }}{{ row.when ? ' · ' + row.when : '' }}</span>
                </span>
              </button>
              <q-btn v-if="!isConfirming(row)" flat round padding="0" class="srow__x" :aria-label="row.quitar" :data-undo="row.code + '_' + row.n" @click="undo(row)">
                <span class="srow__x-dot"><q-icon name="close" size="16px" aria-hidden="true" /></span>
              </q-btn>
              <div v-else class="srow__ask" role="group" :aria-label="'Confirmar: ' + row.quitar">
                <span>Quitar la propuesta de {{ row.author }}</span>
                <q-btn no-caps unelevated class="btn-quiet" label="Quitar" :data-undo-confirm="row.code + '_' + row.n" @click="undo(row)" />
                <q-btn no-caps flat label="Conservar" @click="keep" />
              </div>
            </div>
          </div>
        </section>
        <span v-if="hasFriends" class="sr-only">Incluye propuestas de otras personas</span>
      </div>
    </div>
  </q-dialog>
</template>
