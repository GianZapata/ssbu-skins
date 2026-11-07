import { computed, shallowRef, watch } from 'vue'
import { back, fighterHash, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { ProposalOrigin } from '../../plan/enums/ProposalOrigin'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { clearAt, planGroups } from '../../plan/composables/usePlan'
import { activePerson } from '../../plan/composables/usePerson'
import { useSaveStatus } from '../../plan/saveStatus'
import { docKey } from '../../plan/services/sync'

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
  origin: ProposalOrigin
  author: string
  when: string
  canUndo: boolean
}

export interface SummaryGroup {
  code: string
  name: string
  portrait: string | null
  rows: SummaryRow[]
}

export interface SummarySection {
  origin: ProposalOrigin
  title: string
  groups: SummaryGroup[]
}

const ORDER = [ProposalOrigin.Unsent, ProposalOrigin.Mine, ProposalOrigin.Friend]

const variantSuffix = (variant?: string | null) => {
  if (!variant) return ''

  const match = /:c0([0-7])$/.exec(variant)

  return match ? ' · Color ' + (Number(match[1]) + 1) : ''
}

const sectionsOf = (groups: Array<SummaryGroup & { rows: SummaryRow[] }>): SummarySection[] =>
  ORDER
    .map((origin) => ({
      origin,
      title: PlanHelper.getOriginMeta(origin).label,
      groups: groups
        .map((group) => ({ ...group, rows: group.rows.filter((row) => row.origin === origin) }))
        .filter((group) => group.rows.length),
    }))
    .filter((section) => section.groups.length)

export const useSummarySheet = () => {
  const kept = shallowRef<SummarySection[]>([])

  const desktop = useDesktop()
  const { saving, saved, savedHere } = useSaveStatus()

  const open = computed(() => {
    tick.value

    return route.value.v === 'cambios'
  })

  const groups = computed(() => {
    tick.value

    return planGroups().map((group) => ({
      code: group.fighter.code,
      name: group.fighter.name,
      portrait: group.fighter.portrait || null,
      rows: group.rows.map((row): SummaryRow => {
        const cur = curOf(row.code, row.n)
        const skin = skinOf(row.vid)
        const from = currentName(cur)
        const to = (skin ? skin.name : 'Skin sin nombre') + variantSuffix(row.variant)
        const shown = cur?.kind === 'original' ? 'Original' : from
        const key = row.key || docKey(row.code, row.n, row.name || undefined)

        return {
          code: row.code,
          n: row.n,
          key,
          t: trajeName(row.n),
          from: shown,
          to,
          fromImg: cur ? cur.img : null,
          toImg: thumbOf(skin),
          label: group.fighter.name + ', ' + trajeName(row.n) + ': ' + (shown || 'skin sin nombre') + ' cambia a ' + to,
          quitar: 'Quitar propuesta, ' + trajeName(row.n) + ' de ' + group.fighter.name,
          origin: PlanHelper.originOfPerson(row.name, activePerson.value, Boolean(row.unsent)),
          author: PlanHelper.personLabel(row.name),
          when: PlanHelper.whenLabel(row.at ?? null),
          canUndo: Boolean(activePerson.value && row.name === activePerson.value),
        }
      }),
    }))
  })

  const live = computed(() => sectionsOf(groups.value))

  const sections = computed(() => (open.value ? live.value : kept.value))

  const empty = computed(() => open.value && !groups.value.length)

  const hasFriends = computed(() => sections.value.some((section) => section.origin === ProposalOrigin.Friend))

  const close = () => {
    if (route.value.v === 'cambios') back()
  }

  const chooseFighter = () => {
    swap('#/luchadores')
  }

  const goTo = (code: string, n: number) => {
    if (!fighterOf(code)) return

    swap(fighterHash(code, n))
  }

  const undo = (row: SummaryRow) => {
    if (!row.canUndo) return

    clearAt(row.code, row.n)
  }

  watch(live, (value) => {
    if (value.length) kept.value = value
  }, { immediate: true })

  return {
    desktop,
    saving,
    saved,
    savedHere,
    open,
    sections,
    empty,
    hasFriends,
    close,
    chooseFighter,
    goTo,
    undo,
  }
}
