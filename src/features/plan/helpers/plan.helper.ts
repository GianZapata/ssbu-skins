import { PersonName } from '../enums/PersonName'
import { ProposalOrigin } from '../enums/ProposalOrigin'

interface ProposalOriginMeta {
  label: string
}

export class PlanHelper {
  static readonly people: readonly PersonName[] = [
    PersonName.Gian,
    PersonName.Alan,
    PersonName.Ches,
    PersonName.Samu,
  ]

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

  static isPersonName(value: unknown): value is PersonName {
    return (this.people as readonly unknown[]).includes(value)
  }

  static personLabel(name: string | null | undefined): string {
    if (this.isPersonName(name)) return name

    return 'Otros'
  }

  static originOfPerson(
    rowName: string | null | undefined,
    currentPerson: PersonName | null,
    unsent: boolean,
  ): ProposalOrigin {
    if (unsent) return ProposalOrigin.Unsent
    if (currentPerson && rowName === currentPerson) return ProposalOrigin.Mine

    return ProposalOrigin.Friend
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
