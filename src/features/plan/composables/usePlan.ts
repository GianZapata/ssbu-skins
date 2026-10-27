import { nextTick } from 'vue'
import type { Fighter, Skin } from '../../../boot'
import {
  bump,
  closeDialog,
  DialogKind,
  exportText,
  fighterOf,
  go,
  openDialog,
  paraOf,
  route,
  S,
  scrollMem,
  showDiag,
  showFilters,
  showHist,
  slotOf,
} from '../../../composables/useApp'
import { openGallery } from '../../gallery/composables/useGallery'
import { SSBU, type PlanRow } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'
import { buildExport } from '../helpers/export'
import { changesOf, curOf, skinOf } from '../helpers/lookup'
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

const read = (key: string) => {
  try { return localStorage.getItem(key) } catch (e) { return null }
}
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch (e) { /* el plan sigue en memoria */ }
}
const readJson = (key: string) => {
  try { return JSON.parse(read(key) || 'null') } catch (e) { return null }
}

let toastSlot: number | null = null
let toastTimer = 0

const writeToast = (message: string, action?: { label: string, fn: () => void }) => {
  const el = document.getElementById('toast')
  if (!el) return
  el.classList.add('on')
  el.replaceChildren()
  const span = document.createElement('span')
  span.textContent = message
  el.append(span)
  if (action) {
    const button = document.createElement('button')
    button.type = 'button'
    button.id = 'toastA'
    button.textContent = action.label
    button.onclick = () => {
      el.classList.remove('on')
      action.fn()
    }
    el.append(button)
  }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { el.classList.remove('on') }, action ? 9000 : 3500)
}

const toastProposal = (slot: number, saved: boolean) => {
  toastSlot = slot
  const body = saved
    ? 'El cambio se registró. Todavía no se ha instalado en la consola.'
    : 'Quedó pendiente en este dispositivo. Todavía no se ha instalado en la consola.'
  writeToast('Skin elegida en el ' + trajeName(slot) + '. ' + body, { label: 'Deshacer', fn: undoLast })
}

const noteSaved = (op: { to: string | null, slot: number } | undefined) => {
  if (!op || op.to == null || toastSlot !== op.slot) return
  const el = document.getElementById('toast')
  if (!el || !el.classList.contains('on') || !(el.textContent || '').startsWith('Skin elegida')) return
  toastProposal(op.slot, true)
}

export const showExport = () => {
  exportText.value = JSON.stringify(buildExport(), null, 2).slice(0, 1800)
  openDialog(DialogKind.exportar, 'Exportar')
}

export const copyExport = async () => {
  const text = JSON.stringify(buildExport(), null, 2)
  try {
    await navigator.clipboard.writeText(text)
    writeToast('Copiado')
  } catch (e) {
    writeToast('Selecciona el texto y cópialo')
  }
}

export const downloadExport = () => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' }))
  link.download = 'plan-skins.json'
  link.click()
}

export const copyDiag = async () => {
  const text = JSON.stringify(window.__ssbuDiag(), null, 1)
  try {
    await navigator.clipboard.writeText(text)
    writeToast('Diagnóstico copiado')
  } catch (e) {
    writeToast('No se pudo copiar')
  }
}

export const retrySync = () => {
  state.nextTry = 0
  state.syncKind = null
  paintSync()
  void startDb()
  void flush()
  writeToast('Reintentando…')
}

export const undoLast = () => {
  const act = state.lastAct as { code: string, slot: number, from: string | null, to: string | null } | null
  if (!act) return
  state.lastAct = null
  enqueue({ code: act.code, slot: act.slot, to: act.from, exp: act.to, kind: 'undo' })
  writeToast('Deshecho')
}

export const clearAt = (code: string, slot: number) => {
  const prev = planVid(code, slot) as string | null
  const op = SSBU.clearOp(code, slot, prev)
  if (!op) return
  state.lastAct = { code, slot, from: prev, to: null }
  enqueue(op)
  writeToast('Skin quitada del ' + trajeName(slot) + '.', { label: 'Deshacer', fn: undoLast })
}

export const proposeAt = (code: string, slot: number, vid: string) => {
  if (!SSBU.validSlot(slot)) return
  const prev = planVid(code, slot) as string | null
  const block = SSBU.assignBlock(planEntries(), code, slot, vid)
  if (block.kind === 'duplicate') {
    writeToast('Esa skin ya está en el ' + trajeName(block.other || 0) + '. Elige otra, o revisa ese traje.')
    return false
  }
  if (block.kind === 'same' || block.kind === 'bad-slot') return false
  const op = SSBU.setOp(code, slot, vid, prev)
  if (!op) return false
  S.cand = null
  state.lastAct = { code, slot, from: prev, to: vid }
  enqueue(op)
  toastProposal(slot, false)
  return true
}

export const confirmCandidate = () => {
  if (!S.cand || !route.value.code) return
  proposeAt(route.value.code, slotOf(), S.cand)
}

export const legacyItems = () => {
  if (read('ssbu_mig3')) return []
  const old = readJson('ssbu_sel_v2') as Record<string, { slot?: number }> | null
  if (!old) return []
  const out: Array<{ code: string, slot: number, vid: string }> = []
  Object.entries(old).forEach(([id, value]) => {
    if (!value || value.slot == null) return
    const vid = (state.legacyMap as Record<string, string>)[id]
    const code = id.split(':')[0]
    const fighter = fighterOf(code)
    if (!vid || !fighter || fighter.mii || planVid(code, value.slot)) return
    out.push({ code, slot: value.slot, vid })
  })
  return out
}

export const recoverNo = () => {
  write('ssbu_mig3', '1')
  closeDialog()
  bump()
}

export const recoverGo = () => {
  const rows = legacyItems()
  write('ssbu_mig3', '1')
  rows.forEach((row) => enqueue({ code: row.code, slot: row.slot, to: row.vid, exp: planVid(row.code, row.slot), kind: 'set' }))
  closeDialog()
  writeToast(rows.length + (rows.length > 1 ? ' elecciones añadidas al plan' : ' elección añadida al plan'))
}

export const diagView = () => {
  const info = window.__ssbuDiag()
  let text = 'Todo en orden.'
  if (info.syncKind === 'offline') text = 'Sin conexión: se resuelve solo al volver la red.'
  if (info.syncKind === 'service') text = 'Servicio no disponible: hace falta revisar la configuración de Firebase (ver docs/FIREBASE.md).'
  return { text, info }
}

export const histRows = () => (state.HIST as Array<{ code: string, slot: number, from: string | null, to: string | null, t?: number }>).slice(0, 40).map((row) => {
  const fighter = fighterOf(row.code)
  const to = row.to ? skinOf(row.to) : null
  const from = row.from ? skinOf(row.from) : null
  const what = row.to ? 'puso «' + (to ? to.name : 'otra apariencia') + '»' : 'quitó la propuesta' + (from ? ' «' + from.name + '»' : '')
  return { slot: trajeName(row.slot), who: fighter ? fighter.name : row.code, what, img: to?.img || from?.img || null }
})

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

export const imgsOf = (skin: Skin) => {
  if (skin.g && skin.g.length) return skin.g.map((file) => ({ o: gU(file, 'o'), m: gU(file, 'm'), s: gU(file, 's') }))
  if (skin.img) return [{ o: skin.img, m: skin.img, s: skin.img }]
  return []
}

export const zoomSkin = (skin: Skin, index: number) => {
  void openGallery(skin.name, imgsOf(skin), index, {
    setIndex: (position) => { S.galI = position },
    onClose: () => {
      void nextTick(() => document.querySelector<HTMLElement>('[data-gal]')?.focus())
    },
  })
}

export const useHere = (code: string, vid: string) => {
  const para = paraOf(route.value.q.para)
  const slot = para ? para.n : S.dest
  if (slot == null) return
  if (proposeAt(code, slot, vid) === false) return
  go('#/luchador/' + encodeURIComponent(code) + '/' + (slot + 1))
}

const publish = () => {
  const host = window as unknown as Record<string, unknown>
  host.planEntries = planEntries
  host.planVid = planVid
  host.proposeAt = proposeAt
  host.curOf = curOf
  host.isAlt = (skin: Skin) => SSBU.isAlt(skin)
  host.showHist = showHist
  host.showMenu = showFilters
  host.showExport = showExport
  host.showDiag = showDiag
  host.paintSync = paintSync
  host.buildExport = buildExport
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
  Object.defineProperty(window, 'lastAct', { configurable: true, get: () => state.lastAct, set: (value) => { state.lastAct = value } })
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

bind({
  render: () => bump(),
  rebuild: () => bump(),
  noteSaved,
  toast: (message: string) => writeToast(message),
})
publish()

export const usePlan = () => ({
  planEntries,
  planVid,
  changesOf,
  curOf,
  skinOf,
  clearAt,
  proposeAt,
  confirmCandidate,
  undoLast,
  showExport,
  copyExport,
  downloadExport,
  copyDiag,
  retrySync,
  legacyItems,
  recoverGo,
  recoverNo,
  diagView,
  histRows,
  planGroups,
  countChosen,
  zoomSkin,
  imgsOf,
  useHere,
  bootPlan,
  state,
})
