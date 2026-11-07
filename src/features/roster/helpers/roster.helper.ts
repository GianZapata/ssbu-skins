import { CostumeLayer } from '../../../shared/enums/CostumeLayer'
import type { Current } from '../../../shared/helpers/ssbu'
import { ProposalState } from '../enums/ProposalState'

interface ProposalMeta {
  label: string
}

export class RosterHelper {
  static readonly proposalMeta: Record<ProposalState, ProposalMeta> = {
    [ProposalState.None]: {
      get label() {
        return ''
      },
    },
    [ProposalState.Proposed]: {
      get label() {
        return 'Propuesta'
      },
    },
    [ProposalState.Unsent]: {
      get label() {
        return 'Sin enviar'
      },
    },
  }

  static getProposalMeta(state: ProposalState | null | undefined): ProposalMeta {
    if (state == null) return this.proposalMeta[ProposalState.None]

    return this.proposalMeta[state]
  }

  static layerOf(current: Current | null | undefined): CostumeLayer {
    if (current?.layer === CostumeLayer.Profile) return CostumeLayer.Profile
    if (current?.layer === CostumeLayer.Base) return CostumeLayer.Base

    return CostumeLayer.Original
  }

  static proposalOf(vid: string | null, unsent: boolean): ProposalState {
    if (!vid) return ProposalState.None
    if (unsent) return ProposalState.Unsent

    return ProposalState.Proposed
  }
}
