import { computed, onMounted, ref } from 'vue'
import type { Fighter } from '../../boot'
import { tick } from '../../composables/useApp'
import { useGridDensity } from '../explore/composables/useGridDensity'
import { BoardFilter } from './enums/BoardFilter'
import { BoardHelper } from './helpers/board.helper'
import { costumeSrc } from './portrait'
import { clearAt, planGroups, proposeAt } from '../plan/composables/usePlan'
import { planVid, state } from '../plan/services/sync'
import { norm } from '../../shared/helpers/text'

export interface DriveAlt {
  code: string
  mod_id: string
  name: string
  slots: number[]
  any: boolean
  vid: string | null
  unaudited: boolean
  img: string | null
}

export interface BoardPick {
  code: string
  vid: string
  name: string
}

interface SlotRecord {
  name?: string
  img?: string
  portrait?: string
  skin?: boolean
  src?: string
  vid?: string
}

const alts = ref<DriveAlt[]>([])

const portraits = ref<Record<string, Record<string, string>>>({})

const loading = ref(true)

const loadJson = async <T>(url: string, empty: T): Promise<T> => {
  try {
    const response = await fetch(url)

    if (!response.ok) return empty

    return await response.json() as T
  } catch {
    return empty
  }
}

const slotRecord = (code: string, n: number): SlotRecord | null => {
  const inventory = state.INV as { fighters?: Record<string, { slots?: Record<string, SlotRecord> }> } | null

  return inventory?.fighters?.[code]?.slots?.[String(n)] || null
}

const costumeNameOf = (code: string, n: number) => slotRecord(code, n)?.name || 'Original'

const costumeImageOf = (fighter: Fighter, n: number) => {
  const record = slotRecord(fighter.code, n)
  const sha = portraits.value[fighter.code]?.[String(n)] || record?.portrait
  const original = !record?.src
  const costumes = (fighter as Fighter & { costumes?: Array<string | null> }).costumes

  return costumeSrc(sha, original, costumes?.[n] || fighter.portrait || '')
}

const alternativesOf = (code: string) => {
  const installed = new Set(
    Array.from({ length: 8 }, (_, n) => slotRecord(code, n)?.vid || '').filter(Boolean),
  )

  return alts.value.filter((item) => item.code === code && !(item.vid && installed.has(item.vid)))
}

const availableOf = (code: string) => alternativesOf(code).filter((item) => item.vid)

const lockedOf = (code: string) => alternativesOf(code).filter((item) => !item.vid)

const ownSlotsOf = (code: string) =>
  BoardHelper.gianCountOf(Array.from({ length: 8 }, (_, n) => slotRecord(code, n)))

const isOwnOf = (code: string, n: number) => BoardHelper.isOwnSlot(slotRecord(code, n))

const altNameOf = (code: string, vid: string) =>
  alts.value.find((item) => item.code === code && item.vid === vid)?.name || vid

const chosenVidOf = (code: string, n: number) => planVid(code, n) as string | null

const pendingCountOf = (code: string) =>
  Array.from({ length: 8 }, (_, n) => chosenVidOf(code, n)).filter(Boolean).length

export const useBoard = () => {
  const pick = ref<BoardPick | null>(null)
  const query = ref('')
  const filter = ref(BoardFilter.All)

  const { compact, toggle: toggleDensity } = useGridDensity()

  const roster = computed(() => {
    tick.value

    return (state.F as Fighter[]).filter((fighter) => !fighter.mii)
  })

  const changes = computed(() => {
    tick.value

    return planGroups()
  })

  const changeCount = computed(() => changes.value.reduce((total, group) => total + group.rows.length, 0))

  const fighters = computed(() => {
    tick.value

    const needle = norm(query.value.trim())

    return roster.value.filter((fighter) => {
      if (filter.value === BoardFilter.Gian && ownSlotsOf(fighter.code) === 0) return false
      if (filter.value === BoardFilter.Alts && availableOf(fighter.code).length === 0) return false
      if (!needle) return true
      if (norm(fighter.name).includes(needle) || norm(fighter.code).includes(needle)) return true
      if (availableOf(fighter.code).some((item) => norm(item.name).includes(needle))) return true
      if (lockedOf(fighter.code).some((item) => norm(item.name).includes(needle))) return true

      return Array.from({ length: 8 }, (_, n) => n).some((n) => norm(costumeNameOf(fighter.code, n)).includes(needle))
    })
  })

  const countsLabel = computed(() => {
    tick.value

    const list = roster.value
    const gian = list.reduce((total, fighter) => total + ownSlotsOf(fighter.code), 0)
    const alternativesCount = list.reduce((total, fighter) => total + availableOf(fighter.code).length, 0)

    return BoardHelper.countsLabel(gian, list.length * 8, list.length, alternativesCount)
  })

  const filterLabel = computed(() => BoardHelper.filterTriggerLabel(filter.value))

  const densityLabel = computed(() => BoardHelper.densityLabel(compact.value))

  const emptyLabel = computed(() => BoardHelper.emptyLabel())

  const variantsLabel = computed(() => BoardHelper.variantsUnavailable())

  const missingPortrait = computed(() => BoardHelper.missingPortrait())

  const filterOn = computed(() => filter.value !== BoardFilter.All)

  const costumeName = (code: string, n: number) => costumeNameOf(code, n)

  const costumeImage = (fighter: Fighter, n: number) => costumeImageOf(fighter, n)

  const missingPortraitLabel = (name: string) => BoardHelper.missingPortraitLabel(name)

  const available = (code: string) => availableOf(code)

  const locked = (code: string) => lockedOf(code)

  const altName = (code: string, vid: string) => altNameOf(code, vid)

  const chosenVid = (code: string, n: number) => {
    tick.value

    return chosenVidOf(code, n)
  }

  const ownSlots = (code: string) => {
    tick.value

    return ownSlotsOf(code)
  }

  const isOwn = (code: string, n: number) => {
    tick.value

    return isOwnOf(code, n)
  }

  const pendingCount = (code: string) => {
    tick.value

    return pendingCountOf(code)
  }

  const costumeHit = (code: string, n: number) => {
    const needle = norm(query.value.trim())

    if (!needle) return false

    return norm(costumeNameOf(code, n)).includes(needle)
  }

  const fighterSubtitle = (code: string) => BoardHelper.fighterSubtitle(ownSlotsOf(code), availableOf(code).length)

  const jumpOption = (fighter: Fighter) => BoardHelper.jumpOption(fighter.name, ownSlotsOf(fighter.code))

  const filterChoiceLabel = (choice: BoardFilter) => BoardHelper.getFilterMeta(choice).label

  const slotsLabel = (alt: DriveAlt) => BoardHelper.slotsLabel(alt)

  const pendingLabel = (code: string) => BoardHelper.changesChip(pendingCountOf(code))

  const pendingStrip = (code: string, n: number) => {
    const vid = chosenVidOf(code, n)

    if (!vid) return ''

    return BoardHelper.pendingStrip(altNameOf(code, vid))
  }

  const altChosenLabel = (code: string, vid: string) => {
    const slots = Array.from({ length: 8 }, (_, n) => n)
      .filter((n) => chosenVidOf(code, n) === vid)
      .map((n) => n + 1)

    if (!slots.length) return ''

    return BoardHelper.altChosenLabel(slots)
  }

  const toggle = (fighter: Fighter, alt: DriveAlt) => {
    if (!alt.vid) return

    const same = pick.value && pick.value.code === fighter.code && pick.value.vid === alt.vid

    pick.value = same ? null : { code: fighter.code, vid: alt.vid, name: alt.name }
  }

  const choose = (code: string, n: number) => {
    const current = pick.value

    if (!current || current.code !== code) return
    if (!proposeAt(code, n, current.vid)) return

    pick.value = null
  }

  const discard = (code: string, n: number) => {
    clearAt(code, n)
  }

  const jumpTo = (code: string) => {
    document.getElementById('f-' + code)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const jumpFromSelect = (event: Event) => {
    const code = (event.target as HTMLSelectElement).value

    if (!code) return

    jumpTo(code)
  }

  const setFilter = (value: BoardFilter) => {
    filter.value = filter.value === value ? BoardFilter.All : value
  }

  const clearFilter = () => {
    filter.value = BoardFilter.All
  }

  const clearQuery = () => {
    query.value = ''
  }

  const cancelPick = () => {
    pick.value = null
  }

  onMounted(async () => {
    const [driveAlts, sdPortraits] = await Promise.all([
      loadJson<DriveAlt[]>('/drive-alts.json', []),
      loadJson<Record<string, Record<string, string>>>('/sd-portraits.json', {}),
    ])

    alts.value = driveAlts
    portraits.value = sdPortraits
    loading.value = false
  })

  return {
    pick,
    query,
    filter,
    loading,
    compact,
    fighters,
    changes,
    changeCount,
    countsLabel,
    filterLabel,
    densityLabel,
    emptyLabel,
    variantsLabel,
    missingPortrait,
    filterOn,
    filterChoices: BoardHelper.filterChoices,
    costumeName,
    costumeImage,
    missingPortraitLabel,
    available,
    locked,
    altName,
    toggle,
    choose,
    discard,
    chosenVid,
    jumpTo,
    jumpFromSelect,
    setFilter,
    clearFilter,
    clearQuery,
    cancelPick,
    toggleDensity,
    ownSlots,
    isOwn,
    pendingCount,
    costumeHit,
    fighterSubtitle,
    jumpOption,
    filterChoiceLabel,
    pendingLabel,
    pendingStrip,
    altChosenLabel,
    slotsLabel,
  }
}
