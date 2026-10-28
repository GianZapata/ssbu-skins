import { computed, ref, shallowRef, watch } from 'vue'
import { back, paraOf, route, skinEntry, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { SSBU, type PlanRow, type StageChoice } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'
import { imgsOf, zoomSkin } from '../../plan/composables/usePlan'
import { planEntries, planVid } from '../../plan/services/sync'
import { handoffCandidate, setCandidate } from '../candidate'
import { commitStage } from '../stage'

export const useSkinSheet = () => {
  const kept = shallowRef<ReturnType<typeof liveOf>>(null)
  const slide = ref(0)

  const desktop = useDesktop()

  const live = computed(() => {
    tick.value

    return liveOf()
  })

  const m = computed(() => live.value || kept.value)
  const open = computed(() => !!live.value)

  const close = () => {
    if (route.value.v === 'ficha') back()
  }

  const act = () => {
    const value = live.value

    if (!value) return

    const moved = commitStage(value.code, value.slot, value.choice)

    if (moved && value.choice.kind !== 'goto') close()
  }

  const compareHere = () => {
    const value = live.value

    if (!value) return

    handoffCandidate(value.code, value.slot, value.vid)
    swap('#/luchador/' + encodeURIComponent(value.code) + '/' + (value.slot + 1))
  }

  const zoom = (index: number) => {
    if (!m.value) return

    slide.value = index
    zoomSkin(m.value.entry.p, index)
  }

  watch(live, (value) => {
    if (!value) return

    kept.value = value
    setCandidate(value.code, value.slot, value.entry.p)
  }, { immediate: true })

  watch(() => live.value?.vid, () => {
    slide.value = 0
  })

  return { desktop, slide, m, open, close, act, compareHere, zoom }
}

const liveOf = () => {
  const r = route.value

  if (r.v !== 'ficha') return null

  const entry = skinEntry(r.vid)
  const para = paraOf(r.q.para)

  if (!entry || !para) return null

  const placed = (planEntries() as PlanRow[]).find((row) => row.code === para.code && row.vid === r.vid)
  const elsewhere = placed && placed.n !== para.n ? placed.n : null
  const saved = planVid(para.code, para.n) as string | null
  const choice: StageChoice = SSBU.stageChoice({
    slot: para.n,
    vid: entry.p.vid,
    saved,
    elsewhere,
    withdrawn: !!entry.p.withdrawn,
    mii: !!entry.p.mii,
    incompatible: entry.p.wifi_status === 'incompatible',
  })

  const compare = r.q.de === 'catalogo' && (choice.kind === 'use' || choice.kind === 'replace')

  return {
    entry,
    code: para.code,
    slot: para.n,
    vid: r.vid,
    choice,
    compare,
    compareLabel: 'Comparar en ' + trajeName(para.n),
    shots: imgsOf(entry.p),
  }
}
