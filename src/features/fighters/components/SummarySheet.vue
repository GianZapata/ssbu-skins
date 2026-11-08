<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import { QBtn, QDialog, QIcon } from 'quasar'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'

import AppImg from '../../../components/AppImg.vue'
import { useSummarySheet } from '../composables/useSummarySheet'

const {
  desktop,
  saving,
  saved,
  savedHere,
  activePerson,
  isOpen,
  tabs,
  currentTab,
  empty,
  setTabRef,
  selectTab,
  onTabKeydown,
  close,
  onOpenChange,
  goTo,
  undo,
  chooseIdentity,
} = useSummarySheet()

const MotionSpan = motion.span
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    class="sheet-dialog"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--list" role="dialog" aria-label="Cambios" aria-labelledby="summary-sheet-title">
      <div class="sheet__head">
        <h2 id="summary-sheet-title" class="sheet__h">Cambios</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
      <p v-else-if="saved" class="sheet__line" role="status">Propuesta guardada</p>
      <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo, sin enviar</p>

      <div v-if="empty" class="sheet__empty empty" role="status">
        <q-icon name="inventory_2" size="44px" aria-hidden="true" />
        <b>Aún no hay propuestas</b>
        <q-btn unelevated no-caps class="btn-main" label="Elegir skin" @click="close" />
      </div>

      <template v-else-if="currentTab">
        <LayoutGroup id="summary-tabs-desktop">
          <div class="summary-tabs" role="tablist" aria-label="Propuestas por persona">
            <button
              v-for="(tab, index) in tabs"
              :key="tab.id"
              :ref="(el) => setTabRef(index, el)"
              :id="'summary-tab-d-' + tab.id"
              type="button"
              role="tab"
              class="summary-tab"
              :class="{ 'summary-tab--on': tab.id === currentTab.id }"
              :aria-selected="tab.id === currentTab.id"
              :aria-controls="'summary-panel-d-' + tab.id"
              :tabindex="tab.id === currentTab.id ? 0 : -1"
              :data-tab="tab.id"
              @click="selectTab(tab.id)"
              @keydown="onTabKeydown($event, index)"
            >
              <span>{{ tab.label }} · {{ tab.count }}</span>
              <MotionSpan
                v-if="tab.id === currentTab.id"
                layout-id="summary-tab-indicator-desktop"
                class="summary-tab__line"
                aria-hidden="true"
              />
            </button>
          </div>
        </LayoutGroup>

        <div
          :id="'summary-panel-d-' + currentTab.id"
          role="tabpanel"
          class="sheet__scroll summary-panel"
          :aria-labelledby="'summary-tab-d-' + currentTab.id"
          :data-section="currentTab.kind"
        >
          <p class="sheet__note">Gian revisa las propuestas y decide cuáles instala.</p>

          <div v-if="!currentTab.groups.length" class="summary-panel__empty" role="status">
            <p v-if="!activePerson">Elige tu nombre para separar tus propuestas de las de tus amigos.</p>
            <p v-else>Aún no tienes propuestas guardadas.</p>
            <button v-if="!activePerson" type="button" class="btn-main" @click="chooseIdentity">
              Elegir persona
            </button>
          </div>

          <div v-for="group in currentTab.groups" :key="currentTab.id + ':' + group.code" class="grp">
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
                  <span v-if="row.unsent" class="srow__unsent">Sin enviar</span>
                  <span v-else-if="row.when" class="srow__who">{{ row.when }}</span>
                </span>
              </button>

              <button
                v-if="currentTab.canUndo && row.canUndo"
                type="button"
                class="srow__x"
                :aria-label="row.quitar"
                :data-undo="row.key"
                @click="undo(row)"
              >
                Deshacer
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-dialog>

  <DrawerRoot v-else :open="isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent class="vaul-sheet sheet sheet--list" role="dialog" aria-label="Cambios">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle class="sheet__h">Cambios</DrawerTitle>
          <DrawerDescription class="sr-only">Propuestas agrupadas por persona.</DrawerDescription>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
        <p v-else-if="saved" class="sheet__line" role="status">Propuesta guardada</p>
        <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo, sin enviar</p>

        <div v-if="empty" class="sheet__empty empty" role="status">
          <q-icon name="inventory_2" size="44px" aria-hidden="true" />
          <b>Aún no hay propuestas</b>
          <q-btn unelevated no-caps class="btn-main" label="Elegir skin" @click="close" />
        </div>

        <template v-else-if="currentTab">
          <LayoutGroup id="summary-tabs-mobile">
            <div class="summary-tabs" role="tablist" aria-label="Propuestas por persona">
              <button
                v-for="(tab, index) in tabs"
                :key="tab.id"
                :ref="(el) => setTabRef(index, el)"
                :id="'summary-tab-m-' + tab.id"
                type="button"
                role="tab"
                class="summary-tab"
                :class="{ 'summary-tab--on': tab.id === currentTab.id }"
                :aria-selected="tab.id === currentTab.id"
                :aria-controls="'summary-panel-m-' + tab.id"
                :tabindex="tab.id === currentTab.id ? 0 : -1"
                :data-tab="tab.id"
                @click="selectTab(tab.id)"
                @keydown="onTabKeydown($event, index)"
              >
                <span>{{ tab.label }} · {{ tab.count }}</span>
                <MotionSpan
                  v-if="tab.id === currentTab.id"
                  layout-id="summary-tab-indicator-mobile"
                  class="summary-tab__line"
                  aria-hidden="true"
                />
              </button>
            </div>
          </LayoutGroup>

          <div
            :id="'summary-panel-m-' + currentTab.id"
            role="tabpanel"
            class="sheet__scroll summary-panel"
            :aria-labelledby="'summary-tab-m-' + currentTab.id"
            :data-section="currentTab.kind"
          >
            <p class="sheet__note">Gian revisa las propuestas y decide cuáles instala.</p>

            <div v-if="!currentTab.groups.length" class="summary-panel__empty" role="status">
              <p v-if="!activePerson">Elige tu nombre para separar tus propuestas de las de tus amigos.</p>
              <p v-else>Aún no tienes propuestas guardadas.</p>
              <button v-if="!activePerson" type="button" class="btn-main" @click="chooseIdentity">
                Elegir persona
              </button>
            </div>

            <div v-for="group in currentTab.groups" :key="currentTab.id + ':' + group.code" class="grp">
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
                    <span v-if="row.unsent" class="srow__unsent">Sin enviar</span>
                    <span v-else-if="row.when" class="srow__who">{{ row.when }}</span>
                  </span>
                </button>

                <button
                  v-if="currentTab.canUndo && row.canUndo"
                  type="button"
                  class="srow__x"
                  :aria-label="row.quitar"
                  :data-undo="row.key"
                  @click="undo(row)"
                >
                  Deshacer
                </button>
              </div>
            </div>
          </div>
        </template>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
