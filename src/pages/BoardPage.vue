<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import Destinations from '../features/fighters/components/Destinations.vue'
import { slotsLabel, useBoard } from '../features/board/useBoard'

const { pick, query, loading, fighters, changes, changeCount, costumeName, costumeImage, available, locked, altName, toggle, choose, discard, chosenVid, jumpTo } = useBoard()
</script>

<template>
  <q-page class="page fighters-page board" :class="{ 'board--picking': pick }">
    <h1 class="sr-only">Tarjeta</h1>
    <Destinations />

    <div class="search-row">
      <q-input
        v-model="query"
        class="search"
        outlined
        type="search"
        placeholder="Buscar luchador"
        aria-label="Buscar luchador"
        autocomplete="off"
        :disable="loading"
      >
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
        <template #append>
          <q-btn v-if="query" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="query = ''" />
        </template>
      </q-input>
    </div>

    <section v-if="changeCount" class="board-sum" aria-label="Cambios sin aplicar">
      <p class="board-sum__title">{{ changeCount }} {{ changeCount === 1 ? 'cambio sin aplicar' : 'cambios sin aplicar' }}</p>
      <ul class="board-sum__list">
        <template v-for="group in changes" :key="group.fighter.code">
          <li v-for="row in group.rows" :key="row.code + row.n" class="board-sum__row">
            <span class="board-sum__thumb"><AppImg :src="costumeImage(group.fighter, row.n)" fit="contain" /></span>
            <span class="board-sum__text">
              <b>{{ group.fighter.name }} · Traje {{ row.n + 1 }}</b>
              <span>{{ altName(row.code, row.vid) }}</span>
            </span>
            <q-btn no-caps unelevated class="btn-quiet board-sum__undo" label="Descartar" :aria-label="'Descartar cambio de ' + group.fighter.name + ' traje ' + (row.n + 1)" @click="discard(row.code, row.n)" />
          </li>
        </template>
      </ul>
    </section>

    <div v-if="loading" class="board-skel" role="status" aria-busy="true" aria-label="Cargando tarjeta">
      <q-skeleton v-for="n in 8" :key="n" class="board-skel__tile" animation="pulse" square />
    </div>

    <div v-else-if="!fighters.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>Sin resultados</b>
    </div>

    <template v-else>
      <nav class="board-rail" aria-label="Saltar a luchador">
        <button v-for="fighter in fighters" :key="fighter.code" type="button" class="board-rail__btn" :aria-label="fighter.name" @click="jumpTo(fighter.code)">
          <AppImg v-if="fighter.portrait" :src="fighter.portrait" fit="contain" />
        </button>
      </nav>

      <section
        v-for="fighter in fighters"
        :id="'f-' + fighter.code"
        :key="fighter.code"
        class="board-f"
        :class="{ 'board-f--dim': pick && pick.code !== fighter.code }"
      >
        <header class="board-f__head">
          <span class="board-f__face"><AppImg v-if="fighter.portrait" :src="fighter.portrait" fit="contain" /></span>
          <h2>{{ fighter.name }}</h2>
          <span v-if="available(fighter.code).length" class="board-f__count">{{ available(fighter.code).length }} disponibles</span>
        </header>

        <div class="board-grid">
          <button
            v-for="n in 8"
            :key="n"
            type="button"
            class="board-tile"
            :class="{ 'board-tile--target': pick && pick.code === fighter.code, 'board-tile--chosen': chosenVid(fighter.code, n - 1) }"
            :disabled="!pick || pick.code !== fighter.code"
            :aria-label="'Traje ' + n + ', ' + costumeName(fighter.code, n - 1) + (pick && pick.code === fighter.code ? '. Poner aquí ' + pick.name : '')"
            @click="choose(fighter.code, n - 1)"
          >
            <span class="board-tile__img">
              <AppImg :src="costumeImage(fighter, n - 1)" fit="contain" />
              <span v-if="chosenVid(fighter.code, n - 1)" class="board-tile__badge">Elegida</span>
            </span>
            <span class="board-tile__name">
              <b>Traje {{ n }}</b>
              <span>{{ costumeName(fighter.code, n - 1) }}</span>
            </span>
          </button>
        </div>

        <ul v-if="available(fighter.code).length" class="board-alts" aria-label="Alternativas del Drive">
          <li v-for="alt in available(fighter.code)" :key="alt.mod_id + alt.name">
            <button type="button" class="board-alt" :aria-pressed="pick?.code === fighter.code && pick?.vid === alt.vid" @click="toggle(fighter, alt)">
              <b>{{ alt.name }}</b>
              <span>{{ slotsLabel(alt) }}</span>
            </button>
          </li>
        </ul>

        <details v-if="locked(fighter.code).length" class="board-locked">
          <summary>
            <q-icon name="lock" size="18px" aria-hidden="true" />
            {{ locked(fighter.code).length }} sin catálogo
          </summary>
          <ul>
            <li v-for="alt in locked(fighter.code)" :key="alt.mod_id + alt.name">
              <b>{{ alt.name }}</b>
              <span>Aún no está en el catálogo</span>
            </li>
          </ul>
        </details>
      </section>
    </template>

    <div v-if="pick" class="board-dock" role="status">
      <p>Poner <b>{{ pick.name }}</b> en… toca un traje.</p>
      <q-btn no-caps unelevated class="btn-quiet" label="Cancelar" @click="pick = null" />
    </div>
  </q-page>
</template>

<style scoped>
.board { padding-bottom: calc(96px + var(--safe-bot)); }

.board-sum { margin-top: 12px; padding: 12px; background: var(--s1); border: 1px solid var(--bd); border-radius: 14px; }
.board-sum__title { margin: 0 0 8px; font-size: 14px; font-weight: 700; color: var(--tx-mu); }
.board-sum__list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.board-sum__row { display: flex; align-items: center; gap: 12px; min-width: 0; }
.board-sum__thumb { flex: none; width: 48px; height: 48px; border-radius: 10px; overflow: hidden; background: var(--s2); }
.board-sum__text { flex: 1; min-width: 0; display: grid; font-size: 14px; line-height: 20px; }
.board-sum__text b, .board-sum__text span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-sum__text span { color: var(--tx-mu); }
.board-sum__undo { flex: none; }

.board-rail { display: flex; gap: 8px; margin: 16px -16px 0; padding: 0 16px 8px; overflow-x: auto; scrollbar-width: thin; }
.board-rail__btn { flex: none; width: 48px; height: 48px; padding: 0; border: 1px solid var(--bd); border-radius: 12px; background: var(--s2); overflow: hidden; cursor: pointer; }
.board-rail__btn:hover { border-color: var(--bd-active); }

.board-skel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding-top: 16px; }
.board-skel__tile { aspect-ratio: 1 / 1; border-radius: 14px; }

.board-f { padding-top: 32px; scroll-margin-top: calc(var(--hdr-off) + 64px); transition: opacity 160ms; }
.board-f--dim { opacity: 0.4; }
.board-f__head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.board-f__face { flex: none; width: 40px; height: 40px; border-radius: 10px; overflow: hidden; background: var(--s2); }
.board-f__head h2 { margin: 0; flex: 1; min-width: 0; font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: -0.02em; }
.board-f__count { flex: none; font-size: 13px; font-weight: 600; color: var(--tx-mu); }

.board-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 700px) { .board-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .board-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; } .board-tile__name { padding: 8px 10px 10px; } }

.board-tile { display: grid; gap: 0; padding: 0; text-align: left; font: inherit; color: inherit; background: var(--s1); border: 1px solid var(--bd); border-radius: 14px; overflow: hidden; cursor: default; transition: border-color 160ms, transform 160ms; }
.board-tile:disabled { opacity: 1; }
.board-tile--target { cursor: pointer; border-color: var(--ac); }
.board-tile--target:hover { transform: translateY(-2px); background: var(--s2); }
.board-tile--chosen { border-color: var(--bd-active); }
.board-tile__img { position: relative; display: block; aspect-ratio: 104 / 105; background: var(--s2); }
.board-tile__badge { position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 8px; background: var(--ac); color: var(--ac-ink); font-size: 12px; font-weight: 700; line-height: 20px; }
.board-tile__name { display: grid; gap: 2px; padding: 10px 12px 12px; font-size: 14px; line-height: 20px; min-width: 0; }
.board-tile__name b { color: var(--tx); }
.board-tile__name span { color: var(--tx-mu); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.board-alts { margin: 12px 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 8px; }
.board-alt { width: 100%; min-height: 56px; display: grid; gap: 2px; padding: 8px 12px; text-align: left; font: inherit; color: var(--tx); background: var(--s2); border: 1px solid var(--bd); border-radius: 12px; cursor: pointer; transition: border-color 160ms, background 160ms; }
.board-alt:hover { border-color: var(--bd-active); background: var(--s3); }
.board-alt[aria-pressed="true"] { border-color: var(--ac); background: var(--s3); outline: 2px solid var(--ac); outline-offset: -3px; }
.board-alt b { font-size: 15px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-alt span { font-size: 13px; line-height: 18px; color: var(--tx-mu); }

.board-locked { margin-top: 8px; }
.board-locked summary { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; color: var(--tx-mu); font-size: 14px; font-weight: 600; cursor: pointer; }
.board-locked ul { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 8px; }
.board-locked li { display: grid; gap: 2px; padding: 8px 12px; border: 1px dashed var(--bd); border-radius: 12px; font-size: 14px; line-height: 20px; color: var(--tx-mu); }
.board-locked li b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-locked li span { font-size: 13px; }

.board-dock { position: fixed; z-index: 6; left: 50%; bottom: calc(12px + var(--safe-bot)); transform: translateX(-50%); width: min(calc(100% - 24px), 560px); box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 16px; background: var(--s3); border: 1px solid var(--ac); border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); }
.board-dock p { flex: 1; min-width: 0; margin: 0; font-size: 15px; line-height: 20px; }
.board-dock b { overflow-wrap: anywhere; }

@media (prefers-reduced-motion: reduce) { .board-tile, .board-alt, .board-f { transition: none; } .board-tile--target:hover { transform: none; } }
</style>
