<script setup lang="ts">
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
import { useFocusLoop } from '../../../composables/useFocusLoop'
import CostumeMeter from '../../roster/components/CostumeMeter.vue'
import { useFighterPickSheet } from '../composables/useFighterPickSheet'

interface FighterPickSheetProps {
  isOpen: boolean
}

interface FighterPickSheetEmits {
  close: []
}

const props = defineProps<FighterPickSheetProps>()
const emit = defineEmits<FighterPickSheetEmits>()

const {
  desktop,
  query,
  searchInput,
  fighterRows,
  skinHits,
  meterLabelOf,
  focusSearch,
  clearQuery,
  pickFighter,
  pickSkin,
  onOpenChange,
} = useFighterPickSheet(emit)
const { loop } = useFocusLoop()
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="props.isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    no-refocus
    aria-labelledby="fighter-pick-title"
    class="sheet-dialog"
    @show="focusSearch"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--pick" @keydown="loop">
      <div class="sheet__head">
        <h2 id="fighter-pick-title" class="sheet__h">Elegir luchador</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>
      <div class="pick-search">
        <label for="fighter-pick-input" class="sr-only">Buscar luchador o skin</label>
        <input
          id="fighter-pick-input"
          ref="searchInput"
          v-model="query"
          type="search"
          class="pick-search__input"
          placeholder="Buscar luchador o skin"
          autocomplete="off"
        >
        <button
          v-if="query"
          type="button"
          class="icon-btn pick-search__clear"
          aria-label="Borrar búsqueda"
          @click="clearQuery"
        >
          ✕
        </button>
      </div>

      <div class="sheet__scroll">
        <section v-if="fighterRows.length" aria-label="Luchadores" class="pick-fighters">
          <button
            v-for="row in fighterRows"
            :key="row.code"
            type="button"
            class="pick-tile"
            :class="{ 'pick-tile--on': row.isCurrent }"
            :aria-current="row.isCurrent ? 'true' : undefined"
            :data-fighter-tile="row.code"
            @click="pickFighter(row.code)"
          >
            <span class="pick-tile__face">
              <img v-if="row.portrait" :src="row.portrait" alt="" width="44" height="44" loading="lazy" decoding="async">
              <span v-if="row.proposalCount > 0" class="pick-tile__dot" aria-hidden="true"></span>
            </span>
            <span class="pick-tile__name">{{ row.name }}</span>
            <CostumeMeter :costumes="row.costumes" :label="meterLabelOf(row)" />
          </button>
        </section>

        <section v-if="skinHits.length" aria-label="Skins encontradas" class="pick-skins">
          <h3 class="pick-skins__h">Skins</h3>
          <button
            v-for="hit in skinHits"
            :key="hit.vid"
            type="button"
            class="pick-skin-row"
            :data-pick-skin="hit.vid"
            @click="pickSkin(hit)"
          >
            <span class="pick-skin-row__thumb">
              <AppImg :src="hit.img" :missing="hit.img ? '' : 'Sin retrato'" fit="cover" />
            </span>
            <span class="pick-skin-row__txt">
              <span class="pick-skin-row__name">{{ hit.name }}</span>
              <span class="pick-skin-row__sub">{{ hit.fighterName }}</span>
            </span>
          </button>
        </section>

        <div v-if="!fighterRows.length && !skinHits.length" class="empty" role="status">
          <q-icon name="search_off" size="36px" aria-hidden="true" />
          <b>Sin coincidencias</b>
        </div>
      </div>
    </div>
  </q-dialog>

  <DrawerRoot v-else :open="props.isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent
        class="vaul-sheet sheet sheet--pick"
        @open-auto-focus.prevent="focusSearch"
        @close-auto-focus.prevent
      >
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle class="sheet__h">Elegir luchador</DrawerTitle>
          <DrawerClose as-child>
            <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" />
          </DrawerClose>
        </div>
        <DrawerDescription class="sr-only">Busca un luchador o una skin para abrirlo.</DrawerDescription>
        <div class="pick-search">
          <label for="fighter-pick-input-m" class="sr-only">Buscar luchador o skin</label>
          <input
            id="fighter-pick-input-m"
            ref="searchInput"
            v-model="query"
            type="search"
            class="pick-search__input"
            placeholder="Buscar luchador o skin"
            autocomplete="off"
          >
          <button
            v-if="query"
            type="button"
            class="icon-btn pick-search__clear"
            aria-label="Borrar búsqueda"
            @click="clearQuery"
          >
            ✕
          </button>
        </div>

        <div class="sheet__scroll">
          <section v-if="fighterRows.length" aria-label="Luchadores" class="pick-fighters">
            <button
              v-for="row in fighterRows"
              :key="row.code"
              type="button"
              class="pick-tile"
              :class="{ 'pick-tile--on': row.isCurrent }"
              :aria-current="row.isCurrent ? 'true' : undefined"
              :data-fighter-tile="row.code"
              @click="pickFighter(row.code)"
            >
              <span class="pick-tile__face">
                <img v-if="row.portrait" :src="row.portrait" alt="" width="44" height="44" loading="lazy" decoding="async">
                <span v-if="row.proposalCount > 0" class="pick-tile__dot" aria-hidden="true"></span>
              </span>
              <span class="pick-tile__name">{{ row.name }}</span>
              <CostumeMeter :costumes="row.costumes" :label="meterLabelOf(row)" />
            </button>
          </section>

          <section v-if="skinHits.length" aria-label="Skins encontradas" class="pick-skins">
            <h3 class="pick-skins__h">Skins</h3>
            <button
              v-for="hit in skinHits"
              :key="hit.vid"
              type="button"
              class="pick-skin-row"
              :data-pick-skin="hit.vid"
              @click="pickSkin(hit)"
            >
              <span class="pick-skin-row__thumb">
                <AppImg :src="hit.img" :missing="hit.img ? '' : 'Sin retrato'" fit="cover" />
              </span>
              <span class="pick-skin-row__txt">
                <span class="pick-skin-row__name">{{ hit.name }}</span>
                <span class="pick-skin-row__sub">{{ hit.fighterName }}</span>
              </span>
            </button>
          </section>

          <div v-if="!fighterRows.length && !skinHits.length" class="empty" role="status">
            <q-icon name="search_off" size="36px" aria-hidden="true" />
            <b>Sin coincidencias</b>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
