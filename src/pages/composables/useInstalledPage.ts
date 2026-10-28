import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { fighterOf, swap, tick, viewRoute } from '../../composables/useApp'
import type { PickerFighter } from '../../features/explore/composables/useFighterPickSheet'
import { curOf } from '../../features/plan/helpers/lookup'
import { state } from '../../features/plan/services/sync'
import { norm, trajeName } from '../../shared/helpers/text'

export const installedQuery = ref('')

interface InstalledRow {
  key: string
  title: string
  sub: string
  img: string | null
  href: string
  label: string
  code: string
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

const rowOf = (fighter: Fighter, slot: number, words: string[], selected: boolean): InstalledRow | null => {
  const current = curOf(fighter.code, slot)

  if (!current) return null
  if (current.kind !== 'mod' && current.kind !== 'pending' && current.kind !== 'unknown') return null

  const costume = trajeName(slot)
  const where = fighter.name + ' · ' + costume

  if (!words.every((word) => norm(where + ' ' + current.name).includes(word))) return null

  return {
    key: fighter.code + '_' + slot,
    title: selected ? costume : where,
    sub: current.kind === 'pending' || current.kind === 'unknown' ? '' : current.name,
    img: current.img,
    href: '#/luchador/' + encodeURIComponent(fighter.code) + '/' + (slot + 1),
    label: where + ', ' + current.name,
    code: fighter.code,
  }
}

const goFighter = (code: string) => {
  swap(code ? '#/instaladas?pj=' + encodeURIComponent(code) : '#/instaladas')
  window.scrollTo(0, 0)
}

export const useInstalledPage = () => {
  const loading = computed(() => {
    tick.value

    return (state.F as Fighter[]).length === 0
  })

  const fighterCode = computed(() => {
    tick.value

    const current = viewRoute()

    if (current.v !== 'instaladas') return ''

    return current.q.pj || ''
  })

  const fighter = computed(() => fighterOf(fighterCode.value) || null)

  const allRows = computed(() => {
    tick.value

    const words = wordsOf(installedQuery.value)
    const fighters = (state.F as Fighter[]).filter((item) => !item.mii)
    const slots = [0, 1, 2, 3, 4, 5, 6, 7]

    return fighters.flatMap((item) => slots
      .map((slot) => rowOf(item, slot, words, false))
      .filter((row): row is InstalledRow => row !== null))
  })

  const rows = computed(() => {
    const code = fighterCode.value
    const source = code ? allRows.value.filter((row) => row.code === code) : allRows.value

    if (!code) return source

    return source.map((row) => ({ ...row, title: row.title.split(' · ').pop() || row.title }))
  })

  const count = computed(() => rows.value.length)

  const countLabel = computed(() => count.value + (count.value === 1 ? ' instalada' : ' instaladas'))

  const hasFilters = computed(() => !!installedQuery.value || !!fighterCode.value)

  const picker = computed((): PickerFighter[] => {
    tick.value

    const counts = new Map<string, number>()

    allRows.value.forEach((row) => counts.set(row.code, (counts.get(row.code) || 0) + 1))

    const roster = (state.F as Fighter[]).filter((item) => !item.mii).map((item) => ({
      code: item.code,
      name: item.name,
      portrait: item.portrait || null,
      count: counts.get(item.code) || 0,
    }))

    return [...roster.filter((item) => item.count > 0), ...roster.filter((item) => item.count === 0)]
  })

  const pickerTotal = computed(() => picker.value.reduce((sum, row) => sum + row.count, 0))

  const clearFilters = () => {
    installedQuery.value = ''
    goFighter('')
  }

  return {
    loading,
    rows,
    fighter,
    fighterCode,
    count,
    countLabel,
    hasFilters,
    picker,
    pickerTotal,
    selectFighter: goFighter,
    clearFilters,
  }
}
