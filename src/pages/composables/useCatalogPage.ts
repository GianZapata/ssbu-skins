import { computed, ref } from 'vue'
import type { Fighter, Skin } from '../../boot'
import { fighterOf, openSkin, swap, tick, viewRoute } from '../../composables/useApp'
import type { PickerFighter } from '../../features/explore/composables/useFighterPickSheet'
import { state } from '../../features/plan/services/sync'
import { SSBU } from '../../shared/helpers/ssbu'
import { coverOf } from '../../shared/helpers/skins'
import { norm } from '../../shared/helpers/text'

export const catalogQuery = ref('')

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

const goFighter = (code: string) => {
  swap(code ? '#/catalogo?pj=' + encodeURIComponent(code) : '#/catalogo')
  window.scrollTo(0, 0)
}

export const useCatalogPage = () => {
  const loading = computed(() => {
    tick.value

    return (state.F as Fighter[]).length === 0
  })

  const fighterCode = computed(() => {
    tick.value

    const current = viewRoute()

    if (current.v !== 'catalogo') return ''

    return current.q.pj || ''
  })

  const fighter = computed(() => fighterOf(fighterCode.value) || null)

  const matched = computed(() => {
    tick.value

    const words = wordsOf(catalogQuery.value)

    return (state.all as CatalogRow[]).filter(({ p }) => words.every((word) => norm(p.name).includes(word)))
  })

  const rows = computed(() => {
    const code = fighterCode.value

    if (!code) return matched.value

    return matched.value.filter(({ f }) => f.code === code)
  })

  const groups = computed(() => (fighterCode.value ? [] : byFighter(rows.value)))

  const skins = computed(() => (fighterCode.value ? rows.value.map(({ f, p }) => skinRow(f, p)) : []))

  const count = computed(() => rows.value.length)

  const countLabel = computed(() => count.value + (count.value === 1 ? ' apariencia' : ' apariencias'))

  const hasFilters = computed(() => !!catalogQuery.value || !!fighterCode.value)

  const picker = computed((): PickerFighter[] => {
    const counts = new Map<string, number>()

    matched.value.forEach(({ f }) => counts.set(f.code, (counts.get(f.code) || 0) + 1))

    const roster = (state.F as Fighter[]).filter((item) => !item.mii).map((item) => ({
      code: item.code,
      name: item.name,
      portrait: item.portrait || null,
      count: counts.get(item.code) || 0,
    }))

    return [...roster.filter((item) => item.count > 0), ...roster.filter((item) => item.count === 0)]
  })

  const pickerTotal = computed(() => picker.value.reduce((sum, row) => sum + row.count, 0))

  const viewSkin = (code: string, vid: string) => {
    openSkin(code, 0, vid, 'catalogo')
  }

  const clearFilters = () => {
    catalogQuery.value = ''
    goFighter('')
  }

  return {
    loading,
    groups,
    skins,
    fighter,
    fighterCode,
    count,
    countLabel,
    hasFilters,
    picker,
    pickerTotal,
    viewSkin,
    selectFighter: goFighter,
    clearFilters,
  }
}
