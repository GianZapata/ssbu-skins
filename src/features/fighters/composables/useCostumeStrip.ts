import { computed, nextTick, shallowRef } from 'vue'
import { tick } from '../../../composables/useApp'
import { currentName } from '../../../shared/helpers/skins'
import type { ProposalRow } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'
import { usePerson } from '../../plan/composables/usePerson'
import { lastSavedPulse, zoomImage, type SavedPulse } from '../../plan/composables/usePlan'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { proposalsAt } from '../../plan/services/sync'
import { CostumeBadgeKind } from '../enums/CostumeBadgeKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface StripCell {
  n: number
  number: number
  img: string | null
  badge: string
  isOriginal: boolean
  isActive: boolean
  hasOwnProposal: boolean
  ownThumb: string | null
  hasFriendProposal: boolean
  isPulsing: boolean
  ariaLabel: string
}

interface UseCostumeStripProps {
  fighterCode: string
  activeSlot: number
}

interface UseCostumeStripEmits {
  (event: 'selectSlot', slot: number): void
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

const isCellPulsing = (pulse: SavedPulse | null, code: string, slot: number): boolean => {
  if (!pulse) return false
  if (pulse.code !== code || pulse.slot !== slot) return false

  return Date.now() - pulse.at < 900
}

export const useCostumeStrip = (props: UseCostumeStripProps, emit: UseCostumeStripEmits) => {
  const buttonRefs = shallowRef<Array<HTMLButtonElement | null>>([])

  const { activePerson } = usePerson()

  const cells = computed<StripCell[]>(() => {
    tick.value

    const person = activePerson.value
    const pulse = lastSavedPulse.value

    return SLOTS.map((n) => {
      const current = curOf(props.fighterCode, n)
      const badgeKind = CostumeHelper.badgeKindOf(current)
      const badge = CostumeHelper.getBadgeMeta(badgeKind).label
      const proposals = proposalsAt(props.fighterCode, n) as ProposalRow[]
      const own = person ? proposals.find((row) => row.name === person) ?? null : null
      const friends = proposals.filter((row) => !person || row.name !== person)
      const ownSkin = own ? skinOf(own.vid) : null
      const installedLabel = badgeKind === CostumeBadgeKind.Original
        ? 'Original'
        : `Mod (${currentName(current)})`

      const parts = [trajeName(n), installedLabel]

      if (own) parts.push(`Tu propuesta: ${ownSkin ? ownSkin.name : own.vid}`)
      if (friends.length) {
        const names = friends.map((row) => PlanHelper.personLabel(row.name)).join(', ')

        parts.push(`Propuestas de ${names}`)
      }

      return {
        n,
        number: n + 1,
        img: current?.img || null,
        badge,
        isOriginal: badgeKind === CostumeBadgeKind.Original,
        isActive: props.activeSlot === n,
        hasOwnProposal: Boolean(own),
        ownThumb: own ? CostumeHelper.proposalThumbOf(props.fighterCode, own.vid, own.variant) : null,
        hasFriendProposal: friends.length > 0,
        isPulsing: isCellPulsing(pulse, props.fighterCode, n),
        ariaLabel: parts.join(', '),
      }
    })
  })

  const setButtonRef = (slot: number, element: unknown) => {
    buttonRefs.value[slot] = element instanceof HTMLButtonElement ? element : null
  }

  const onCellClick = (cell: StripCell) => {
    if (cell.isActive) {
      if (cell.img) zoomImage(`${trajeName(cell.n)} · ${cell.badge}`, cell.img)

      return
    }

    emit('selectSlot', cell.n)
  }

  const onStripKeydown = (event: KeyboardEvent, slot: number) => {
    let next = -1

    if (event.key === 'ArrowRight') next = (slot + 1) % 8
    else if (event.key === 'ArrowLeft') next = (slot + 7) % 8
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 7

    if (next < 0) return

    event.preventDefault()
    emit('selectSlot', next)
    void nextTick(() => {
      buttonRefs.value[next]?.focus()
    })
  }

  return {
    cells,
    setButtonRef,
    onCellClick,
    onStripKeydown,
  }
}
