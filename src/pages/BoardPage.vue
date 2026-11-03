<script setup lang="ts">
import { QPage } from 'quasar'
import Destinations from '../features/fighters/components/Destinations.vue'
import { useBoard } from '../features/board/useBoard'

const { pick, query, fighters, changes, costumeName, costumeImage, alternatives, toggle, choose, discard, chosenVid } = useBoard()

const fallback = (event: Event, src: string) => {
  const image = event.target as HTMLImageElement

  if (!src || image.src.endsWith(src)) {
    image.removeAttribute('src')

    return
  }

  image.src = src
}
</script>

<template>
  <q-page class="page board-page">
    <h1 class="sr-only">Tarjeta</h1>
    <Destinations />
    <p class="board-lead">Lo de la tarjeta y las alternativas del Drive. Elegir guarda el plan compartido; no instala nada.</p>
    <input v-model="query" class="board-search" type="search" placeholder="Buscar luchador" aria-label="Buscar luchador">

    <section v-if="changes.length" class="board-summary" aria-label="Cambios sin aplicar">
      <h2>Cambios sin aplicar</h2>
      <ul>
        <li v-for="group in changes" :key="group.fighter.code">
          <template v-for="row in group.rows" :key="row.code + row.n">
            <span>{{ group.fighter.name }} · traje {{ row.n + 1 }}</span>
            <button type="button" @click="discard(row.code, row.n)">Descartar cambio</button>
          </template>
        </li>
      </ul>
    </section>

    <p v-if="pick" class="board-pick" role="status">
      Elige el traje que reemplaza «{{ pick.name }}».
      <button type="button" @click="pick = null">Cancelar</button>
    </p>

    <section v-for="fighter in fighters" :id="'f-' + fighter.code" :key="fighter.code" class="board-fighter">
      <h2>{{ fighter.name }}</h2>
      <div class="board-grid">
        <article v-for="n in 8" :key="n" class="board-tile">
          <button
            type="button"
            class="board-shot"
            :disabled="!!pick && pick.code !== fighter.code"
            @click="pick && pick.code === fighter.code ? choose(fighter.code, n - 1) : undefined"
          >
            <img
              v-if="costumeImage(fighter, n - 1)"
              :src="costumeImage(fighter, n - 1)"
              :alt="costumeName(fighter.code, n - 1)"
              @error="fallback($event, '')"
            >
          </button>
          <p class="board-name">
            <strong>Traje {{ n }}</strong>
            <span>{{ costumeName(fighter.code, n - 1) }}</span>
          </p>
          <p v-if="chosenVid(fighter.code, n - 1)" class="board-wanted">Elegida</p>
        </article>
      </div>
      <h3 v-if="alternatives(fighter.code).length">Alternativas</h3>
      <ul v-if="alternatives(fighter.code).length" class="board-alts">
        <li v-for="alt in alternatives(fighter.code)" :key="alt.mod_id + alt.name">
          <button
            type="button"
            :disabled="!alt.vid"
            :aria-pressed="pick?.code === fighter.code && pick?.vid === alt.vid"
            @click="toggle(fighter, alt)"
          >
            {{ alt.name }}
          </button>
          <span v-if="!alt.vid">Aún no está en el catálogo</span>
          <span v-else>{{ alt.any ? 'cualquier color' : 'color ' + alt.slots.join(', ') }}</span>
        </li>
      </ul>
    </section>
  </q-page>
</template>

<style scoped>
.board-lead, .board-pick { color: var(--tx-mu); }
.board-search { width: min(100%, 24rem); margin: 0 0 16px; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 8px; background: var(--s1); color: var(--tx); }
.board-summary, .board-fighter { border-top: 1px solid var(--bd); padding: 16px 0; }
.board-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
@media (min-width: 700px) { .board-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.board-tile { background: var(--s1); border: 1px solid var(--bd); border-radius: 8px; overflow: hidden; }
.board-shot { display: block; width: 100%; padding: 0; border: 0; background: var(--s2); aspect-ratio: 104 / 105; }
.board-shot img { width: 100%; height: 100%; object-fit: contain; }
.board-name, .board-wanted, .board-alts span { display: block; padding: 0 8px 8px; color: var(--tx-mu); font-size: 13px; }
.board-name strong { display: block; color: var(--tx); }
.board-alts { display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: 8px; list-style: none; padding: 0; }
.board-alts button { width: 100%; text-align: left; }
.board-alts button[aria-pressed="true"] { outline: 2px solid var(--tx); }
</style>
