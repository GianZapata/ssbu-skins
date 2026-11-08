import { PersonName } from '../enums/PersonName'

export class PlanHelper {
  static readonly people: readonly PersonName[] = [
    PersonName.Gian,
    PersonName.Alan,
    PersonName.Ches,
    PersonName.Samu,
  ]

  static isPersonName(value: unknown): value is PersonName {
    return (this.people as readonly unknown[]).includes(value)
  }

  static personLabel(name: string | null | undefined): string {
    if (this.isPersonName(name)) return name

    return 'Otros'
  }

  static whenLabel(at: number | null | undefined): string {
    if (at == null) return ''

    return new Date(at).toLocaleString('es')
  }
}
