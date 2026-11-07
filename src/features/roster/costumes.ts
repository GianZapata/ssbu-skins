import type { CostumeLayer } from '../../shared/enums/CostumeLayer'
import { curOf, isUnsent } from '../plan/helpers/lookup'
import { planVid } from '../plan/services/sync'
import type { ProposalState } from './enums/ProposalState'
import { RosterHelper } from './helpers/roster.helper'

export interface MeterCostume {
  n: number
  layer: CostumeLayer
  proposal: ProposalState
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

/** Los ocho trajes de un luchador con su capa base y su propuesta, para el medidor. */
export const meterOf = (code: string): MeterCostume[] =>
  SLOTS.map((n) => ({
    n,
    layer: RosterHelper.layerOf(curOf(code, n)),
    proposal: RosterHelper.proposalOf(planVid(code, n) as string | null, isUnsent(code, n)),
  }))
