import { CostumeLayer } from '../../../shared/enums/CostumeLayer'
import type { Current } from '../../../shared/helpers/ssbu'
import { RosterFilter } from '../enums/RosterFilter'
import { ProposalState } from '../enums/ProposalState'

interface LayerMeta {
  label: string
}

interface FilterMeta {
  label: string
}

interface ProposalMeta {
  label: string
}

export class RosterHelper {
  static readonly layerMeta: Record<CostumeLayer, LayerMeta> = {
    [CostumeLayer.Profile]: {
      get label() {
        return 'Perfil'
      },
    },
    [CostumeLayer.Base]: {
      get label() {
        return 'Pack base'
      },
    },
    [CostumeLayer.Original]: {
      get label() {
        return 'Original'
      },
    },
  }

  static readonly filterMeta: Record<RosterFilter, FilterMeta> = {
    [RosterFilter.All]: {
      get label() {
        return 'Todos'
      },
    },
    [RosterFilter.Profile]: {
      get label() {
        return 'Perfil'
      },
    },
    [RosterFilter.Proposals]: {
      get label() {
        return 'Propuestas'
      },
    },
  }

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

  static readonly filterChoices: RosterFilter[] = [RosterFilter.All, RosterFilter.Profile, RosterFilter.Proposals]

  static getLayerMeta(layer: CostumeLayer | null | undefined): LayerMeta {
    if (layer == null) return this.layerMeta[CostumeLayer.Original]

    return this.layerMeta[layer]
  }

  static getFilterMeta(filter: RosterFilter | null | undefined): FilterMeta {
    if (filter == null) return this.filterMeta[RosterFilter.All]

    return this.filterMeta[filter]
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

  /** Etiqueta del traje: el pack base distingue los que no tienen nombre o no se identificaron. */
  static layerLabelOf(current: Current | null | undefined) {
    const layer = this.layerOf(current)
    const label = this.getLayerMeta(layer).label

    if (layer !== CostumeLayer.Base) return label
    if (current?.kind === 'unnamed') return label + ' · sin nombre'
    if (current?.kind === 'unknown') return label + ' · sin identificar'

    return label
  }

  static proposalOf(vid: string | null, unsent: boolean) {
    if (!vid) return ProposalState.None
    if (unsent) return ProposalState.Unsent

    return ProposalState.Proposed
  }

  static countsLabel(profile: number, total: number) {
    return profile + ' de ' + total + ' trajes con mod de tu perfil'
  }

  static breakdownLabel(base: number, unidentified: number, original: number) {
    const unidentifiedLabel = unidentified ? ' (' + unidentified + ' sin identificar)' : ''

    return base + ' del pack base' + unidentifiedLabel + ' · ' + original + ' originales'
  }

  static meterLabel(profile: number) {
    return profile + ' de 8 trajes con mod de tu perfil'
  }

  static proposalsLabel(count: number) {
    if (count === 1) return '1 propuesta'

    return count + ' propuestas'
  }

  static emptyLabel() {
    return 'Nada coincide. Prueba otro nombre o quita el filtro.'
  }
}
