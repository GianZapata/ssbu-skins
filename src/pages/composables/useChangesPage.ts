import { computed } from 'vue'
import { showRecover, tick } from '../../composables/useApp'
import { curOf, skinOf } from '../../features/plan/helpers/lookup'
import { clearAt, legacyItems, planGroups, showExport } from '../../features/plan/composables/usePlan'
import { trajeName } from '../../shared/helpers/text'

export const useChangesPage = () => {
  const groups = computed(() => {
    tick.value
    return planGroups().map((group) => ({
      fighter: group.fighter,
      rows: group.rows.map((row) => {
        const current = curOf(row.code, row.n)
        const skin = skinOf(row.vid)
        return { ...row, from: current ? current.name : '', to: skin ? skin.name : 'Skin sin nombre', img: skin ? skin.img : null }
      }),
    }))
  })
  const legacy = computed(() => {
    tick.value
    return legacyItems()
  })
  return { groups, legacy, clearAt, showExport, showRecover, trajeName }
}
