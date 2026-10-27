import { nextTick, reactive, ref, shallowRef } from 'vue'
import type { Fighter, Skin } from '../boot'
import { state } from '../features/plan/services/sync'
import { SSBU, type CatState } from '../shared/helpers/ssbu'
import { trajeName } from '../shared/helpers/text'

export interface AppRoute {
  v: string
  code: string
  n: number
  vid: string
  q: Record<string, string>
  key: string
}

export enum DialogKind {
  hist = 'hist',
  exportar = 'exportar',
  diag = 'diag',
  filters = 'filters',
  recover = 'recover',
}

const PAGE = 40
const read = (key: string) => {
  try { return localStorage.getItem(key) } catch (e) { return null }
}
const readJson = (key: string) => {
  try { return JSON.parse(read(key) || 'null') } catch (e) { return null }
}

export const tick = ref(0)
export const bump = () => { tick.value += 1 }
export const S = reactive({
  fq: '',
  cat: SSBU.migrateCat(readJson('ssbu_cat')) as CatState,
  tc: SSBU.emptyCat(),
  shown: PAGE,
  nav: 0,
  fresh: true,
  dest: null as number | null,
  destFor: '',
  galI: 0,
  cand: null as string | null,
})
export const route = shallowRef<AppRoute>({ v: '', code: '', n: 0, vid: '', q: {}, key: '' })
export const dialog = reactive({ open: false, kind: DialogKind.filters, title: '', nested: false })
export const exportText = ref('')
export const scrollMem: Record<string, number> = {}

let focusSlot = false
let listening = false
const overlays: string[] = []
let skipOverlay = 0
let afterOverlay: (() => void) | null = null

export const ovPush = (id: string) => {
  overlays.push(id)
  try { history.pushState({ ov: id }, '') } catch (e) { /* el aviso sigue sin historial */ }
}

export const ovDone = (id: string, then?: () => void) => {
  const index = overlays.lastIndexOf(id)
  if (index < 0) return false
  overlays.splice(index, 1)
  const current = history.state as { ov?: string } | null
  if (current && current.ov === id) {
    afterOverlay = then || null
    skipOverlay += 1
    history.back()
    return true
  }
  if (then) then()
  return true
}

let lastFocusedTrigger: HTMLElement | null = null

const closeDialogDom = () => {
  dialog.open = false
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-open')
    const trigger = lastFocusedTrigger
    lastFocusedTrigger = null
    void nextTick(() => {
      if (trigger && typeof trigger.focus === 'function') trigger.focus()
    })
  }
}

const hideOverlay = (id: string) => {
  if (id === 'dlg') {
    closeDialogDom()
    return
  }
  const gallery = window.PSWP as { destroy?: () => void } | null
  if (id !== 'gal' || !gallery) return
  window.PSWP = null
  try { gallery.destroy?.() } catch (e) { /* ya cerrado */ }
}

const blank = (partial: Partial<AppRoute>): AppRoute => ({
  v: 'luchadores',
  code: '',
  n: 0,
  vid: '',
  q: {},
  key: '#/luchadores',
  ...partial,
})

const parse = (hash: string) => {
  const raw = hash.replace(/^#/, '') || '/luchadores'
  const [path, qs] = raw.split('?')
  const q = Object.fromEntries(new URLSearchParams(qs || ''))
  const seg = path.split('/').filter(Boolean).map((part) => {
    try { return decodeURIComponent(part) } catch (e) { return part }
  })
  const view = seg[0] || 'luchadores'
  const key = hash || '#/luchadores'
  if (view === 'luchador' && seg[2]) return blank({ v: 'traje', code: seg[1], n: Number(seg[2]) - 1, q, key })
  if (view === 'luchador') return blank({ v: 'luchador', code: seg[1], q, key })
  if (view === 'apariencia') return blank({ v: 'ficha', vid: seg.slice(1).join('/'), q, key })
  if (view === 'catalogo' || view === 'cambios') return blank({ v: view, q, key })
  return blank({ q, key })
}

export const fighterOf = (code: string) => (state.byCode as Record<string, Fighter>)[code]
export const skinEntry = (vid: string) => (state.idx as Record<string, { f: Fighter, p: Skin }>)[vid]
export const slotOf = () => (route.value.v === 'traje' && SSBU.validSlot(route.value.n) ? route.value.n : 0)
export const onFighter = () => {
  const fighter = fighterOf(route.value.code)
  return !!fighter && !fighter.mii && (route.value.v === 'luchador' || route.value.v === 'traje')
}
export const catState = () => (onFighter() ? S.tc : S.cat)
export const paraOf = (raw: string | undefined) => {
  const match = /^(.+)_([0-7])$/.exec(raw || '')
  if (!match || !fighterOf(match[1])) return null
  return { code: match[1], n: Number(match[2]), raw: raw || '' }
}

export const titleOf = () => {
  const current = route.value
  if (current.v === 'luchadores' || current.v === '') return 'Luchadores'
  if (current.v === 'catalogo') return 'Catálogo'
  if (current.v === 'cambios') return 'Elegidas'
  if (current.v === 'ficha') return fighterOf(skinEntry(current.vid)?.f.code || '')?.name || 'Apariencia'
  return fighterOf(current.code)?.name || 'Luchador'
}

export const showBack = () => route.value.v === 'traje' || route.value.v === 'luchador' || route.value.v === 'ficha' || route.value.v === 'cambios'

export const openDialog = (kind: DialogKind, title: string) => {
  const already = dialog.open
  if (!already && typeof document !== 'undefined') {
    lastFocusedTrigger = document.activeElement as HTMLElement | null
    document.body.classList.add('modal-open')
  }
  dialog.kind = kind
  dialog.title = title
  dialog.nested = false
  dialog.open = true
  if (!already) ovPush('dlg')
  void nextTick(() => {
    document.querySelector<HTMLElement>('#dlgB button, #dlgB a[href], #dlgX')?.focus()
  })
}

export const closeDialog = () => {
  if (!dialog.open) return
  closeDialogDom()
  ovDone('dlg')
}
export const showHist = () => openDialog(DialogKind.hist, 'Historial')
export const showDiag = () => openDialog(DialogKind.diag, 'Estado y diagnóstico')
export const showFilters = () => openDialog(DialogKind.filters, 'Filtros')
export const showRecover = () => openDialog(DialogKind.recover, 'Elecciones de antes')

export const go = (hash: string) => {
  S.fresh = true
  location.hash = hash.replace(/^#/, '')
}

export const back = () => {
  if (S.nav > 0) {
    history.back()
    return
  }
  const current = route.value
  if (current.v === 'ficha') {
    const para = paraOf(current.q.para)
    go(para ? '#/luchador/' + encodeURIComponent(para.code) + '/' + (para.n + 1) : '#/catalogo')
    return
  }
  go('#/luchadores')
}

export const selectSlot = (slot: number) => {
  if (!route.value.code) return
  S.cand = null
  S.galI = 0
  focusSlot = true
  const hash = '#/luchador/' + encodeURIComponent(route.value.code) + '/' + (slot + 1)
  if ((location.hash || '#/luchadores') === hash) {
    bump()
    void nextTick(() => document.querySelector<HTMLElement>('[data-slot="' + slot + '"]')?.focus())
    return
  }
  go(hash)
}

export const clearCand = () => {
  S.cand = null
  S.galI = 0
  bump()
}

export const fighterQuery = ref('')

export const onFind = (value: string) => {
  S.fq = value
  fighterQuery.value = value
  bump()
}

export const setDest = (slot: number) => {
  S.dest = slot
  bump()
}

const applyHash = (force: boolean) => {
  const next = parse(location.hash)
  if (!force && next.key === route.value.key) return
  if (next.v === 'traje' && fighterOf(next.code)?.mii) {
    location.replace('#/luchador/' + encodeURIComponent(next.code))
    return
  }
  if (next.v === 'catalogo' && next.q.para) {
    const old = paraOf(next.q.para)
    if (old) {
      location.replace('#/luchador/' + encodeURIComponent(old.code) + '/' + (old.n + 1))
      return
    }
  }
  const prev = route.value
  if (prev.key) scrollMem[prev.key] = window.scrollY
  const prevF = prev.v === 'luchador' || prev.v === 'traje' ? prev.code : ''
  const nextF = next.v === 'luchador' || next.v === 'traje' ? next.code : ''
  if (nextF && prevF && prevF !== nextF) {
    S.tc = SSBU.emptyCat()
    S.cand = null
    S.galI = 0
  }
  if (next.v === 'ficha' && S.destFor !== next.key) {
    S.destFor = next.key
    const para = paraOf(next.q.para)
    S.dest = para ? para.n : null
    S.galI = 0
  }
  const fresh = S.fresh
  S.fresh = false
  S.nav = Math.max(0, S.nav + (fresh ? 1 : -1))
  route.value = next
  document.title = titleOf() + ' · Skins SSBU'
  bump()
  const y = fresh ? 0 : (scrollMem[next.key] || 0)
  requestAnimationFrame(() => window.scrollTo(0, y))
  if (!focusSlot) return
  focusSlot = false
  void nextTick(() => document.querySelector<HTMLElement>('#slots [aria-checked="true"]')?.focus())
}

export const start = () => {
  if (listening) return
  listening = true
  document.addEventListener('click', (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a[href^="#/"]')
    if (anchor) S.fresh = true
  }, true)
  window.addEventListener('hashchange', () => applyHash(false))
  window.addEventListener('popstate', () => {
    if (skipOverlay) {
      skipOverlay -= 1
      const next = afterOverlay
      afterOverlay = null
      if (next) next()
      return
    }
    if (!overlays.length) return
    hideOverlay(overlays.pop() || '')
  })
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !dialog.open) return
    event.preventDefault()
    closeDialog()
  })
  if (!route.value.key) applyHash(true)
}

export const pageName = () => {
  const view = route.value.v
  if (view === 'traje' || view === 'luchador') return 'fighter'
  if (view === 'ficha') return 'ficha'
  if (view === 'catalogo') return 'catalogo'
  if (view === 'cambios') return 'cambios'
  return 'luchadores'
}

export const portraitOf = () => {
  if (route.value.v !== 'luchador' && route.value.v !== 'traje') return ''
  return fighterOf(route.value.code)?.portrait || ''
}

export const pickedCount = () => {
  tick.value
  return 0
}

export const useApp = () => ({
  tick,
  S,
  route,
  dialog,
  exportText,
  closeDialog,
  back,
  titleOf,
  showBack,
  start,
  pageName,
  portraitOf,
  trajeName,
})

applyHash(true)
