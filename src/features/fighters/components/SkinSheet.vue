<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { QBtn, QDialog, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { back, paraOf, route, S, skinEntry, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { clearAt, imgsOf, proposeAt, zoomSkin } from '../../plan/composables/usePlan'
import { planEntries } from '../../plan/services/sync'
import { trajeName } from '../../../shared/helpers/text'
import type { PlanRow } from '../../../shared/helpers/ssbu'

const desktop = useDesktop()

const live = computed(() => {
  tick.value
  const r = route.value
  if (r.v !== 'ficha') return null
  const entry = skinEntry(r.vid)
  const para = paraOf(r.q.para)
  if (!entry || !para) return null
  const at = (planEntries() as PlanRow[]).find((row) => row.code === para.code && row.vid === r.vid)
  const placed = at ? at.n : null
  const mode = placed === para.n ? 'remove' : placed !== null ? 'elsewhere' : 'use'
  const blocked = !!entry.p.withdrawn || !!entry.p.mii
  const label = mode === 'remove' ? 'Quitar' : mode === 'elsewhere' ? 'Ir a ' + trajeName(placed as number) : 'Usar en ' + trajeName(para.n)
  return { entry, code: para.code, slot: para.n, vid: r.vid, placed, mode, blocked, label, shots: imgsOf(entry.p) }
})

/* Se conserva el último contenido mientras la hoja baja, para que no se vacíe a media animación. */
const kept = shallowRef<typeof live.value>(null)
watch(live, (value) => { if (value) kept.value = value }, { immediate: true })
const m = computed(() => live.value || kept.value)
const open = computed(() => !!live.value)

const track = ref<HTMLElement | null>(null)
const index = ref(0)
const failed = ref<Record<number, boolean>>({})

watch(() => live.value?.vid, async () => {
  index.value = 0
  failed.value = {}
  await nextTick()
  if (track.value) track.value.scrollLeft = 0
})

const onScroll = () => {
  const el = track.value
  if (!el || !el.firstElementChild) return
  const first = el.firstElementChild as HTMLElement
  const step = first.offsetWidth + 8
  const next = Math.max(0, Math.min((m.value?.shots.length || 1) - 1, Math.round(el.scrollLeft / step)))
  if (next !== index.value) {
    index.value = next
    S.galI = next
  }
}

const dots = computed(() => {
  const total = m.value?.shots.length || 0
  if (total < 2) return []
  const size = Math.min(7, total)
  const from = Math.max(0, Math.min(index.value - 3, total - size))
  return Array.from({ length: size }, (_, k) => {
    const i = from + k
    const d = Math.abs(i - index.value)
    return { i, active: d === 0, d }
  })
})

const step = (dir: number) => {
  const el = track.value
  if (!el || !el.firstElementChild) return
  el.scrollBy({ left: dir * ((el.firstElementChild as HTMLElement).offsetWidth + 8), behavior: 'smooth' })
}

const close = () => { if (route.value.v === 'ficha') back() }

const act = () => {
  const value = live.value
  if (!value || value.blocked) return
  if (value.mode === 'elsewhere') {
    swap('#/luchador/' + encodeURIComponent(value.code) + '/' + ((value.placed as number) + 1))
    return
  }
  if (value.mode === 'use') proposeAt(value.code, value.slot, value.vid)
  else clearAt(value.code, value.slot)
  close()
}

const zoom = (i: number) => { if (m.value) zoomSkin(m.value.entry.p, i) }
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
    <div v-if="m" class="sheet" role="dialog" :aria-label="'Detalle de ' + m.entry.p.name">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__top">
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <div class="sheet__body">
        <div v-if="m.shots.length" class="photos-wrap">
        <div ref="track" class="photos" role="group" :aria-label="'Fotos de ' + m.entry.p.name" @scroll.passive="onScroll">
          <div v-for="(shot, i) in m.shots" :key="shot.m" class="photo">
            <AppImg :src="shot.m" :alt="'Foto ' + (i + 1) + ' de ' + m.shots.length + ' de ' + m.entry.p.name" retry :eager="i < 2" />
            <q-btn flat round padding="0" class="photo__zoom" aria-label="Ampliar foto" data-zoom="1" @click="zoom(i)">
              <span class="photo__zoom-dot"><q-icon name="open_in_full" size="18px" aria-hidden="true" /></span>
            </q-btn>
          </div>
        </div>
          <template v-if="m.shots.length > 1">
            <q-btn v-if="index > 0" flat round padding="0" class="photos__nav photos__nav--prev gt-sm" icon="chevron_left" aria-label="Foto anterior" @click="step(-1)" />
            <q-btn v-if="index < m.shots.length - 1" flat round padding="0" class="photos__nav photos__nav--next gt-sm" icon="chevron_right" aria-label="Foto siguiente" @click="step(1)" />
          </template>
        </div>
        <div v-else class="photo photo--solo">
          <AppImg :src="null" alt="No se pudo cargar la foto" />
        </div>

        <div v-if="dots.length" class="dots" role="img" :aria-label="'Foto ' + (index + 1) + ' de ' + m.shots.length">
          <span v-for="dot in dots" :key="dot.i" class="dot" :class="['dot--' + Math.min(dot.d, 3), { 'dot--on': dot.active }]"></span>
        </div>

        <h2 class="sheet__title">{{ m.entry.p.name }}</h2>
      </div>

      <div class="sheet__foot">
        <q-btn
          v-if="m.entry.p.url"
          outline
          no-caps
          class="btn-quiet btn-link"
          :href="m.entry.p.url"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GameBanana, se abre en una pestaña nueva"
        >
          GameBanana<q-icon name="open_in_new" size="16px" aria-hidden="true" />
        </q-btn>
        <q-btn unelevated no-caps class="btn-main btn-grow" :label="m.label" :disable="m.blocked" data-use="1" @click="act" />
      </div>
    </div>
  </q-dialog>
</template>
