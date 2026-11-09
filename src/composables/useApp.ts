import { reactive, ref, shallowRef } from 'vue'
import type { Fighter, Skin } from '../boot'
import { state } from '../features/plan/services/sync'
import { SSBU } from '../shared/helpers/ssbu'

/*
 * Rutas (hash):
 *   #/luchadores[?filtro=]            Luchadores (portada): cada luchador con sus 8 trajes
 *   #/luchador/:codigo[/:traje]       Luchador (Traje 1 a 8): comparar y proponer
 *   #/luchador/...?skin=:vid          Con una skin candidata, sin guardar
 *   #/catalogo[?pj=]                  Todas las skins, agrupadas
 *   #/notas                           Pedidos de búsqueda
 *   #/cambios                         Cambios: hoja sobre la pantalla actual
 * Redirigen por enlaces ya compartidos: #/tarjeta, #/instaladas y #/apariencia.
 * La hoja de cambios es una ruta, así que el gesto o botón "atrás" del móvil la cierra.
 */
export interface AppRoute {
  v: string
  code: string
  n: number
  vid: string
  q: Record<string, string>
  key: string
  to: string
}

export const tick = ref(0)
export const bump = () => { tick.value += 1 }

export const S = reactive({
  tc: SSBU.emptyCat(),
  nav: 0,
  fresh: true,
  galI: 0,
})
export const route = shallowRef<AppRoute>({ v: '', code: '', n: 0, vid: '', q: {}, key: '', to: '' })
export const baseRoute = shallowRef<AppRoute>({ v: 'luchadores', code: '', n: 0, vid: '', q: {}, key: '', to: '' })
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
  to: '',
  ...partial,
})

/** Dirección de un luchador: traje (0 a 7) y candidata opcionales. */
export const fighterHash = (code: string, slot: number | null = null, skin = '') =>
  '#/luchador/' + enc(code) + (slot === null ? '' : '/' + (slot + 1)) + (skin ? '?skin=' + enc(skin) : '')

const redirect = (to: string, key: string) => blank({ v: 'redirect', to, key })

const legacyTarget = (view: string, seg: string[], q: Record<string, string>, key: string) => {
  if (view === 'tarjeta') return redirect('#/luchadores', key)
  if (view === 'instaladas') return redirect(q.pj ? fighterHash(q.pj) : '#/luchadores?filtro=perfil', key)

  if (view === 'apariencia') {
    const para = paraOf(q.para)
    const vid = seg.slice(1).join('/')

    if (!para) return redirect('#/luchadores', key)

    return redirect(fighterHash(para.code, q.de === 'catalogo' ? null : para.n, vid), key)
  }

  return null
}

const parse = (hash: string): AppRoute => {
  const raw = hash.replace(/^#/, '') || '/luchadores'
  const [path, qs] = raw.split('?')
  const q = Object.fromEntries(new URLSearchParams(qs || ''))
  const seg = path.split('/').filter(Boolean).map(dec)
  const view = seg[0] || 'luchadores'
  const key = !hash || hash === '#' ? '#/luchadores' : hash
  const legacy = legacyTarget(view, seg, q, key)

  if (legacy) return legacy

  if (view === 'luchador' && seg[2]) return blank({ v: 'traje', code: seg[1], n: Number(seg[2]) - 1, q, key })
  if (view === 'luchador') return blank({ v: 'luchador', code: seg[1], q, key })
  if (view === 'cambios') return blank({ v: 'cambios', q, key })
  if (view === 'catalogo' || view === 'notas' || view === 'luchadores') return blank({ v: view, q, key })

  return redirect('#/luchadores', key)
}

const isFighterView = (r: AppRoute) => r.v === 'luchador' || r.v === 'traje'

const isSheet = (r: AppRoute) => r.v === 'cambios'

/** Página que queda debajo de una hoja. Una hoja no la sustituye. */
export const viewRoute = () => (isSheet(route.value) ? baseRoute.value : route.value)

const fallbackBase = (): AppRoute => blank({ v: 'luchadores', key: '#/luchadores' })

const rememberBase = (next: AppRoute) => {
  if (!isSheet(next)) {
    baseRoute.value = next

    return
  }

  if (baseRoute.value.key) return

  baseRoute.value = fallbackBase()
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

/** Hay un traje elegido en la ruta (Traje 1 a 8), no solo el luchador. */
export const hasSlot = () => viewRoute().v === 'traje' && SSBU.validSlot(viewRoute().n)

/** Skin candidata de la ruta: sin guardar, solo para comparar. */
export const skinParam = () => viewRoute().q.skin || ''

export const titleOf = () => {
  const current = route.value

  if (current.v === 'cambios') return 'Cambios'
  if (current.v === 'catalogo') return 'Catálogo'
  if (current.v === 'notas') return 'Búsquedas pendientes'
  if (isFighterView(current)) return fighterOf(current.code)?.name || 'Luchador'
  return 'Luchadores'
}

export const showBack = () => {
  const view = route.value.v

  return isFighterView(route.value) || view === 'catalogo' || view === 'notas'
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
    location.replace(next.to)

    return
  }

  if (next.v === 'traje' && (fighterOf(next.code)?.mii || !SSBU.validSlot(next.n))) {
    location.replace(fighterHash(next.code, null, next.q.skin))

    return
  }

  if (isFighterView(next) && !fighterOf(next.code)) {
    location.replace('#/luchadores')

    return
  }

  if (isFighterView(next) && next.q.skin) {
    const entry = skinEntry(next.q.skin)

    if (!entry || entry.f.code !== next.code) {
      location.replace(fighterHash(next.code, next.v === 'traje' ? next.n : null))

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
  if (isSheet(next) || isSheet(prev)) return

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

  if (current.v === 'traje') {
    swap(fighterHash(current.code, null, current.q.skin))
    return
  }

  swap('#/luchadores')
}

/** Abre un traje, o cambia de traje sin añadir historial. La candidata viaja con él salvo que se pida lo contrario. */
export const selectSlot = (slot: number, keepSkin = true) => {
  const current = viewRoute()

  if (!current.code || !SSBU.validSlot(slot)) return

  const target = fighterHash(current.code, slot, keepSkin ? current.q.skin : '')

  // Abrir el primer traje suma una entrada: Atrás vuelve a la cuadrícula. Cambiar de traje no.
  if (current.v === 'traje') swap(target)
  else go(target)
}

/** Deja una skin como candidata del luchador abierto, o la quita con una cadena vacía. */
export const setSkin = (vid: string) => {
  const current = viewRoute()

  if (!current.code) return

  swap(fighterHash(current.code, current.v === 'traje' ? current.n : null, vid))
}

/** Abre un luchador con una skin candidata. Es la entrada «skin primero» del catálogo. */
export const openSkin = (code: string, vid: string) => {
  go(fighterHash(code, null, vid))
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
