import { computed } from 'vue'
import type { Fighter } from '../../boot'
import { fighterQuery, onFind, S, tick } from '../../composables/useApp'
import { changesOf } from '../../features/plan/helpers/lookup'
import { state } from '../../features/plan/services/sync'
import { norm, initialsOf } from '../../shared/helpers/text'

export const useFightersPage = () => {
  const rows = computed(() => {
    tick.value
    const query = norm(fighterQuery.value)
    return (state.F as Fighter[]).filter((fighter) => !query || norm(fighter.name).includes(query)).map((fighter) => {
      const count = changesOf(fighter.code).length
      const label = count ? fighter.name + ', ' + count + (count > 1 ? ' skins elegidas' : ' skin elegida') : fighter.name
      return { fighter, count, label, href: '#/luchador/' + encodeURIComponent(fighter.code) }
    })
  })
  const find = (event: Event) => onFind((event.target as HTMLInputElement).value)
  return { rows, S, find, initialsOf }
}
