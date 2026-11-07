import { computed, ref } from 'vue'
import type { Fighter, Skin } from '../../../boot'
import { jumpToFighter, playableFighters, tick, viewRoute } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { thumbOf } from '../../../shared/helpers/skins'
import { norm } from '../../../shared/helpers/text'
import { changesOf } from '../../plan/helpers/lookup'
import { state } from '../../plan/services/sync'
import { meterOf, type MeterCostume } from '../../roster/costumes'
import { closeFighterPick } from './useFighterPick'

export interface PickerFighterRow {
  code: string
  name: string
  portrait: string | null
  costumes: MeterCostume[]
  proposalCount: number
  isCurrent: boolean
}

export interface PickerSkinHit {
  vid: string
  code: string
  fighterName: string
  name: string
  img: string | null
}

interface CatalogHitEntry {
  f: Fighter
  p: Skin
}

interface UseFighterPickSheetEmits {
  (event: 'close'): void
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

export const useFighterPickSheet = (emit: UseFighterPickSheetEmits) => {
  const query = ref('')
  const searchInput = ref<HTMLInputElement | null>(null)

  const desktop = useDesktop()

  const fighterRows = computed<PickerFighterRow[]>(() => {
    tick.value

    const currentCode = viewRoute().code
    const words = wordsOf(query.value)

    return playableFighters()
      .filter((fighter) => words.every((word) => norm(fighter.name).includes(word)))
      .map((fighter) => ({
        code: fighter.code,
        name: fighter.name,
        portrait: fighter.portrait || null,
        costumes: meterOf(fighter.code),
        proposalCount: changesOf(fighter.code).length,
        isCurrent: fighter.code === currentCode,
      }))
  })

  const skinHits = computed<PickerSkinHit[]>(() => {
    const words = wordsOf(query.value)

    if (!words.length) return []

    return (state.all as CatalogHitEntry[])
      .filter(
        (entry) =>
          !entry.f.mii
          && !entry.p.withdrawn
          && words.every((word) => norm(entry.p.name + ' ' + entry.f.name).includes(word)),
      )
      .slice(0, 24)
      .map((entry) => ({
        vid: entry.p.vid,
        code: entry.f.code,
        fighterName: entry.f.name,
        name: entry.p.name,
        img: thumbOf(entry.p),
      }))
  })

  const meterLabelOf = (row: PickerFighterRow) =>
    row.proposalCount === 1 ? row.name + ': 1 propuesta' : row.name + ': ' + row.proposalCount + ' propuestas'

  const focusSearch = () => {
    searchInput.value?.focus()
  }

  const clearQuery = () => {
    query.value = ''
    focusSearch()
  }

  const pickFighter = (code: string) => {
    closeFighterPick(() => jumpToFighter(code))
  }

  const pickSkin = (hit: PickerSkinHit) => {
    closeFighterPick(() => jumpToFighter(hit.code, null, hit.vid))
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) emit('close')
  }

  return {
    desktop,
    query,
    searchInput,
    fighterRows,
    skinHits,
    meterLabelOf,
    focusSearch,
    clearQuery,
    pickFighter,
    pickSkin,
    onOpenChange,
  }
}
