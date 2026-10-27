import { computed } from 'vue'
import { paraOf, route, S, setDest, skinEntry, tick } from '../../composables/useApp'
import { condOf, pillsOf } from '../../features/catalog/composables/useCatalog'
import { curOf } from '../../features/plan/helpers/lookup'
import { imgsOf, useHere, zoomSkin } from '../../features/plan/composables/usePlan'
import { trajeName } from '../../shared/helpers/text'

const slots = [0, 1, 2, 3, 4, 5, 6, 7]

export const useFichaPage = () => {
  const model = computed(() => {
    tick.value
    const entry = skinEntry(route.value.vid)
    if (!entry) return null
    const para = paraOf(route.value.q.para)
    const dest = para ? para.n : S.dest
    const shots = imgsOf(entry.p)
    const index = Math.min(S.galI, Math.max(shots.length - 1, 0))
    const native = entry.p.native || []
    const outside = dest != null && native.length > 0 && !native.includes(dest)
    return {
      entry,
      para,
      dest,
      shots,
      index,
      outside,
      pills: pillsOf(entry.p),
      cond: condOf(entry.p),
      current: dest == null ? null : curOf(entry.f.code, dest),
      slots,
    }
  })
  return { model, setDest, trajeName, useHere, zoomSkin }
}
