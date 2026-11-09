import { ProposalOrigin } from '../enums/ProposalOrigin'

interface ProposalOriginMeta {
  label: string
}

export class PlanHelper {
  static readonly originMeta: Record<ProposalOrigin, ProposalOriginMeta> = {
    [ProposalOrigin.Unsent]: {
      get label() {
        return 'Sin enviar'
      },
    },
    [ProposalOrigin.Mine]: {
      get label() {
        return 'Tuyas'
      },
    },
    [ProposalOrigin.Friend]: {
      get label() {
        return 'De otros'
      },
    },
  }

  static getOriginMeta(origin: ProposalOrigin | null | undefined): ProposalOriginMeta {
    if (origin == null) return this.originMeta[ProposalOrigin.Mine]

    return this.originMeta[origin]
  }

  static originOf(by: string | null | undefined, uid: string | null | undefined, local: boolean) {
    if (local) return ProposalOrigin.Mine
    if (!uid || !by || by === uid) return ProposalOrigin.Mine

    return ProposalOrigin.Friend
  }

  static authorLabel(by: string | null | undefined) {
    if (!by) return 'Anónimo'

    return 'Amigo · ' + by.slice(0, 8)
  }

  static whenLabel(at: number | null | undefined) {
    if (at == null) return ''

    return new Date(at).toLocaleString('es')
  }
}
