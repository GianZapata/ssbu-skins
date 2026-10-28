import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import type { Skin } from '../../boot'
import { fighterOf, openSkin, S, selectSlot, slotOf, swap, tick, viewRoute } from '../../composables/useApp'
import { activeCandidate, candidateRoams, clearCandidate, consumeHandoff, followCandidate, setCandidate } from '../../features/fighters/candidate'
import { commitStage } from '../../features/fighters/stage'
import { clearAt, touched } from '../../features/plan/composables/usePlan'
import { curOf, skinOf } from '../../features/plan/helpers/lookup'
import { keyOf, planEntries, planVid, state } from '../../features/plan/services/sync'
import { PulseKind } from '../../features/fighters/enums/PulseKind'
import { SSBU, type PlanRow, type StageChoice } from '../../shared/helpers/ssbu'
import { coverOf, currentName } from '../../shared/helpers/skins'
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

const gridLabel = (name: string, chosen: boolean, other: number | null) => {
  if (chosen) return name + ', en Nueva'
  if (other !== null) return name + ', ya está en ' + trajeName(other)

  return name
}

export const useFighterPage = () => {
  // Pulso al elegir (de este dispositivo) y halo cuando alguien cambia un traje en vivo.
  const pulse = reactive<Record<number, PulseKind>>({})

  let timers: number[] = []
  let baseline = ''
  let baseCode = ''

  const model = computed(() => {
    tick.value

    const code = viewRoute().code
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
      const next = vid ? { name: skin ? skin.name : 'Skin sin nombre', img: coverOf(skin), vid } : null
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

    // La cuadrícula solo marca la candidata. El plan no cambia hasta el botón.
    const placed = new Map<string, number>()
    const mine = (planEntries() as PlanRow[]).filter((row) => row.code === code)

    mine.forEach((row) => placed.set(row.vid, row.n))

    const staged = activeCandidate(code, slot)
    const all = usable ? SSBU.catList(state.all, { code }, S.tc) : []
    const rows = all.map(({ p }) => {
      const at = placed.has(p.vid) ? (placed.get(p.vid) as number) : null
      const chosen = staged ? p.vid === staged.vid : at === slot
      const other = at !== null && at !== slot ? at : null
      const label = gridLabel(p.name, chosen, other)

      return { vid: p.vid, name: p.name, img: coverOf(p), chosen, other, label, detail: 'Ver detalle de ' + p.name }
    })

    const total = usable ? SSBU.catList(state.all, { code }, SSBU.emptyCat()).length : 0

    return { fighter, code, slot, cells, rows, total }
  })

  const stage = computed(() => {
    const m = model.value

    return m.cells[m.slot] || null
  })

  const preview = computed(() => {
    const m = model.value
    const skin = activeCandidate(m.code, m.slot)

    if (skin) return { name: skin.name, img: coverOf(skin), vid: skin.vid }

    return stage.value && stage.value.next ? stage.value.next : null
  })

  const choice = computed((): StageChoice => {
    tick.value

    const m = model.value
    const skin = activeCandidate(m.code, m.slot)
    const saved = stage.value ? stage.value.vid : null
    const placed = skin
      ? (planEntries() as PlanRow[]).find((row) => row.code === m.code && row.vid === skin.vid && row.n !== m.slot)
      : null

    const choice = SSBU.stageChoice({
      slot: m.slot,
      vid: skin ? skin.vid : null,
      saved,
      elsewhere: placed ? placed.n : null,
      withdrawn: !!(skin && skin.withdrawn),
      mii: !!(m.fighter && m.fighter.mii) || !!(skin && skin.mii),
      incompatible: !!(skin && skin.wifi_status === 'incompatible'),
    })

    if (!candidateRoams.value || !skin) return choice

    return { ...choice, line: 'Toca otro traje para compararla ahí' }
  })

  const skinAt = (vid: string) => {
    const entry = (state.idx as Record<string, { p: Skin }>)[vid]

    return entry ? entry.p : null
  }

  /** La cuadrícula deja la skin en Nueva. No escribe el plan. */
  const pick = (vid: string) => {
    const m = model.value
    const skin = skinAt(vid)

    if (!m.fighter || !skin) return

    setCandidate(m.code, m.slot, skin)
  }

  const openDetail = (vid: string) => {
    const m = model.value

    openSkin(m.code, m.slot, vid)
  }

  const commit = () => {
    const m = model.value

    commitStage(m.code, m.slot, choice.value, activeCandidate(m.code, m.slot))
  }

  const applyHandoff = (code: string, slot: number) => {
    const vid = consumeHandoff(code, slot)

    if (!vid) return false

    const skin = skinOf(vid)

    if (skin) setCandidate(code, slot, skin)

    return true
  }

  const openStage = () => {
    const shown = preview.value

    if (shown) openDetail(shown.vid)
  }

  const clear = (n: number) => clearAt(model.value.code, n)

  watch(
    () => model.value.code + ':' + model.value.slot,
    (key, prev) => {
      if (!prev || key === prev) return

      const [code, slotText] = key.split(':')
      const slot = Number(slotText)

      if (!applyHandoff(code, slot) && !followCandidate(code, slot)) clearCandidate()
    },
  )

  watch(
    () => (model.value.fighter ? model.value.code + ':' + model.value.slot : ''),
    (key) => {
      if (!key) return

      const [code, slotText] = key.split(':')

      applyHandoff(code, Number(slotText))
    },
    { immediate: true },
  )

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

        pulse[n] = mine ? PulseKind.Local : PulseKind.Live
        timers.push(window.setTimeout(() => { delete pulse[n] }, mine ? 320 : 640))
      })
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    timers.forEach((id) => window.clearTimeout(id))
    clearCandidate()
  })

  return { model, stage, preview, choice, pulse, pick, openDetail, openStage, commit, clear, selectSlot, swap, trajeName }
}
