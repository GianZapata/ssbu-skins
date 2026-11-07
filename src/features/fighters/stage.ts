import type { Skin } from '../../boot'
import { selectSlot, setSkin } from '../../composables/useApp'
import type { StageChoice } from '../../shared/helpers/ssbu'
import { clearAt, proposeAt, showNotice } from '../plan/composables/usePlan'
import type { PersonName } from '../plan/enums/PersonName'
import { getPerson } from '../plan/services/sync'

/** El único botón escribe el plan, lo quita o lleva al traje donde ya está. */
export const commitStage = (code: string, slot: number, choice: StageChoice, skin: Skin | null) => {
  if (choice.kind === 'none') return false

  if (choice.kind === 'goto' && choice.other !== null) {
    selectSlot(choice.other, false)

    return true
  }

  if (choice.kind === 'clear') {
    clearAt(code, slot)
    setSkin('')

    return true
  }

  if ((choice.kind === 'use' || choice.kind === 'replace') && skin) {
    return proposeAt(code, slot, skin.vid, null, () => {
      const author = getPerson() as PersonName | null

      setSkin('')
      showNotice('Propuesta guardada', { label: 'Deshacer', fn: () => { clearAt(code, slot, author) } }, 6000)
    })
  }

  return false
}
