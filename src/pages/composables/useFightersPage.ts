import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { tick } from '../../composables/useApp'
import { BoardHelper } from '../../features/board/helpers/board.helper'
import { changesOf } from '../../features/plan/helpers/lookup'
import { state } from '../../features/plan/services/sync'
import { initialsOf, norm } from '../../shared/helpers/text'

type OwnSlot = { src?: string; skin?: boolean }
type Inventory = { fighters?: Record<string, { slots?: Record<string, OwnSlot> }> } | null

const ownOf = (code: string) => {
  const slots = (state.INV as Inventory)?.fighters?.[code]?.slots

  return BoardHelper.gianCountOf(Array.from({ length: 8 }, (_, n) => slots?.[String(n)]))
}

/** Se conserva al volver desde un luchador. */
export const fighterQuery = ref('')

export const useFightersPage = () => {
  const loading = computed(() => {
    tick.value
    return (state.F as Fighter[]).length === 0
  })

  const rows = computed(() => {
    tick.value
    const query = norm(fighterQuery.value)
    return (state.F as Fighter[])
      .filter((fighter) => !query || norm(fighter.name).includes(query))
      .map((fighter) => {
        const count = changesOf(fighter.code).length
        const own = ownOf(fighter.code)
        const chosen = count ? fighter.name + ', ' + count + (count > 1 ? ' skins elegidas' : ' skin elegida') : fighter.name
        const label = chosen + ', ' + own + ' de 8 trajes tuyos'
        return { fighter, count, own, label, href: '#/luchador/' + encodeURIComponent(fighter.code), initial: initialsOf(fighter.name) }
      })
  })

  return { loading, rows }
}
