import { reactive, ref, shallowRef } from 'vue'
import type { Fighter, Skin } from '../boot'
import { state } from '../features/plan/services/sync'
import { SSBU } from '../shared/helpers/ssbu'

/*
 * Rutas (hash):
 *   #/luchadores                      Luchadores
 *   #/catalogo                        Todas las skins, agrupadas
 *   #/instaladas                      Inventario revisado
 *   #/notas                           Pedidos de búsqueda
 *   #/luchador/:codigo[/:traje]       Luchador (Traje 1 a 8)
 *   #/apariencia/:vid?para=cod_n      Detalle de skin: hoja sobre Luchador
 *   #/cambios                         Resumen "Elegidas": hoja sobre Luchadores
 * La hoja de detalle y la de resumen son rutas, así que el gesto o botón
 * "atrás" del móvil las cierra sin código extra.
 */
export interface AppRoute {
  v: string
  code: string
  n: number
  vid: string
  q: Record<string, string>
  key: string
}

export const tick = ref(0)
export const bump = () => { tick.value += 1 }

export const S = reactive({
  tc: SSBU.emptyCat(),
  nav: 0,
  fresh: true,
  galI: 0,
})
export const route = shallowRef<AppRoute>({ v: '', code: '', n: 0, vid: '', q: {}, key: '' })
export const baseRoute = shallowRef<AppRoute>({ v: 'luchadores', code: '', n: 0, vid: '', q: {}, key: '' })
export const scrollMem: Record<string, number> = {}

const enc = encodeURIComponent
const dec = (part: string) => {
  try { return decodeURIComponent(part) } catch (e) { return part }
}

let listening = false

interface HistoryMark {
  depth?: number
  ov?: string
}

const historyMark = (): HistoryMark => {
  const current = history.state

  if (!current || typeof current !== 'object') return {}

  return current as HistoryMark
}

const stampDepth = (depth: number) => {
  try {
    history.replaceState({ ...historyMark(), depth }, '', location.href)
  } catch (e) { /* sin historial */ }
}

const depthOf = () => {
  const depth = historyMark().depth

  return typeof depth === 'number' ? depth : 0
}

export const closedOverlay = ref('')

const overlays: string[] = []
let skipOverlay = 0
let afterOverlay: (() => void) | null = null

/* Pila de superposiciones que no son rutas (solo la foto ampliada). */
export const ovPush = (id: string) => {
  overlays.push(id)
  try { history.pushState({ ov: id }, '') } catch (e) { /* sigue sin historial */ }
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

interface GalleryOpener {
  isOpen?: boolean
  isOpening?: boolean
}

interface OpenGallery {
  destroy?: () => void
  element?: HTMLElement | null
  opener?: GalleryOpener
}

const hideOverlay = (id: string) => {
  closedOverlay.value = id

  const gallery = window.PSWP as OpenGallery | null

  if (id !== 'gal' || !gallery) return

  window.PSWP = null
  closeGallery(gallery)
}

const closeGallery = (gallery: OpenGallery) => {
  const opener = gallery.opener

  if (opener?.isOpening) {
    opener.isOpening = false
    opener.isOpen = true
  }

  try {
    gallery.destroy?.()

    if (gallery.element?.isConnected) gallery.destroy?.()
  } catch (e) { /* ya cerrado */ }
}

export const fighterOf = (code: string) => (state.byCode as Record<string, Fighter>)[code]
export const skinEntry = (vid: string) => (state.idx as Record<string, { f: Fighter, p: Skin }>)[vid]

export const paraOf = (raw: string | undefined) => {
  const match = /^(.+)_([0-7])$/.exec(raw || '')
  if (!match || !fighterOf(match[1])) return null
  return { code: match[1], n: Number(match[2]), raw: raw || '' }
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

const parse = (hash: string): AppRoute => {
  const raw = hash.replace(/^#/, '') || '/luchadores'
  const [path, qs] = raw.split('?')
  const q = Object.fromEntries(new URLSearchParams(qs || ''))
  const seg = path.split('/').filter(Boolean).map(dec)
  const view = seg[0] || 'luchadores'
  const key = hash || '#/luchadores'
  if (view === 'luchador' && seg[2]) return blank({ v: 'traje', code: seg[1], n: Number(seg[2]) - 1, q, key })
  if (view === 'luchador') return blank({ v: 'luchador', code: seg[1], q, key })
  if (view === 'apariencia') {
    const para = paraOf(q.para)
    return blank({ v: 'ficha', vid: seg.slice(1).join('/'), code: para ? para.code : '', n: para ? para.n : 0, q, key })
  }
  if (view === 'cambios') return blank({ v: 'cambios', q, key })
  if (view === 'catalogo' || view === 'instaladas' || view === 'notas') return blank({ v: view, q, key })
  return blank({ v: view === 'luchadores' ? 'luchadores' : 'redirect', q, key })
}

const isFighterView = (r: AppRoute) => r.v === 'luchador' || r.v === 'traje' || r.v === 'ficha'

const isSheet = (r: AppRoute) => r.v === 'ficha' || r.v === 'cambios'

/** Página que queda debajo de una hoja. Una hoja no la sustituye. */
export const viewRoute = () => (isSheet(route.value) ? baseRoute.value : route.value)

const fallbackBase = (next: AppRoute): AppRoute => {
  if (next.v === 'ficha' && next.q.de === 'catalogo') return blank({ v: 'catalogo', key: '#/catalogo' })

  if (next.v === 'ficha' && next.code) {
    const key = '#/luchador/' + enc(next.code) + '/' + (next.n + 1)

    return blank({ v: 'traje', code: next.code, n: next.n, key })
  }

  return blank({ v: 'luchadores', key: '#/luchadores' })
}

const rememberBase = (next: AppRoute) => {
  if (!isSheet(next)) {
    baseRoute.value = next

    return
  }

  if (baseRoute.value.key) return

  baseRoute.value = fallbackBase(next)
}

/** Luchador abierto (también cuando la hoja de detalle está encima). */
export const onFighter = () => {
  const current = viewRoute()
  const fighter = fighterOf(current.code)

  return (current.v === 'luchador' || current.v === 'traje') && !!fighter && !fighter.mii
}

/** Traje seleccionado: 0 a 7. */
export const slotOf = () => {
  const current = viewRoute()

  return current.v === 'traje' && SSBU.validSlot(current.n) ? current.n : 0
}

export const titleOf = () => {
  const current = route.value

  if (current.v === 'cambios') return 'Elegidas'
  if (current.v === 'catalogo' || (current.v === 'ficha' && viewRoute().v === 'catalogo')) return 'Catálogo'
  if (current.v === 'ficha' && viewRoute().v === 'instaladas') return 'Instaladas'
  if (current.v === 'instaladas') return 'Instaladas'
  if (current.v === 'notas') return 'Búsquedas pendientes'
  if (isFighterView(current)) return fighterOf(current.code)?.name || 'Luchador'
  return 'Luchadores'
}

export const showBack = () => {
  const view = route.value.v
  return isFighterView(route.value) || view === 'catalogo' || view === 'instaladas' || view === 'notas'
}

/** Navega y añade una entrada al historial. */
export const go = (hash: string) => {
  S.fresh = true
  location.hash = hash.replace(/^#/, '')
}

const applyHash = (force: boolean, replace = false) => {
  const next = parse(location.hash)

  if (!force && next.key === route.value.key) return

  if (next.v === 'redirect') {
    location.replace('#/luchadores')

    return
  }

  if (next.v === 'traje' && fighterOf(next.code)?.mii) {
    location.replace('#/luchador/' + enc(next.code))

    return
  }

  if (next.v === 'ficha') {
    const entry = skinEntry(next.vid)

    if (!entry) {
      location.replace(next.code ? '#/luchador/' + enc(next.code) + '/' + (next.n + 1) : '#/luchadores')

      return
    }

    if (!next.code) {
      location.replace('#/apariencia/' + enc(next.vid) + '?para=' + enc(entry.f.code + '_0'))

      return
    }
  }

  const prev = route.value

  if (prev.key) scrollMem[prev.key] = window.scrollY

  const prevF = isFighterView(prev) ? prev.code : ''
  const nextF = isFighterView(next) ? next.code : ''

  if (nextF && prevF !== nextF) {
    S.tc = SSBU.emptyCat()
    S.galI = 0
  }

  if (next.v === 'ficha') S.galI = 0

  const fresh = S.fresh

  S.fresh = false

  if (!listening) {
    S.nav = 0
    stampDepth(0)
  } else if (replace) {
    stampDepth(S.nav)
  } else if (fresh) {
    S.nav += 1
    stampDepth(S.nav)
  } else {
    S.nav = depthOf()
  }

  rememberBase(next)
  route.value = next
  document.title = titleOf() + ' · Skins SSBU'
  bump()

  if (replace) return

  // Abrir o cerrar una hoja no mueve la página de abajo.
  const sheet = (r: AppRoute) => r.v === 'ficha' || r.v === 'cambios'

  if (sheet(next) || sheet(prev)) return

  const y = fresh ? 0 : (scrollMem[next.key] || 0)

  requestAnimationFrame(() => window.scrollTo(0, y))
}

/** Cambia de ruta sin añadir una entrada al historial (cambiar de traje, cerrar una hoja hacia otra pantalla). */
export const swap = (hash: string) => {
  const target = hash.startsWith('#') ? hash : '#' + hash
  try {
    history.replaceState(history.state, '', target)
  } catch (e) {
    location.replace(target)
    return
  }
  applyHash(false, true)
}

/** Atrás: el historial si lo hay; si se entró por un enlace directo, a la pantalla de arriba. */
export const back = () => {
  if (S.nav > 0) {
    history.back()
    return
  }
  const current = route.value
  if (current.v === 'ficha') {
    swap('#/luchador/' + enc(current.code) + '/' + (current.n + 1))
    return
  }
  if (current.v === 'cambios' || current.v === 'catalogo' || current.v === 'instaladas' || current.v === 'notas') {
    swap('#/luchadores')
    return
  }
  swap('#/luchadores')
}

export const selectSlot = (slot: number) => {
  if (!route.value.code || !SSBU.validSlot(slot)) return
  swap('#/luchador/' + enc(route.value.code) + '/' + (slot + 1))
}

export const openSkin = (code: string, slot: number, vid: string, from = '') => {
  go('#/apariencia/' + enc(vid) + '?para=' + enc(code + '_' + slot) + (from ? '&de=' + from : ''))
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
  if (!route.value.key) applyHash(true)
}

export const portraitOf = () => {
  const current = viewRoute()

  if (current.v !== 'luchador' && current.v !== 'traje') return ''

  return fighterOf(current.code)?.portrait || ''
}

applyHash(true)
