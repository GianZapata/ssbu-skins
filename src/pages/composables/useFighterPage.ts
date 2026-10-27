import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { fighterOf, openSkin, route, S, selectSlot, slotOf, swap, tick } from '../../composables/useApp'
import { clearAt, proposeAt, touched } from '../../features/plan/composables/usePlan'
import { curOf, skinOf } from '../../features/plan/helpers/lookup'
import { keyOf, planEntries, planVid, state } from '../../features/plan/services/sync'
import { SSBU, type PlanRow } from '../../shared/helpers/ssbu'
import { currentName, thumbOf } from '../../shared/helpers/skins'
import { trajeName } from '../../shared/helpers/text'

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

export interface Cell {
  n: number
  sel: boolean
  vid: string | null
  label: string
  quitar: string
  current: { name: string, img: string | null, original: boolean }
  next: { name: string, img: string | null, vid: string } | null
}

export const useFighterPage = () => {
  const model = computed(() => {
    tick.value
    const code = route.value.code
    const fighter = fighterOf(code)
    const slot = slotOf()
    if (!fighter) return { fighter: null, code, slot, cells: [] as Cell[], rows: [], total: 0 }
    const usable = !fighter.mii

    const cells: Cell[] = SLOTS.map((n) => {
      const cur = curOf(code, n)
      const name = currentName(cur)
      const original = cur?.kind === 'original'
      const vid = usable ? (planVid(code, n) as string | null) : null
      const skin = vid ? skinOf(vid) : null
      const next = vid ? { name: skin ? skin.name : 'Skin sin nombre', img: thumbOf(skin), vid } : null
      const shown = original ? 'original' : name || 'skin sin nombre'
      const label = next ? trajeName(n) + ': ' + shown + ' cambia a ' + next.name : trajeName(n) + ': ' + shown
      return {
        n,
        sel: n === slot,
        vid,
        label,
        quitar: 'Quitar skin de ' + trajeName(n),
        current: { name, img: cur ? cur.img : null, original },
        next,
      }
    })

    // Skins del luchador, buscadas por nombre. Cada una sabe en qué traje está ya.
    const placed = new Map<string, number>()
    ;(planEntries() as PlanRow[]).filter((row) => row.code === code).forEach((row) => placed.set(row.vid, row.n))
    const all = usable ? SSBU.catList(state.all, { code }, S.tc) : []
    const rows = all.map(({ p }) => {
      const at = placed.has(p.vid) ? (placed.get(p.vid) as number) : null
      const chosen = at === slot
      const other = at !== null && !chosen ? at : null
      const label = chosen
        ? p.name + ', elegida para ' + trajeName(slot)
        : other !== null
          ? p.name + ', ya está en ' + trajeName(other)
          : p.name + ', usar en ' + trajeName(slot)
      return { vid: p.vid, name: p.name, img: thumbOf(p), chosen, other, label, detail: 'Ver detalle de ' + p.name }
    })
    const total = usable ? SSBU.catList(state.all, { code }, SSBU.emptyCat()).length : 0
    return { fighter, code, slot, cells, rows, total }
  })

  const stage = computed(() => {
    const m = model.value
    return m.cells[m.slot] || null
  })

  /** Un toque, una decisión guardada: elegir, o volver a tocar la elegida para quitarla. */
  const pick = (vid: string) => {
    const m = model.value
    if (!m.fighter) return
    const row = m.rows.find((item) => item.vid === vid)
    if (!row) return
    if (row.chosen) {
      clearAt(m.code, m.slot)
      return
    }
    // Una skin no puede estar en dos trajes a la vez: se abre su detalle, que ofrece ir al otro traje.
    if (row.other !== null) {
      openSkin(m.code, m.slot, vid)
      return
    }
    proposeAt(m.code, m.slot, vid)
  }

  const openDetail = (vid: string) => openSkin(model.value.code, model.value.slot, vid)
  const openStage = () => {
    const cell = stage.value
    if (cell && cell.next) openDetail(cell.next.vid)
  }
  const clear = (n: number) => clearAt(model.value.code, n)

  /* Pulso al elegir (de este dispositivo) y halo cuando alguien cambia un traje en vivo. */
  const pulse = reactive<Record<number, 'local' | 'live'>>({})
  const timers: number[] = []
  let baseline = ''
  let baseCode = ''
  watch(
    () => model.value.cells.map((cell) => cell.vid || '').join('|') + '@' + model.value.code,
    (snapshot) => {
      const code = model.value.code
      const was = baseline.split('|')
      const now = model.value.cells.map((cell) => cell.vid || '')
      const same = baseCode === code && baseline !== ''
      baseline = snapshot.split('@')[0]
      baseCode = code
      if (!same) return
      now.forEach((vid, n) => {
        if (vid === (was[n] || '')) return
        const mine = Date.now() - (touched[keyOf(code, n)] || 0) < 3000
        pulse[n] = mine ? 'local' : 'live'
        timers.push(window.setTimeout(() => { delete pulse[n] }, mine ? 320 : 640))
      })
    },
    { immediate: true },
  )
  onBeforeUnmount(() => timers.forEach((id) => window.clearTimeout(id)))

  return { model, stage, pulse, pick, openDetail, openStage, clear, selectSlot, swap, trajeName }
}
