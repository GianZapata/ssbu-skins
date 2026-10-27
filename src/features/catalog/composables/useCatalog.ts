import type { Fighter, Skin } from '../../../boot'
import { bump, catState, onFighter, route, S, showFilters } from '../../../composables/useApp'
import { planEntries, state } from '../../plan/services/sync'
import { SSBU, type CatState, type PlanRow } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'

const PAGE = 40
const write = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch (e) { /* el filtro sigue en memoria */ }
}

export const FILTERS: Array<[keyof CatState, string]> = [
  ['rec', 'Recomendadas'],
  ['autor_explicito', 'Declarada por el autor'],
  ['autor_condicionado', 'Con condiciones'],
  ['tercero', 'Según terceros'],
  ['sin_evidencia', 'Sin evidencia'],
  ['incompatible', 'Incompatible'],
  ['unaudited', 'Sin auditar'],
  ['avail', 'Disponibles'],
]

export const catalogRows = () => {
  const ctx = onFighter() ? { code: route.value.code } : null
  return SSBU.catList(state.all, ctx, catState())
}

const saveCat = () => {
  if (!onFighter()) write('ssbu_cat', JSON.stringify(S.cat))
}

export const onSearch = (value: string) => {
  catState().q = value
  S.shown = PAGE
  saveCat()
  bump()
}

export const setFighterFilter = (code: string) => {
  S.cat.f = code
  S.shown = PAGE
  saveCat()
  bump()
}

export const toggleFilter = (key: keyof CatState) => {
  const st = catState()
  if (key === 'q' || key === 'f' || !SSBU.FILTER_KEYS.includes(key)) return
  st[key] = !st[key]
  S.shown = PAGE
  saveCat()
  bump()
}

export const clearFilters = () => {
  const st = catState()
  const fresh = SSBU.emptyCat()
  ;(Object.keys(st) as Array<keyof CatState>).forEach((key) => { delete st[key] })
  Object.assign(st, fresh)
  S.shown = PAGE
  saveCat()
  bump()
}

export const chooseSkin = (vid: string) => {
  S.cand = vid
  S.galI = 0
  bump()
}

export const smallSrc = (skin: Skin | null | undefined) => {
  if (!skin) return null
  if (skin.srcset) {
    const part = skin.srcset.split(',')[0].trim().split(/\s+/)[0]
    if (part) return part
  }
  return skin.img || null
}

const onlineShort = (skin: Skin) => {
  const pair = SSBU.onlineOf(skin)
  const map: Record<string, string> = {
    'Online: lo declara el autor': 'Online · autor',
    'Online: con condiciones': 'Online · condiciones',
    'Online: según terceros': 'Online · terceros',
    'Online: sin datos': 'Online · sin datos',
    'Incompatible online': 'Incompatible',
    'Sin auditar': 'Sin auditar',
  }
  return map[pair[1]] || pair[1]
}

export const pillsOf = (skin: Skin) => {
  const where = (planEntries() as PlanRow[]).filter((row) => row.vid === skin.vid)
  return {
    online: onlineShort(skin),
    recommended: !SSBU.isAlt(skin),
    withdrawn: !!skin.withdrawn,
    placed: where.map((row) => trajeName(row.n)),
  }
}

export const condOf = (skin: Skin | null) => {
  if (!skin) return []
  const conflicts = skin.conflicts ? skin.conflicts.split(' · ').filter((line) => !/^choca con propuestas principales/.test(line)) : []
  return [skin.conditions, skin.deps ? 'Necesita: ' + skin.deps : '', ...conflicts].filter((line): line is string => !!line)
}

export const useCatalog = () => ({
  FILTERS,
  catalogRows,
  onSearch,
  setFighterFilter,
  toggleFilter,
  clearFilters,
  chooseSkin,
  smallSrc,
  pillsOf,
  condOf,
  showFilters,
  catState,
  fighters: () => state.F as Fighter[],
})
