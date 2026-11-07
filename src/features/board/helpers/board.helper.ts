import { missingPortrait, missingPortraitOf } from '../../../shared/helpers/skins'
import { BoardFilter } from '../enums/BoardFilter'

interface BoardFilterMeta {
  label: string
}

interface BoardSlotRecord {
  src?: string
  skin?: boolean
}

interface BoardAltSlots {
  any: boolean
  slots: number[]
}

export class BoardHelper {
  static readonly filterMeta: Record<BoardFilter, BoardFilterMeta> = {
    [BoardFilter.All]: {
      get label() {
        return 'Filtros'
      },
    },
    [BoardFilter.Gian]: {
      get label() {
        return 'Con skins tuyas'
      },
    },
    [BoardFilter.Alts]: {
      get label() {
        return 'Con alternativas'
      },
    },
  }

  static readonly filterChoices: BoardFilter[] = [BoardFilter.Gian, BoardFilter.Alts]

  static getFilterMeta(filter: BoardFilter | null | undefined): BoardFilterMeta {
    if (filter == null) return this.filterMeta[BoardFilter.All]

    return this.filterMeta[filter]
  }

  static filterTriggerLabel(filter: BoardFilter) {
    if (filter === BoardFilter.All) return this.filterMeta[BoardFilter.All].label

    return 'Filtros · 1'
  }

  static countsLabel(gian: number, slots: number, fighters: number, alternatives: number) {
    const pct = slots > 0 ? Math.round((gian / slots) * 100) : 0

    return gian + '/' + slots + ' trajes propios (' + pct + '%) · ' + fighters + ' luchadores · ' + alternatives + ' alternativas'
  }

  static isOwnSlot(record: BoardSlotRecord | null | undefined) {
    if (record == null) return false
    if (record.src === 'perfil') return true

    return record.skin === true
  }

  static gianCountOf(records: Array<BoardSlotRecord | null | undefined>) {
    return records.filter((record) => this.isOwnSlot(record)).length
  }

  static fighterSubtitle(gianCount: number, altCount: number) {
    if (gianCount === 8) return 'Roster completo con tus skins (8/8)'

    const missing = 8 - gianCount
    const missingLabel = missing === 1 ? 'faltante' : 'faltantes'

    if (altCount) {
      return gianCount + '/8 trajes de tu colección (' + missing + ' ' + missingLabel + ' · ' + altCount + ' descargadas disponibles)'
    }

    return gianCount + '/8 trajes de tu colección (' + missing + ' ' + missingLabel + ' · sin descargas)'
  }

  static jumpOption(name: string, gianCount: number) {
    return name + ' (' + gianCount + '/8)'
  }

  static pendingStrip(name: string) {
    return 'Elegida: ' + name
  }

  static variantsUnavailable() {
    return 'Variantes: aún no disponibles'
  }

  static changesChip(count: number) {
    if (count === 1) return '1 cambio sin aplicar'

    return count + ' cambios sin aplicar'
  }

  static densityLabel(compact: boolean) {
    if (compact) return 'Ampliar'

    return 'Compactar'
  }

  static emptyLabel() {
    return 'Nada coincide. Prueba otro nombre o quita el filtro.'
  }

  static altChosenLabel(slots: number[]) {
    return 'Elegida · traje ' + slots.join(', ')
  }

  static slotsLabel(alt: BoardAltSlots) {
    if (alt.any) return 'Cualquier color'

    return (alt.slots.length > 1 ? 'Colores ' : 'Color ') + alt.slots.join(', ')
  }

  static missingPortrait() {
    return missingPortrait()
  }

  static missingPortraitLabel(name: string) {
    return missingPortraitOf(name)
  }
}
