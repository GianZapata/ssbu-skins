import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { tick } from '../../composables/useApp'
import { changesOf } from '../../features/plan/helpers/lookup'
import { state } from '../../features/plan/services/sync'
import { initialsOf, norm } from '../../shared/helpers/text'

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
        const label = count ? fighter.name + ', ' + count + (count > 1 ? ' skins elegidas' : ' skin elegida') : fighter.name
        return { fighter, count, label, href: '#/luchador/' + encodeURIComponent(fighter.code), initial: initialsOf(fighter.name) }
      })
  })

  return { loading, rows }
}
