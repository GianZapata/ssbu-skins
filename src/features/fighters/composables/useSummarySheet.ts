import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { back, fighterHash, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { currentName } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { clearAt, planGroups } from '../../plan/composables/usePlan'
import { usePerson } from '../../plan/composables/usePerson'
import type { PersonName } from '../../plan/enums/PersonName'
import { curOf, isUnsent, skinOf } from '../../plan/helpers/lookup'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { useSaveStatus } from '../../plan/saveStatus'
import { docKey } from '../../plan/services/sync'
import { SummaryTabKind } from '../enums/SummaryTabKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface SummaryRow {
  code: string
  n: number
  key: string
  t: string
  from: string
  to: string
  fromImg: string | null
  toImg: string | null
  label: string
  quitar: string
  personName: PersonName | null
  author: string
  when: string
  unsent: boolean
  canUndo: boolean
}

export interface SummaryGroup {
  code: string
  name: string
  portrait: string | null
  rows: SummaryRow[]
}

export interface SummaryTab {
  id: string
  kind: SummaryTabKind
  label: string
  count: number
  canUndo: boolean
  groups: SummaryGroup[]
}

const variantSuffix = (variant?: string | null): string => {
  if (!variant) return ''

  const match = /:c0([0-7])$/.exec(variant)

  return match ? ' · Color ' + (Number(match[1]) + 1) : ''
}

const filterGroups = (
  groups: SummaryGroup[],
  predicate: (row: SummaryRow) => boolean,
): SummaryGroup[] =>
  groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(predicate),
    }))
    .filter((group) => group.rows.length > 0)

const countRows = (groups: SummaryGroup[]): number =>
  groups.reduce((acc, group) => acc + group.rows.length, 0)

const buildTabs = (
  allGroups: SummaryGroup[],
  currentPerson: PersonName | null,
): SummaryTab[] => {
  if (!allGroups.length) return []

  const tabs: SummaryTab[] = []
  const mineGroups = currentPerson
    ? filterGroups(allGroups, (row) => row.personName === currentPerson)
    : []

  tabs.push({
    id: 'mine',
    kind: SummaryTabKind.Mine,
    label: 'Mías',
    count: countRows(mineGroups),
    canUndo: true,
    groups: mineGroups,
  })

  for (const person of PlanHelper.people) {
    if (person === currentPerson) continue

    const personGroups = filterGroups(allGroups, (row) => row.personName === person)
    const count = countRows(personGroups)

    if (!count) continue

    tabs.push({
      id: 'person:' + person,
      kind: SummaryTabKind.Person,
      label: person,
      count,
      canUndo: false,
      groups: personGroups,
    })
  }

  const legacyGroups = filterGroups(allGroups, (row) => row.personName === null)
  const legacyCount = countRows(legacyGroups)

  if (legacyCount > 0) {
    tabs.push({
      id: 'legacy',
      kind: SummaryTabKind.Legacy,
      label: 'Otros',
      count: legacyCount,
      canUndo: false,
      groups: legacyGroups,
    })
  }

  return tabs
}

export const useSummarySheet = () => {
  const activeTabId = ref('mine')
  const keptTabs = shallowRef<SummaryTab[]>([])
  const tabRefs = shallowRef<Array<HTMLButtonElement | null>>([])

  const desktop = useDesktop()
  const { saving, saved, savedHere } = useSaveStatus()
  const { activePerson, openPersonSheet } = usePerson()

  const isOpen = computed(() => {
    tick.value

    return route.value.v === 'cambios'
  })

  const groups = computed<SummaryGroup[]>(() => {
    tick.value

    const person = activePerson.value

    return planGroups().map((group) => ({
      code: group.fighter.code,
      name: group.fighter.name,
      portrait: group.fighter.portrait || null,
      rows: group.rows.map((row): SummaryRow => {
        const cur = curOf(row.code, row.n)
        const skin = skinOf(row.vid)
        const from = currentName(cur)
        const to = (skin ? skin.name : row.vid) + variantSuffix(row.variant)
        const shown = cur?.kind === 'original' ? 'Original' : from
        const personName = PlanHelper.isPersonName(row.name) ? row.name : null
        const key = row.key || docKey(row.code, row.n, personName || undefined)
        const unsent = Boolean(row.unsent) || (personName !== null && isUnsent(row.code, row.n, personName))
        const canUndo = Boolean(person && personName === person)

        return {
          code: row.code,
          n: row.n,
          key,
          t: trajeName(row.n),
          from: shown,
          to,
          fromImg: cur ? cur.img : null,
          toImg: CostumeHelper.proposalThumbOf(row.code, row.vid, row.variant),
          label: `${group.fighter.name}, ${trajeName(row.n)}: ${shown || 'Original'} cambia a ${to}`,
          quitar: `Deshacer propuesta en ${trajeName(row.n)} de ${group.fighter.name}`,
          personName,
          author: PlanHelper.personLabel(personName),
          when: PlanHelper.whenLabel(row.at ?? null),
          unsent,
          canUndo,
        }
      }),
    }))
  })

  const liveTabs = computed(() => buildTabs(groups.value, activePerson.value))

  const tabs = computed(() => (isOpen.value ? liveTabs.value : keptTabs.value))

  const empty = computed(() => isOpen.value && !groups.value.length)

  const currentTab = computed<SummaryTab | null>(() => {
    const list = tabs.value

    if (!list.length) return null

    return list.find((tab) => tab.id === activeTabId.value) ?? list[0] ?? null
  })

  const setTabRef = (index: number, element: unknown) => {
    tabRefs.value[index] = element instanceof HTMLButtonElement ? element : null
  }

  const selectTab = (tabId: string) => {
    activeTabId.value = tabId
  }

  const onTabKeydown = (event: KeyboardEvent, index: number) => {
    const list = tabs.value

    if (!list.length) return

    let next = -1

    if (event.key === 'ArrowRight') next = (index + 1) % list.length
    else if (event.key === 'ArrowLeft') next = (index + list.length - 1) % list.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = list.length - 1

    if (next < 0) return

    const target = list[next]

    if (!target) return

    event.preventDefault()
    activeTabId.value = target.id
    void nextTick(() => {
      tabRefs.value[next]?.focus()
    })
  }

  const close = () => {
    if (route.value.v === 'cambios') back()
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen.value) close()
  }

  const goTo = (code: string, n: number) => {
    if (!fighterOf(code)) return

    swap(fighterHash(code, n))
  }

  const undo = (row: SummaryRow) => {
    if (!row.canUndo) return

    clearAt(row.code, row.n)
  }

  const chooseIdentity = () => {
    openPersonSheet()
  }

  watch(
    isOpen,
    (openNow) => {
      if (!openNow) return

      const list = liveTabs.value
      const mine = list.find((tab) => tab.id === 'mine')

      if (mine && mine.count > 0) {
        activeTabId.value = 'mine'

        return
      }

      const firstNonEmpty = list.find((tab) => tab.count > 0) ?? list[0]

      if (firstNonEmpty) activeTabId.value = firstNonEmpty.id
    },
    { immediate: true },
  )

  watch(
    liveTabs,
    (list) => {
      if (list.length) keptTabs.value = list

      if (list.length && !list.some((tab) => tab.id === activeTabId.value)) {
        const fallback = list.find((tab) => tab.count > 0) ?? list[0]

        if (fallback) activeTabId.value = fallback.id
      }
    },
    { immediate: true },
  )

  return {
    desktop,
    saving,
    saved,
    savedHere,
    activePerson,
    isOpen,
    tabs,
    currentTab,
    empty,
    setTabRef,
    selectTab,
    onTabKeydown,
    close,
    onOpenChange,
    goTo,
    undo,
    chooseIdentity,
  }
}
