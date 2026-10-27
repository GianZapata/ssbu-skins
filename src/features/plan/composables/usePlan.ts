import { nextTick } from 'vue'
import type { Fighter, Skin } from '../../../boot'
import { bump, fighterOf, S, scrollMem, route } from '../../../composables/useApp'
import { openGallery } from '../../gallery/composables/useGallery'
import { SSBU, type PlanRow } from '../../../shared/helpers/ssbu'
import { curOf } from '../helpers/lookup'
import {
  bind,
  classify,
  enqueue,
  fail,
  fb,
  flush,
  keyOf,
  paintSync,
  planEntries,
  planVid,
  savePend,
  startDb,
  state,
} from '../services/sync'

/** Última vez que ESTE dispositivo cambió cada traje; sirve para distinguir un cambio en vivo de otra persona. */
export const touched: Record<string, number> = {}

/** Una elección por toque: se guarda al instante, sin paso de confirmación. Todo se puede revertir. */
export const proposeAt = (code: string, slot: number, vid: string) => {
  if (!SSBU.validSlot(slot)) return false
  const prev = planVid(code, slot) as string | null
  const block = SSBU.assignBlock(planEntries(), code, slot, vid)
  if (block.kind === 'duplicate' || block.kind === 'same' || block.kind === 'bad-slot') return false
  const op = SSBU.setOp(code, slot, vid, prev)
  if (!op) return false
  touched[keyOf(code, slot)] = Date.now()
  enqueue(op)
  return true
}

export const clearAt = (code: string, slot: number) => {
  const prev = planVid(code, slot) as string | null
  const op = SSBU.clearOp(code, slot, prev)
  if (!op) return false
  touched[keyOf(code, slot)] = Date.now()
  enqueue(op)
  return true
}

/** Reintento del error global: vuelve a abrir la conexión y a vaciar la cola. */
export const retrySync = () => {
  state.nextTry = 0
  state.syncKind = null
  paintSync()
  void startDb()
  void flush()
}

export const planGroups = () => {
  const groups: Array<{ fighter: Fighter, rows: PlanRow[] }> = []
  ;(planEntries() as PlanRow[]).forEach((row) => {
    const fighter = fighterOf(row.code)
    if (!fighter) return
    let group = groups.find((item) => item.fighter.code === row.code)
    if (!group) {
      group = { fighter, rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
  })
  return groups
}

export const countChosen = () => (planEntries() as PlanRow[]).length

const gU = (file: string, size: string) => {
  const base = globalThis.META.base
  if (size === 'o') return base + '/' + file
  return base + '/' + (size === 'm' ? '530' : '220') + '-90_' + file
}

export interface Shot {
  o: string
  m: string
  s: string
}

export const imgsOf = (skin: Skin): Shot[] => {
  if (skin.g && skin.g.length) return skin.g.map((file) => ({ o: gU(file, 'o'), m: gU(file, 'm'), s: gU(file, 's') }))
  if (skin.img) return [{ o: skin.img, m: skin.img, s: skin.img }]
  return []
}

export const zoomSkin = (skin: Skin, index: number) => {
  void openGallery(skin.name, imgsOf(skin), index, {
    setIndex: (position) => { S.galI = position },
    onClose: () => {
      void nextTick(() => document.querySelector<HTMLElement>('[data-zoom]')?.focus())
    },
  })
}

/** Ganchos de depuración que ya existían en window; se conservan sin los de pantallas eliminadas. */
const publish = () => {
  const host = window as unknown as Record<string, unknown>
  host.planEntries = planEntries
  host.planVid = planVid
  host.proposeAt = proposeAt
  host.curOf = curOf
  host.isAlt = (skin: Skin) => SSBU.isAlt(skin)
  host.paintSync = paintSync
  host.fb = fb
  host.classify = classify
  host.flush = flush
  host.savePend = savePend
  host.fail = fail
  host.S = S
  host.scrollMem = scrollMem
  host.keyOf = keyOf
  Object.defineProperty(window, 'PEND', { configurable: true, get: () => state.PEND })
  Object.defineProperty(window, 'PLAN', { configurable: true, get: () => state.PLAN, set: (value) => { state.PLAN = value } })
  Object.defineProperty(window, 'planLoaded', { configurable: true, get: () => state.planLoaded })
  Object.defineProperty(window, 'flushing', { configurable: true, get: () => state.flushing })
  Object.defineProperty(window, 'syncKind', { configurable: true, get: () => state.syncKind, set: (value) => { state.syncKind = value } })
  Object.defineProperty(window, 'dbState', { configurable: true, get: () => state.dbState, set: (value) => { state.dbState = value } })
  Object.defineProperty(window, 'RT', { configurable: true, get: () => route.value })
  Object.defineProperty(window, 'byCode', { configurable: true, get: () => state.byCode })
  Object.defineProperty(window, 'idx', { configurable: true, get: () => state.idx })
  Object.defineProperty(window, 'F', { configurable: true, get: () => state.F })
  Object.defineProperty(window, 'all', { configurable: true, get: () => state.all })
  Object.defineProperty(window, 'INV', { configurable: true, get: () => state.INV, set: (value) => { state.INV = value } })
}

export const bootPlan = () => {
  paintSync()
  void startDb()
}

/* Sin avisos emergentes: la interfaz cambia sola cuando cambia el plan. */
bind({
  render: () => bump(),
  rebuild: () => bump(),
  paint: () => bump(),
})
publish()
