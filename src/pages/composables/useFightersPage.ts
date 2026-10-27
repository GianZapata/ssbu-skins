import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { go, tick } from '../../composables/useApp'
import { changesOf, skinOf } from '../../features/plan/helpers/lookup'
import { countChosen } from '../../features/plan/composables/usePlan'
import { planEntries, state } from '../../features/plan/services/sync'
import { thumbOf } from '../../shared/helpers/skins'
import { initialsOf, norm } from '../../shared/helpers/text'
import type { PlanRow } from '../../shared/helpers/ssbu'

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

  /** Barra "Elegidas": total y hasta tres miniaturas de lo último que aparece en el plan. */
  const picked = computed(() => {
    tick.value
    const total = countChosen()
    const thumbs = (planEntries() as PlanRow[])
      .map((row) => thumbOf(skinOf(row.vid)))
      .filter((src): src is string => !!src)
      .slice(0, 3)
    return { total, thumbs }
  })

  const openSummary = () => go('#/cambios')

  return { loading, rows, picked, openSummary }
}
