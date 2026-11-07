import { computed } from 'vue'
import { setSkin, tick } from '../../../composables/useApp'
import { currentName } from '../../../shared/helpers/skins'
import { norm, trajeName } from '../../../shared/helpers/text'
import { clearAt, zoomImage } from '../../plan/composables/usePlan'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { ownVariant, ownVid } from '../../plan/services/sync'
import { driveAlts } from '../../roster/driveAlts'

interface UseActiveCostumeBarProps {
  fighterCode: string
  activeSlot: number
}

const variantSuffix = (variantId: string | null): string => {
  if (!variantId) return ''

  const match = /:c0([0-7])$/.exec(variantId)

  return match ? ` (Color ${Number(match[1]) + 1})` : ''
}

export const useActiveCostumeBar = (props: UseActiveCostumeBarProps) => {
  const current = computed(() => {
    tick.value

    return curOf(props.fighterCode, props.activeSlot)
  })

  const slotLabel = computed(() => trajeName(props.activeSlot))

  const installedName = computed(() => {
    const slot = current.value

    if (!slot || slot.kind === 'original') return 'Original'

    return currentName(slot) || 'Mod'
  })

  const installedImg = computed(() => current.value?.img || null)

  const ownProposalName = computed<string | null>(() => {
    tick.value

    const vid = ownVid(props.fighterCode, props.activeSlot) as string | null

    if (!vid) return null

    const variant = ownVariant(props.fighterCode, props.activeSlot) as string | null
    const skin = skinOf(vid)

    return (skin ? skin.name : vid) + variantSuffix(variant)
  })

  const moveCandidateVid = computed<string | null>(() => {
    tick.value

    const slot = current.value

    if (!slot || slot.kind === 'original') return null
    if (slot.vid && skinOf(slot.vid)) return slot.vid

    const targetName = norm(slot.name || '')

    if (!targetName) return null

    const matchedAlt = driveAlts.value.find(
      (alt) => alt.code === props.fighterCode && alt.vid && norm(alt.name) === targetName,
    )

    if (!matchedAlt?.vid) return null

    return skinOf(matchedAlt.vid) ? matchedAlt.vid : null
  })

  const zoomCurrent = () => {
    if (!installedImg.value) return

    zoomImage(`${slotLabel.value} · ${installedName.value}`, installedImg.value)
  }

  const openMoveColor = () => {
    if (!moveCandidateVid.value) return

    setSkin(moveCandidateVid.value)
  }

  const clearOwn = () => {
    clearAt(props.fighterCode, props.activeSlot)
  }

  return {
    slotLabel,
    installedName,
    installedImg,
    ownProposalName,
    moveCandidateVid,
    zoomCurrent,
    openMoveColor,
    clearOwn,
  }
}
