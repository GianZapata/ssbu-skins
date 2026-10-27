import { computed } from 'vue'
import { catState, onFighter, S, showFilters, slotOf, tick } from '../../composables/useApp'
import {
  catalogRows,
  chooseSkin,
  clearFilters,
  FILTERS,
  onSearch,
  pillsOf,
  setFighterFilter,
  smallSrc,
  useCatalog,
} from '../../features/catalog/composables/useCatalog'
import { trajeName } from '../../shared/helpers/text'

export const useCatalogPage = () => {
  const catalog = useCatalog()
  const view = computed(() => {
    tick.value
    const rows = catalogRows()
    const st = catState()
    const scoped = onFighter()
    return {
      rows: scoped ? rows : rows.slice(0, S.shown),
      total: rows.length,
      st,
      scoped,
      slot: slotOf(),
      fighters: catalog.fighters(),
      filtersOn: FILTERS.some(([key]) => st[key]),
    }
  })
  const search = (event: Event) => onSearch((event.target as HTMLInputElement).value)
  const pickFighter = (event: Event) => setFighterFilter((event.target as HTMLSelectElement).value)
  const detailHref = (code: string, vid: string, slot: number) => '#/apariencia/' + encodeURIComponent(vid) + '?para=' + encodeURIComponent(code + '_' + slot)
  const more = () => {
    S.shown += 40
    tick.value += 1
  }
  return { view, S, search, pickFighter, chooseSkin, clearFilters, showFilters, smallSrc, pillsOf, detailHref, trajeName, more }
}
