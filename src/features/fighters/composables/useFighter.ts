import { curOf, skinOf } from '../../plan/helpers/lookup'
import { imgsOf } from '../../plan/composables/usePlan'
import { planEntries, planVid } from '../../plan/services/sync'
import { S, selectSlot } from '../../../composables/useApp'
import { SSBU, type Current } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'

export const stageOf = (code: string, slot: number) => {
  const current = curOf(code, slot) || { kind: 'unknown', name: 'Sin identificar', img: null }
  const savedVid = planVid(code, slot) as string | null
  const saved = skinOf(savedVid)
  const candidate = skinOf(S.cand)
  const right = candidate || saved
  const block = candidate ? SSBU.assignBlock(planEntries(), code, slot, candidate.vid) : null
  const shots = right ? imgsOf(right) : []
  const index = shots.length ? Math.min(S.galI, shots.length - 1) : 0
  return {
    current,
    saved,
    candidate,
    right,
    comparing: !!(savedVid || candidate),
    shots,
    index,
    block,
    addLabel: block && block.kind === 'replace' ? 'Reemplazar en ' + trajeName(slot) : 'Usar en ' + trajeName(slot),
  }
}

export const moveSlot = (event: KeyboardEvent) => {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const group = event.currentTarget as HTMLElement
  const items = [...group.querySelectorAll<HTMLElement>('[role="radio"]')]
  const index = items.indexOf(document.activeElement as HTMLElement)
  if (index < 0) return
  event.preventDefault()
  let next = 0
  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = items.length - 1
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % items.length
  else next = (index - 1 + items.length) % items.length
  selectSlot(Number(items[next].dataset.slot))
}

export const useFighter = () => ({ stageOf, moveSlot, curOf })
