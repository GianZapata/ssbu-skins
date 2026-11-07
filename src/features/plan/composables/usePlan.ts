import { nextTick, ref } from 'vue'
import type { Fighter, Skin } from '../../../boot'
import { bump, fighterOf, S, scrollMem, route } from '../../../composables/useApp'
import { openGallery } from '../../gallery/composables/useGallery'
import { SSBU, type PlanRow } from '../../../shared/helpers/ssbu'
import { curOf } from '../helpers/lookup'
import { markSaved } from '../saveStatus'
import type { PersonName } from '../enums/PersonName'
import { PlanHelper } from '../helpers/plan.helper'
import { bindPersonSync, requirePerson, syncStoredPerson } from './usePerson'
import {
  addNote,
  bind,
  classify,
  docKey,
  enqueue,
  fail,
  fb,
  flush,
  getPerson,
  keyOf,
  markNote,
  ownEntries,
  ownVariant,
  ownVid,
  paintSync,
  planEntries,
  planVariant,
  planVid,
  proposalsAt,
  savePend,
  setPerson,
  startDb,
  state,
} from '../services/sync'

/** Última vez que ESTE dispositivo cambió cada traje; sirve para distinguir un cambio en vivo de otra persona. */
export const touched: Record<string, number> = {}

export interface ChosenVariant {
  id: string
  source_slot: string
  destination_slot: string
}

interface InventorySnapshot {
  meta?: Record<string, unknown>
}

interface HistoryRecord {
  code: string
  slot: number
  from: string | null
  to: string | null
  from_variant?: string | null
  variant?: string | null
  name?: string | null
  kind: string
  t: number | null
}

interface StatusRecord {
  status?: string
  result?: string | null
}

export interface SavedPulse {
  code: string
  slot: number
  at: number
}

export const lastSavedPulse = ref<SavedPulse | null>(null)

const commitProposal = (
  person: PersonName,
  code: string,
  slot: number,
  vid: string,
  variant: string | null,
  onCommitted?: () => void,
): boolean => {
  const prev = ownVid(code, slot) as string | null
  const prevVariant = ownVariant(code, slot) as string | null

  // Sin selector de variantes en la UI, repetir la misma skin no debe borrar la variante que ya eligió esta persona.
  if (variant === null && vid === prev && prevVariant) return false

  const block = SSBU.assignBlock(ownEntries() as PlanRow[], code, slot, vid, variant)

  if (['duplicate', 'same', 'bad-slot'].includes(block.kind)) return false

  const op = SSBU.setOp(code, slot, vid, prev, variant, prevVariant, person)

  if (!op) return false

  touched[docKey(code, slot, person)] = Date.now()
  touched[keyOf(code, slot)] = Date.now()
  enqueue(op)
  lastSavedPulse.value = { code, slot, at: Date.now() }
  onCommitted?.()

  return true
}

/** El botón del escenario guarda. La cuadrícula no llama aquí. Sin persona elegida abre la hoja y guarda al elegir. */
export const proposeAt = (
  code: string,
  slot: number,
  vid: string,
  variant: string | null = null,
  onCommitted?: () => void,
): boolean => {
  if (!SSBU.validSlot(slot)) return false

  let saved = false

  const hasPerson = requirePerson((person) => {
    saved = commitProposal(person, code, slot, vid, variant, onCommitted)
  })

  if (!hasPerson) return false

  return saved
}

/** Solo deshace la propuesta de la persona activa (o de `author`, si sigue activa); las de otras personas y las antiguas no se tocan. */
export const clearAt = (code: string, slot: number, author?: PersonName | null): boolean => {
  const person = getPerson() as PersonName | null

  if (!person) return false
  if (author !== undefined && author !== person) return false

  const prev = ownVid(code, slot) as string | null
  const prevVariant = ownVariant(code, slot) as string | null
  const op = SSBU.clearOp(code, slot, prev, prevVariant, person)

  if (!op) return false

  touched[docKey(code, slot, person)] = Date.now()
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

export interface NoteItem {
  id: string
  text: string
  done: boolean
  at: number
}

export const addRequest = (text: string) => addNote(text)
export const toggleRequest = (id: string, done: boolean) => markNote(id, done)

export interface Notice {
  text: string
  label: string
  fn: (() => void) | null
}

export interface NoticeAction {
  label?: string
  fn?: () => void
}

export const notice = ref<Notice | null>(null)

let noticeTimer = 0

export const showNotice = (text: string, action?: NoticeAction | null, ms = 0) => {
  const current: Notice = {
    text,
    label: action && action.label ? action.label : '',
    fn: action && action.fn ? action.fn : null,
  }

  window.clearTimeout(noticeTimer)
  notice.value = current
  bump()

  if (!ms) return

  noticeTimer = window.setTimeout(() => {
    if (notice.value === current) notice.value = null
  }, ms)
}

export const dismissNotice = () => { notice.value = null }

const VARIANT_ID = /^.+:[0-9a-f]{8}:c0[0-7]$/

const chosenVariantOf = (entry: PlanRow, variant: string | null | undefined): ChosenVariant | null => {
  if (!variant || !VARIANT_ID.test(variant)) return null

  return {
    id: variant,
    source_slot: variant.slice(-3),
    destination_slot: 'c0' + entry.n,
  }
}

export const exportPlan = () => {
  const meta = globalThis.META
  const inventory = state.INV as InventorySnapshot | null
  const header = (inventory && inventory.meta) || {}
  const entries = planEntries() as PlanRow[]
  const history = (state.HIST as HistoryRecord[]).slice(0, 50)
  const status = state.STATUS as Record<string, StatusRecord>
  return {
    schema: 3,
    generated_at: new Date().toISOString(),
    catalog: meta.generated || null,
    inventory: {
      version: header.version ?? null,
      profile: header.profile ?? null,
      verification: header.verification ?? null,
      scanned_at: header.scanned_at ?? null,
      sources: header.sources ?? null,
    },
    target: { game: 'Super Smash Bros. Ultimate', version: '13.0.5', loader: 'ARCropolis 4.1.1' },
    changes: entries.map((entry) => {
      const fighter = fighterOf(entry.code)
      const current = curOf(entry.code, entry.n)
      const skin = (state.idx as Record<string, { p: Skin }>)[entry.vid]?.p
      const row = status[entry.vid] || {}
      return {
        name: entry.name || null,
        person: PlanHelper.personLabel(entry.name),
        fighter: fighter ? fighter.name : entry.code,
        roster_no: entry.code,
        traje: entry.n + 1,
        slot: 'c0' + entry.n,
        current: { kind: current ? current.kind : null, name: current ? current.name : null, source: current?.src || null, confirmed: false },
        user_destination: { traje: entry.n + 1, slot: 'c0' + entry.n, priority: 'el destino elegido manda sobre dest_hint' },
        replaces: { kind: current ? current.kind : null, name: current ? current.name : null, vid: current?.vid || null },
        relocation: skin && skin.native && skin.native.length
          ? { native_slots: skin.native.map((slot) => 'c0' + slot), needs_move: !skin.native.includes(entry.n), checked: false }
          : null,
        proposal: skin ? {
          vid: skin.vid,
          role: SSBU.isAlt(skin) ? 'alternativa' : 'recomendada',
          variant: skin.variant || null,
          mod_id: skin.id,
          name: skin.name,
          author: skin.author,
          url: skin.url,
          online: SSBU.onlineOf(skin)[1],
          conditions: skin.conditions || null,
          dependencies: skin.deps || null,
          conflicts: skin.conflicts || null,
          native_slots: skin.slots_orig || null,
          dest_hint: skin.dest || null,
          pack: skin.pack,
          withdrawn: !!skin.withdrawn,
          chosen_variant: chosenVariantOf(entry, entry.variant),
        } : null,
        missing_in_catalog: !skin,
        vid: entry.vid,
        variant: entry.variant || null,
        status: row.status || 'wanted',
        result: row.result || null,
      }
    }),
    history: history.map((row) => ({
      at: row.t ? new Date(row.t).toISOString() : null,
      roster_no: row.code,
      traje: row.slot + 1,
      from: row.from,
      to: row.to,
      from_variant: row.from_variant || null,
      variant: row.variant || null,
      name: row.name || null,
      kind: row.kind,
    })),
  }
}

export const downloadPlan = () => {
  const body = JSON.stringify(exportPlan(), null, 2)
  const blob = new Blob([body], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'plan.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

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

const openZoom = (name: string, shots: Shot[], index: number) => {
  const origin = document.activeElement as HTMLElement | null

  void openGallery(name, shots, index, {
    setIndex: (position) => { S.galI = position },
    onClose: () => {
      void nextTick(() => origin?.focus())
    },
  })
}

export const zoomSkin = (skin: Skin, index: number) => {
  openZoom(skin.name, imgsOf(skin), index)
}

/** Una sola imagen, como el retrato de un traje. */
export const zoomImage = (name: string, src: string) => {
  openZoom(name, [{ o: src, m: src, s: src }], 0)
}

/** Ganchos de depuración que ya existían en window; se conservan sin los de pantallas eliminadas. */
const publish = () => {
  const host = window as unknown as Record<string, unknown>
  host.planEntries = planEntries
  host.planVid = planVid
  host.proposeAt = proposeAt
  host.planVariant = planVariant
  host.proposalsAt = proposalsAt
  host.ownVid = ownVid
  host.ownVariant = ownVariant
  host.ownEntries = ownEntries
  host.docKey = docKey
  host.getPerson = getPerson
  host.setPerson = (name: string | null) => {
    syncStoredPerson(name)

    return getPerson()
  }

  host.buildExport = exportPlan
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
  Object.defineProperty(window, 'NOTES', { configurable: true, get: () => state.NOTES })
}

export const bootPlan = () => {
  paintSync()
  void startDb()
}

bind({
  render: () => bump(),
  rebuild: () => bump(),
  paint: () => bump(),
  toast: showNotice,
  noteSaved: (op: unknown) => markSaved(!op),
})
bindPersonSync((person) => {
  setPerson(person)
})
publish()
