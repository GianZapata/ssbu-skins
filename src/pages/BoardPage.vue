<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage, QSkeleton } from 'quasar'
import AppImg from '../components/AppImg.vue'
import { previewUrl } from '../features/board/portrait'
import { useBoard } from '../features/board/useBoard'
import Destinations from '../features/fighters/components/Destinations.vue'

const {
  pick,
  query,
  filter,
  loading,
  compact,
  fighters,
  countsLabel,
  filterLabel,
  densityLabel,
  emptyLabel,
  variantsLabel,
  missingPortrait,
  filterOn,
  filterChoices,
  costumeName,
  costumeImage,
  missingPortraitLabel,
  available,
  locked,
  toggle,
  choose,
  discard,
  chosenVid,
  jumpTo,
  jumpFromSelect,
  setFilter,
  clearFilter,
  clearQuery,
  cancelPick,
  toggleDensity,
  ownSlots,
  isOwn,
  pendingCount,
  costumeHit,
  fighterSubtitle,
  jumpOption,
  filterChoiceLabel,
  pendingLabel,
  pendingStrip,
  altChosenLabel,
  slotsLabel,
} = useBoard()
</script>

<template>
  <q-page class="page fighters-page board" :class="{ 'board--picking': pick, 'board--expanded': !compact }">
    <h1 class="sr-only">Tarjeta</h1>
    <Destinations />

    <div class="search-row board-tools">
      <q-input
        v-model="query"
        class="search"
        outlined
        type="search"
        placeholder="Buscar luchador o skin"
        aria-label="Buscar luchador o skin"
        autocomplete="off"
        :disable="loading"
      >
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
        <template #append>
          <q-btn v-if="query" flat round dense icon="close" aria-label="Borrar búsqueda" class="search__clear" @click="clearQuery" />
        </template>
      </q-input>
      <p class="board-counts" aria-live="polite">{{ countsLabel }}</p>
      <details class="board-filters">
        <summary :class="{ 'board-filters__sum--on': filterOn }">{{ filterLabel }}</summary>
        <div class="board-filters__list" role="group" aria-label="Filtros">
          <button
            v-for="choice in filterChoices"
            :key="choice"
            type="button"
            :aria-pressed="filter === choice"
            :class="{ 'board-filters__btn--on': filter === choice }"
            class="board-filters__btn"
            @click="setFilter(choice)"
          >
            {{ filterChoiceLabel(choice) }}
          </button>
          <button v-if="filterOn" type="button" class="board-filters__btn" @click="clearFilter">Limpiar filtros</button>
        </div>
      </details>
      <button
        type="button"
        class="board-density"
        :aria-pressed="!compact"
        :aria-label="densityLabel"
        :disabled="loading"
        @click="toggleDensity"
      >
        {{ densityLabel }}
      </button>
    </div>

    <div class="board-jump">
      <label class="sr-only" for="mobile-jump">Cambiar luchador</label>
      <select id="mobile-jump" class="board-jump__select" @change="jumpFromSelect">
        <option value="">Ir a un luchador…</option>
        <option v-for="fighter in fighters" :key="fighter.code" :value="fighter.code">{{ jumpOption(fighter) }}</option>
      </select>
    </div>

    <p v-if="!loading && fighters.length" class="board-note">
      <span class="board-note__key"><i class="board-dot board-dot--own" aria-hidden="true"></i>Tu skin</span>
      <span class="board-note__key"><i class="board-dot" aria-hidden="true"></i>Original o WuBoy</span>
      <span class="board-note__soon">{{ variantsLabel }}</span>
    </p>

    <div v-if="loading" class="board-skel" role="status" aria-busy="true" aria-label="Cargando tarjeta">
      <span class="sr-only">Cargando tarjeta</span>
      <q-skeleton v-for="n in 8" :key="n" class="board-skel__tile" animation="pulse" square />
    </div>

    <div v-else-if="!fighters.length" class="empty" role="status">
      <q-icon name="search_off" size="40px" aria-hidden="true" />
      <b>{{ emptyLabel }}</b>
    </div>

    <div v-else class="board-layout">
      <nav class="board-rail" aria-label="Luchadores">
        <a
          v-for="fighter in fighters"
          :key="fighter.code"
          :href="'#f-' + fighter.code"
          class="board-rail__btn"
          :data-rail="fighter.code"
          @click.prevent="jumpTo(fighter.code)"
        >
          <span class="board-rail__name">{{ fighter.name }}</span>
          <span v-if="pendingCount(fighter.code)" class="board-rail__pend">{{ pendingCount(fighter.code) }}</span>
          <small
            class="board-rail__own"
            :class="{ 'board-rail__own--full': ownSlots(fighter.code) === 8 }"
            :title="ownSlots(fighter.code) + ' de 8 trajes propios'"
          >{{ ownSlots(fighter.code) }}/8</small>
        </a>
      </nav>

      <div class="board-list">
        <section
          v-for="fighter in fighters"
          :id="'f-' + fighter.code"
          :key="fighter.code"
          class="board-f"
          :class="{ 'board-f--dim': pick && pick.code !== fighter.code }"
          :data-fighter="fighter.code"
          :data-keep="fighter.code"
          :aria-label="fighter.name"
        >
          <header class="board-f__head">
            <h2>
              {{ fighter.name }}
              <span
                class="board-f__own"
                :class="{ 'board-f__own--full': ownSlots(fighter.code) === 8 }"
                :title="ownSlots(fighter.code) + ' de 8 trajes completados con tus skins'"
              >{{ ownSlots(fighter.code) }}/8</span>
            </h2>
            <span class="board-f__sub">{{ fighterSubtitle(fighter.code) }}</span>
            <span v-if="pendingCount(fighter.code)" class="board-f__pend">{{ pendingLabel(fighter.code) }}</span>
          </header>

          <div class="board-grid">
            <div
              v-for="n in 8"
              :key="n"
              class="board-tile"
              :class="{
                'board-tile--target': pick && pick.code === fighter.code,
                'board-tile--chosen': chosenVid(fighter.code, n - 1),
                'board-tile--own': isOwn(fighter.code, n - 1),
                'board-tile--hit': costumeHit(fighter.code, n - 1),
              }"
              :data-n="n"
              :data-pending="chosenVid(fighter.code, n - 1) ? 'true' : null"
            >
              <button
                type="button"
                class="board-tile__hit"
                :aria-disabled="!pick || pick.code !== fighter.code"
                :aria-label="'Traje ' + n + ', ' + costumeName(fighter.code, n - 1) + (isOwn(fighter.code, n - 1) ? ', tu skin' : '') + (pick && pick.code === fighter.code ? '. Poner aquí ' + pick.name : '')"
                @click="choose(fighter.code, n - 1)"
              >
                <span class="board-tile__img">
                  <AppImg
                    :src="costumeImage(fighter, n - 1)"
                    fit="contain"
                    :missing="costumeImage(fighter, n - 1) ? '' : missingPortrait"
                    :alt="costumeImage(fighter, n - 1) ? '' : missingPortraitLabel(costumeName(fighter.code, n - 1))"
                  />
                </span>
                <span class="board-tile__name">
                  <b><i class="board-dot" :class="{ 'board-dot--own': isOwn(fighter.code, n - 1) }" aria-hidden="true"></i>Traje {{ n }}</b>
                  <span>{{ costumeName(fighter.code, n - 1) }}</span>
                </span>
              </button>
              <div v-if="chosenVid(fighter.code, n - 1)" class="board-tile__pend">
                <p>{{ pendingStrip(fighter.code, n - 1) }}</p>
                <q-btn
                  no-caps
                  unelevated
                  class="btn-quiet board-tile__undo"
                  label="Descartar"
                  :aria-label="'Descartar el cambio del traje ' + n + ' de ' + fighter.name"
                  @click="discard(fighter.code, n - 1)"
                />
              </div>
            </div>
          </div>

          <div v-if="available(fighter.code).length" class="board-alts-wrap">
            <h3>Alternativas descargadas · {{ available(fighter.code).length }}</h3>
            <ul class="board-alts" aria-label="Alternativas del Drive">
              <li v-for="alt in available(fighter.code)" :key="alt.mod_id + alt.name">
                <div
                  class="board-alt"
                  :class="{ 'board-alt--on': pick?.code === fighter.code && pick?.vid === alt.vid }"
                >
                  <span class="board-alt-img">
                    <AppImg
                      v-if="alt.img"
                      :src="previewUrl(alt.img)"
                      fit="cover"
                    />
                    <AppImg
                      v-else
                      :src="null"
                      :missing="missingPortrait"
                      :alt="missingPortraitLabel(alt.name)"
                    />
                  </span>
                  <span v-if="altChosenLabel(fighter.code, alt.vid || '')" class="board-alt__chosen">{{ altChosenLabel(fighter.code, alt.vid || '') }}</span>
                  <span class="board-alt-txt">
                    <b>{{ alt.name }}</b>
                    <span>{{ slotsLabel(alt) }}<em v-if="alt.unaudited"> · Sin auditar</em></span>
                  </span>
                  <button
                    type="button"
                    class="board-alt__go"
                    :aria-pressed="pick?.code === fighter.code && pick?.vid === alt.vid"
                    @click="toggle(fighter, alt)"
                  >
                    Elegir
                  </button>
                </div>
              </li>
            </ul>
          </div>
          <p v-else class="board-alts-empty">Sin alternativas descargadas para este luchador.</p>

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
      </div>
    </div>

    <div v-if="pick" class="board-dock" role="status">
      <p>Poner <b>{{ pick.name }}</b> en… toca un traje.</p>
      <q-btn no-caps unelevated class="btn-quiet" label="Cancelar" @click="cancelPick" />
    </div>
  </q-page>
</template>

<style scoped>
.board { padding-bottom: calc(96px + var(--safe-bot)); }

.board-tools { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; position: static; padding-bottom: 8px; }
.board-tools .search { grid-column: 1 / -1; }
.board-counts { grid-column: 1; grid-row: 2; margin: 0; min-width: 0; font-size: 12px; line-height: 16px; color: var(--color-mute); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.board-filters { grid-row: 2; }
.board-density { grid-row: 2; }
.board-filters { position: relative; }
.board-filters summary {
  list-style: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--color-edge);
  border-radius: 8px;
  background: var(--color-raise);
  color: var(--color-ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.board-filters summary::-webkit-details-marker { display: none; }
.board-filters__sum--on { border-color: var(--color-pend); color: var(--color-pend); }
.board-filters__list {
  position: absolute;
  z-index: 5;
  top: calc(100% + 4px);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 12rem;
  padding: 8px;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: var(--color-surface);
}
.board-filters__btn {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-edge);
  border-radius: 8px;
  background: var(--color-raise);
  color: var(--color-ink);
  font: inherit;
  font-size: 14px;
  text-align: left;
}
.board-filters__btn--on { border-color: var(--color-pend); color: var(--color-pend); }
.board-density {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-edge);
  border-radius: 8px;
  background: var(--color-raise);
  color: var(--color-mute);
  font: inherit;
  font-size: 12px;
}
.board-jump { position: sticky; top: var(--hdr-off); z-index: 4; padding: 4px 0 8px; background: var(--bg); }
.board-note { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin: 0 0 4px; font-size: 12px; line-height: 16px; color: var(--color-mute); }
.board-note__key { display: inline-flex; align-items: center; gap: 6px; }
.board-note__soon { color: var(--color-dim); }
.board-dot { flex: none; display: inline-block; width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid var(--color-dim); border-radius: 50%; }
.board-dot--own { border-color: var(--color-actual); background: var(--color-actual); }
.board-jump__select {
  width: 100%;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid var(--color-edge);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}

.board-layout { display: grid; gap: 16px; }
.board-rail { display: none; }
.board-rail__btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 44px;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--color-mute);
  text-decoration: none;
  font-size: 13px;
}
.board-rail__btn:hover { background: var(--color-raise); color: var(--color-ink); }
.board-rail__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-rail__pend { flex: none; border-radius: 999px; padding: 0 6px; background: var(--color-pendbg); color: var(--color-pend); font-size: 12px; font-weight: 600; }
.board-rail__own { flex: none; border-radius: 4px; padding: 0 4px; color: var(--color-dim); font-size: 11px; font-weight: 700; }
.board-rail__own--full { color: var(--color-actual); background: var(--color-actualbg); }

.board-skel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding-top: 16px; }
.board-skel__tile { aspect-ratio: 1 / 1; border-radius: 8px; }

.board-f { padding: 24px 0; border-bottom: 1px solid var(--color-line); scroll-margin-top: calc(var(--hdr-off) + 64px); transition: opacity 160ms var(--ease-out-expo); }
.board-f--dim { opacity: 0.4; }
.board-f__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px; margin-bottom: 12px; }
.board-f__head h2 { margin: 0; display: flex; align-items: center; gap: 10px; font-size: 22px; line-height: 28px; font-weight: 700; letter-spacing: -0.02em; }
.board-f__own { flex: none; border-radius: 999px; padding: 2px 10px; border: 1px solid var(--color-line); background: var(--color-raise); color: var(--color-mute); font-size: 12px; font-weight: 700; }
.board-f__own--full { border-color: color-mix(in srgb, var(--color-actual) 40%, transparent); background: var(--color-actualbg); color: var(--color-actual); }
.board-f__sub { font-size: 14px; color: var(--color-mute); }
.board-f__pend { font-size: 14px; font-weight: 600; color: var(--color-pend); }

.board-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.board-tile { display: flex; flex-direction: column; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 8px; overflow: hidden; }
.board-tile--own { border-color: var(--color-line); }
.board-tile:not(.board-tile--own) { border-color: color-mix(in srgb, var(--color-line) 50%, transparent); opacity: 0.9; }
.board-tile--hit { box-shadow: 0 0 0 2px var(--color-pend); border-color: var(--color-pend); }
.board-tile--target { border-color: var(--color-pend); }
.board-tile--chosen { border-color: color-mix(in srgb, var(--color-pend) 70%, transparent); }
.board-tile__hit {
  display: grid;
  gap: 0;
  padding: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: default;
}
.board-tile--target .board-tile__hit { cursor: pointer; }
.board-tile__img { position: relative; display: block; box-sizing: border-box; height: clamp(8rem, 16vw, 11rem); padding: 8px; background: var(--color-stage); }
.board-tile__img :deep(.app-img) { background: transparent; }
.board--expanded .board-tile__img { height: clamp(10rem, 20vw, 13.5rem); }
.board-tile__name { display: grid; gap: 2px; padding: 8px 10px 10px; font-size: 14px; line-height: 20px; min-width: 0; }
.board-tile__name b { display: flex; align-items: center; gap: 6px; color: var(--color-ink); }
.board-tile__name span { color: var(--color-mute); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-tile__pend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid color-mix(in srgb, var(--color-pend) 40%, transparent);
  background: var(--color-pendbg);
}
.board-tile__pend p { margin: 0; font-size: 12px; font-weight: 600; color: var(--color-pend); }
.board-tile__undo { min-height: 44px; align-self: flex-end; }

.board-alts-wrap { margin-top: 20px; }
.board-alts-wrap h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--color-mute); }
.board-alts { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: 8px; }
.board-alt { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 8px; }
.board-alt--on { border-color: var(--color-pend); }
.board-alt-img { display: block; position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: var(--color-stage); }
.board-alt__chosen { position: absolute; top: 12px; left: 12px; border-radius: 999px; padding: 0 6px; background: var(--color-bg); color: var(--color-pend); font-size: 12px; font-weight: 600; }
.board-alt-txt { display: grid; gap: 2px; min-width: 0; }
.board-alt em { font-style: normal; color: var(--color-pend); }
.board-alt b { font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-alt span { font-size: 12px; line-height: 16px; color: var(--color-mute); }
.board-alt__go {
  min-height: 44px;
  width: 100%;
  border: 1px solid var(--color-edge);
  border-radius: 6px;
  background: var(--color-raise);
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
}
.board-alts-empty { margin: 16px 0 0; font-size: 14px; color: var(--color-dim); }

.board-locked { margin-top: 8px; }
.board-locked summary { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; color: var(--color-mute); font-size: 14px; font-weight: 600; cursor: pointer; }
.board-locked ul { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 8px; }
.board-locked li { display: grid; gap: 2px; padding: 8px 12px; border: 1px dashed var(--color-line); border-radius: 12px; font-size: 14px; line-height: 20px; color: var(--color-mute); }
.board-locked li b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.board-locked li span { font-size: 13px; }

.board-dock { position: fixed; z-index: 6; left: 50%; bottom: calc(12px + var(--safe-bot)); transform: translateX(-50%); width: min(calc(100% - 24px), 560px); box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 16px; background: var(--color-stage); border: 1px solid var(--color-pend); border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); }
.board-dock p { flex: 1; min-width: 0; margin: 0; font-size: 15px; line-height: 20px; }
.board-dock b { overflow-wrap: anywhere; }

@media (min-width: 700px) { .board-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } }
@media (min-width: 1024px) {
  .board-jump { display: none; }
  .board-tools { display: flex; flex-wrap: wrap; position: sticky; }
  .board-tools .search { flex: 1 1 16rem; }
  .board-counts { flex: 1 1 12rem; display: block; }
  .board-layout { grid-template-columns: 9.5rem minmax(0, 1fr); align-items: start; gap: 24px; }
  .board-rail { display: flex; flex-direction: column; position: sticky; top: calc(var(--hdr-off) + 8px); max-height: calc(100dvh - var(--hdr-off) - 24px); overflow-y: auto; }
  .board-grid { gap: 16px; }
}
@media (prefers-reduced-motion: reduce) { .board-f { transition: none; } }
</style>
