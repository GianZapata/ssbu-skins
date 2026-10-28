import { computed, ref } from 'vue'
import type { Fighter, Skin } from '../../boot'
import { openSkin, tick } from '../../composables/useApp'
import { setCandidate } from '../../features/fighters/candidate'
import { state } from '../../features/plan/services/sync'
import { SSBU } from '../../shared/helpers/ssbu'
import { coverOf } from '../../shared/helpers/skins'
import { norm } from '../../shared/helpers/text'
import { CatalogGroupMode } from '../enums/CatalogGroupMode'

export const catalogQuery = ref('')
export const catalogGroup = ref(CatalogGroupMode.Personaje)

export interface CatalogSkin {
  vid: string
  name: string
  img: string | null
  srcset: string
  code: string
  mii: boolean
  withdrawn: boolean
  label: string
}

export interface CatalogGroup {
  id: string
  name: string
  portrait: string | null
  skins: CatalogSkin[]
}

interface CatalogRow {
  f: Fighter
  p: Skin
}

interface SkinEntry {
  p: Skin
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

const skinRow = (fighter: Fighter, skin: Skin): CatalogSkin => ({
  vid: skin.vid,
  name: skin.name,
  img: coverOf(skin),
  srcset: skin.srcset || '',
  code: fighter.code,
  mii: !!fighter.mii || !!skin.mii,
  withdrawn: !!skin.withdrawn,
  label: skin.withdrawn ? skin.name + ', retirada' : skin.name,
})

const bySeries = (rows: CatalogRow[]) => {
  const buckets = new Map<string, CatalogGroup>()

  rows.forEach(({ f, p }) => {
    const id = SSBU.seriesOf(f.code)
    const key = id || 'none'
    const group = buckets.get(key) || { id: key, name: SSBU.seriesLabel(id), portrait: null, skins: [] }

    group.skins.push(skinRow(f, p))
    buckets.set(key, group)
  })

  return [...buckets.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

const byFighter = (rows: CatalogRow[]) => {
  const order = (state.F as Fighter[]).map((fighter) => fighter.code)
  const buckets = new Map<string, CatalogGroup>()

  rows.forEach(({ f, p }) => {
    const group = buckets.get(f.code) || { id: f.code, name: f.name, portrait: f.portrait || null, skins: [] }

    group.skins.push(skinRow(f, p))
    buckets.set(f.code, group)
  })

  return order.filter((code) => buckets.has(code)).map((code) => buckets.get(code) as CatalogGroup)
}

export const useCatalogPage = () => {
  const loading = computed(() => {
    tick.value

    return (state.F as Fighter[]).length === 0
  })

  const groups = computed(() => {
    tick.value

    const words = wordsOf(catalogQuery.value)
    const rows = (state.all as CatalogRow[]).filter(({ p }) => words.every((word) => norm(p.name).includes(word)))

    if (catalogGroup.value === CatalogGroupMode.Franquicia) return bySeries(rows)

    return byFighter(rows)
  })

  const groupLabel = computed(() => (catalogGroup.value === CatalogGroupMode.Personaje ? 'Personaje' : 'Franquicia'))

  const groupHint = computed(() => {
    if (catalogGroup.value === CatalogGroupMode.Personaje) return 'Agrupado por personaje. Agrupar por franquicia'

    return 'Agrupado por franquicia. Agrupar por personaje'
  })

  const viewSkin = (code: string, vid: string) => {
    const entry = (state.idx as Record<string, SkinEntry>)[vid]

    if (entry) setCandidate(code, 0, entry.p)

    openSkin(code, 0, vid, 'catalogo')
  }

  const toggleGroup = () => {
    catalogGroup.value = catalogGroup.value === CatalogGroupMode.Personaje ? CatalogGroupMode.Franquicia : CatalogGroupMode.Personaje
  }

  return { loading, groups, groupLabel, groupHint, viewSkin, toggleGroup }
}
