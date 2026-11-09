import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { fighterHash, tick, viewRoute } from '../../composables/useApp'
import { useGridDensity } from '../../features/explore/composables/useGridDensity'
import { curOf, isUnsent } from '../../features/plan/helpers/lookup'
import { planVid, state } from '../../features/plan/services/sync'
import { ProposalState } from '../../features/roster/enums/ProposalState'
import { RosterFilter } from '../../features/roster/enums/RosterFilter'
import { RosterHelper } from '../../features/roster/helpers/roster.helper'
import { CostumeLayer } from '../../shared/enums/CostumeLayer'
import { currentName } from '../../shared/helpers/skins'
import { initialsOf, norm, trajeName } from '../../shared/helpers/text'

export interface RosterCostume {
  n: number
  href: string
  img: string | null
  name: string
  layer: CostumeLayer
  layerLabel: string
  proposal: ProposalState
  proposalLabel: string
  label: string
  hit: boolean
}

export interface RosterRow {
  fighter: Fighter
  href: string
  initial: string
  costumes: RosterCostume[]
  own: number
  proposals: number
  meterLabel: string
  proposalsLabel: string
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

/** Se conservan al volver desde un luchador. */
export const rosterQuery = ref('')
export const rosterFilter = ref(RosterFilter.All)

const costumeOf = (fighter: Fighter, n: number, needle: string): RosterCostume => {
  const current = curOf(fighter.code, n)
  const layer = RosterHelper.layerOf(current)
  const layerLabel = RosterHelper.layerLabelOf(current)
  const proposal = RosterHelper.proposalOf(planVid(fighter.code, n) as string | null, isUnsent(fighter.code, n))
  const proposalLabel = RosterHelper.getProposalMeta(proposal).label
  const name = currentName(current) || 'Original'
  const where = fighter.name + ', ' + trajeName(n) + ': ' + name + ', ' + layerLabel

  return {
    n,
    href: fighterHash(fighter.code, n),
    img: current ? current.img : null,
    name,
    layer,
    layerLabel,
    proposal,
    proposalLabel,
    label: proposalLabel ? where + ', ' + proposalLabel : where,
    hit: !!needle && norm(name).includes(needle),
  }
}

export const useRosterPage = () => {
  const { compact, toggle } = useGridDensity()

  if (viewRoute().q.filtro === 'perfil') rosterFilter.value = RosterFilter.Profile

  const loading = computed(() => {
    tick.value

    return (state.F as Fighter[]).length === 0
  })

  const needle = computed(() => norm(rosterQuery.value.trim()))

  const allRows = computed(() => {
    tick.value

    return (state.F as Fighter[])
      .filter((fighter) => !fighter.mii)
      .map((fighter): RosterRow => {
        const costumes = SLOTS.map((n) => costumeOf(fighter, n, needle.value))
        const own = costumes.filter((costume) => costume.layer === CostumeLayer.Profile).length
        const proposals = costumes.filter((costume) => costume.proposal !== ProposalState.None).length

        return {
          fighter,
          href: fighterHash(fighter.code),
          initial: initialsOf(fighter.name),
          costumes,
          own,
          proposals,
          meterLabel: RosterHelper.meterLabel(own),
          proposalsLabel: RosterHelper.proposalsLabel(proposals),
        }
      })
  })

  const rows = computed(() => allRows.value.filter((row) => {
    if (rosterFilter.value === RosterFilter.Profile && row.own === 0) return false
    if (rosterFilter.value === RosterFilter.Proposals && row.proposals === 0) return false
    if (!needle.value) return true
    if (norm(row.fighter.name).includes(needle.value) || norm(row.fighter.code).includes(needle.value)) return true

    return row.costumes.some((costume) => costume.hit)
  }))

  const totals = computed(() => {
    const costumes = allRows.value.flatMap((row) => row.costumes)
    const profile = costumes.filter((costume) => costume.layer === CostumeLayer.Profile).length
    const base = costumes.filter((costume) => costume.layer === CostumeLayer.Base).length
    const unidentified = costumes.filter((costume) => costume.layerLabel.endsWith('sin identificar')).length

    return { profile, base, unidentified, original: costumes.length - profile - base, total: costumes.length }
  })

  const countsLabel = computed(() => RosterHelper.countsLabel(totals.value.profile, totals.value.total))

  const breakdownLabel = computed(() => RosterHelper.breakdownLabel(totals.value.base, totals.value.unidentified, totals.value.original))

  const filterOn = computed(() => rosterFilter.value !== RosterFilter.All || !!rosterQuery.value)

  const filterLabel = (choice: RosterFilter) => RosterHelper.getFilterMeta(choice).label

  const setFilter = (choice: RosterFilter) => {
    rosterFilter.value = choice
  }

  const clearFilters = () => {
    rosterFilter.value = RosterFilter.All
    rosterQuery.value = ''
  }

  return {
    compact,
    loading,
    rows,
    countsLabel,
    breakdownLabel,
    filterOn,
    filterChoices: RosterHelper.filterChoices,
    emptyLabel: RosterHelper.emptyLabel(),
    filterLabel,
    setFilter,
    clearFilters,
    toggleDensity: toggle,
  }
}
