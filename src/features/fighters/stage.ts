import type { Skin } from '../../boot'
import { selectSlot } from '../../composables/useApp'
import type { StageChoice } from '../../shared/helpers/ssbu'
import { clearAt, proposeAt } from '../plan/composables/usePlan'
import { clearCandidate } from './candidate'

/** El único botón escribe el plan, lo quita o lleva al traje donde ya está. */
export const commitStage = (code: string, slot: number, choice: StageChoice, skin: Skin | null) => {
  if (choice.kind === 'none') return false

  if (choice.kind === 'goto' && choice.other !== null) {
    clearCandidate()
    selectSlot(choice.other)

    return true
  }

  if (choice.kind === 'clear') {
    clearAt(code, slot)
    clearCandidate()

    return true
  }

  if ((choice.kind === 'use' || choice.kind === 'replace') && skin) {
    const saved = proposeAt(code, slot, skin.vid)

    if (saved) clearCandidate()

    return saved
  }

  return false
}
