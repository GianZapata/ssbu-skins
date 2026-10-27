import { computed } from 'vue'
import { clearCand, fighterOf, route, selectSlot, slotOf, tick } from '../../composables/useApp'
import { moveSlot, stageOf, useFighter } from '../../features/fighters/composables/useFighter'
import { clearAt, confirmCandidate, zoomSkin } from '../../features/plan/composables/usePlan'
import { trajeName } from '../../shared/helpers/text'

const slots = [0, 1, 2, 3, 4, 5, 6, 7]

export const useFighterPage = () => {
  const fighterApi = useFighter()
  const model = computed(() => {
    tick.value
    const code = route.value.code
    const fighter = fighterOf(code)
    const slot = slotOf()
    return {
      fighter,
      code,
      slot,
      stage: fighter && !fighter.mii ? stageOf(code, slot) : null,
      slots: slots.map((n) => ({ n, current: fighterApi.curOf(code, n) })),
    }
  })
  return { model, moveSlot, selectSlot, trajeName, clearAt, clearCand, confirmCandidate, zoomSkin }
}
