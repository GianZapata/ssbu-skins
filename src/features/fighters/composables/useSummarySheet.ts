import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { back, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { ProposalOrigin } from '../../plan/enums/ProposalOrigin'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { clearAt, planGroups, touched } from '../../plan/composables/usePlan'
import { useSaveStatus } from '../../plan/saveStatus'
import { fb, keyOf, state } from '../../plan/services/sync'

interface PlanEntry {
  vid: string
  by?: string
  at?: number | null
}

interface SummaryRow {
  code: string
  n: number
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

interface SummaryGroup {
  code: string
  name: string
  portrait: string | null
  origin: ProposalOrigin
  rows: SummaryRow[]
}

export const useSummarySheet = () => {
  const uid = ref<string | null>(null)
  const kept = shallowRef<SummaryGroup[]>([])

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
      origin: ProposalOrigin.Mine,
      rows: group.rows.map((row) => {
        const cur = curOf(row.code, row.n)
        const skin = skinOf(row.vid)
        const from = currentName(cur)
        const to = skin ? skin.name : 'Skin sin nombre'
        const shown = cur?.kind === 'original' ? 'Original' : from
        const key = keyOf(row.code, row.n)
        const entry = (state.PLAN as Record<string, PlanEntry>)[key]
        const origin = PlanHelper.originOf(entry?.by, uid.value, Boolean(touched[key]))

        return {
          code: row.code,
          n: row.n,
          t: trajeName(row.n),
          from: shown,
          to,
          fromImg: cur ? cur.img : null,
          toImg: thumbOf(skin),
          label: group.fighter.name + ', ' + trajeName(row.n) + ': ' + (shown || 'skin sin nombre') + ' cambia a ' + to,
          quitar: 'Quitar elección, ' + trajeName(row.n) + ' de ' + group.fighter.name,
          origin,
          author: PlanHelper.authorLabel(entry?.by),
          when: PlanHelper.whenLabel(entry?.at ?? null),
        }
      }),
    }))
  })

  const mine = computed(() =>
    groups.value
      .map((group) => ({
        ...group,
        origin: ProposalOrigin.Mine,
        rows: group.rows.filter((row) => row.origin === ProposalOrigin.Mine),
      }))
      .filter((group) => group.rows.length),
  )

  const friends = computed(() =>
    groups.value
      .map((group) => ({
        ...group,
        origin: ProposalOrigin.Friend,
        rows: group.rows.filter((row) => row.origin === ProposalOrigin.Friend),
      }))
      .filter((group) => group.rows.length),
  )

  const shownMine = computed(() => (open.value ? mine.value : kept.value.filter((group) => group.origin === ProposalOrigin.Mine)))

  const shownFriends = computed(() => (open.value ? friends.value : kept.value.filter((group) => group.origin === ProposalOrigin.Friend)))

  const empty = computed(() => open.value && !groups.value.length)

  const friendTitle = computed(() => PlanHelper.getOriginMeta(ProposalOrigin.Friend).label)

  const close = () => {
    if (route.value.v === 'cambios') back()
  }

  const chooseFighter = () => {
    swap('#/luchadores')
  }

  const goTo = (code: string, n: number) => {
    if (!fighterOf(code)) return

    swap('#/luchador/' + encodeURIComponent(code) + '/' + (n + 1))
  }

  const undo = (code: string, n: number) => {
    clearAt(code, n)
  }

  watch(groups, (value) => {
    if (value.length) kept.value = [...mine.value, ...friends.value]
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
    shownMine,
    shownFriends,
    empty,
    friendTitle,
    close,
    chooseFighter,
    goTo,
    undo,
  }
}
