import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { back, fighterHash, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { ProposalOrigin } from '../../plan/enums/ProposalOrigin'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { curOf, isUnsent, skinOf } from '../../plan/helpers/lookup'
import { clearAt, planGroups, touched } from '../../plan/composables/usePlan'
import { useSaveStatus } from '../../plan/saveStatus'
import { fb, keyOf, state } from '../../plan/services/sync'

interface PlanEntry {
  vid: string
  by?: string
  at?: number | null
}

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
  const uid = ref<string | null>(null)
  const confirming = ref('')
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
        const to = skin ? skin.name : 'Skin sin nombre'
        const shown = cur?.kind === 'original' ? 'Original' : from
        const key = keyOf(row.code, row.n)
        const entry = (state.PLAN as Record<string, PlanEntry>)[key]
        const unsent = isUnsent(row.code, row.n)
        const owner = PlanHelper.originOf(entry?.by, uid.value, Boolean(touched[key]))

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
          origin: unsent ? ProposalOrigin.Unsent : owner,
          author: PlanHelper.authorLabel(entry?.by),
          when: PlanHelper.whenLabel(entry?.at ?? null),
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

  const isConfirming = (row: SummaryRow) => confirming.value === row.key

  const undo = (row: SummaryRow) => {
    if (row.origin === ProposalOrigin.Friend && confirming.value !== row.key) {
      confirming.value = row.key

      return
    }

    confirming.value = ''
    clearAt(row.code, row.n)
  }

  const keep = () => {
    confirming.value = ''
  }

  watch(live, (value) => {
    if (value.length) kept.value = value
  }, { immediate: true })

  onMounted(async () => {
    try {
      const client = await fb()

      uid.value = client.auth.currentUser?.uid || null
    } catch {
      uid.value = null
    }
  })

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
    isConfirming,
    undo,
    keep,
  }
}
