<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { QBtn, QDialog, QIcon } from 'quasar'
import AppImg from '../../../components/AppImg.vue'
import { back, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { clearAt, planGroups } from '../../plan/composables/usePlan'
import { useSaveStatus } from '../../plan/saveStatus'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'

const desktop = useDesktop()
const { saving, saved, savedHere } = useSaveStatus()

const open = computed(() => {
  tick.value
  return route.value.v === 'cambios'
})

const groups = computed(() => {
  tick.value
  return planGroups().map((group) => ({
    code: group.fighter.code,
    name: group.fighter.name,
    portrait: group.fighter.portrait || null,
    rows: group.rows.map((row) => {
      const cur = curOf(row.code, row.n)
      const skin = skinOf(row.vid)
      const from = currentName(cur)
      const to = skin ? skin.name : 'Skin sin nombre'
      const shown = cur?.kind === 'original' ? 'Original' : from
      return {
        code: row.code,
        n: row.n,
        t: trajeName(row.n),
        from: shown,
        to,
        fromImg: cur ? cur.img : null,
        toImg: thumbOf(skin),
        label: group.fighter.name + ', ' + trajeName(row.n) + ': ' + (shown || 'skin sin nombre') + ' cambia a ' + to,
        quitar: 'Quitar elección, ' + trajeName(row.n) + ' de ' + group.fighter.name,
      }
    }),
  }))
})

const kept = shallowRef<typeof groups.value>([])

const shown = computed(() => (open.value ? groups.value : kept.value))

const empty = computed(() => open.value && !groups.value.length)

const close = () => { if (route.value.v === 'cambios') back() }

const chooseFighter = () => { swap('#/luchadores') }

const goTo = (code: string, n: number) => {
  if (!fighterOf(code)) return

  swap('#/luchador/' + encodeURIComponent(code) + '/' + (n + 1))
}

watch(groups, (value) => { if (value.length) kept.value = value }, { immediate: true })
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
        <section v-for="group in shown" :key="group.code" class="grp">
          <div class="grp__head">
            <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
            <span class="grp__name">{{ group.name }}</span>
          </div>
          <div v-for="row in group.rows" :key="row.code + '_' + row.n" class="srow">
            <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
              <span class="srow__from"><AppImg :src="row.fromImg" fit="contain" /></span>
              <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
              <span class="srow__to"><AppImg :src="row.toImg" fit="contain" /></span>
              <span class="srow__txt">
                <span class="srow__t">{{ row.t }}</span>
                <span class="srow__new">{{ row.to }}</span>
                <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
              </span>
            </button>
            <q-btn flat round padding="0" class="srow__x" :aria-label="row.quitar" :data-undo="row.code + '_' + row.n" @click="clearAt(row.code, row.n)">
              <span class="srow__x-dot"><q-icon name="close" size="16px" aria-hidden="true" /></span>
            </q-btn>
          </div>
        </section>
      </div>
    </div>
  </q-dialog>
</template>
