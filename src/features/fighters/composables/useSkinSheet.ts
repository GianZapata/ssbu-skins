import { computed, ref, watch } from 'vue'
import { selectSlot, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { isSha, portraitUrl } from '../../../shared/helpers/portraits'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { SSBU, type PlanRow, type ProposalRow } from '../../../shared/helpers/ssbu'
import { trajeName } from '../../../shared/helpers/text'
import { usePerson } from '../../plan/composables/usePerson'
import { clearAt, proposeAt, showNotice, zoomImage, zoomSkin } from '../../plan/composables/usePlan'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { ownEntries, ownVariant, ownVid, proposalsAt } from '../../plan/services/sync'
import { downloadedVids, driveAlts, type DriveVariant } from '../../roster/driveAlts'
import { SkinActionKind } from '../enums/SkinActionKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface VariantOption {
  id: string
  slotNumber: number
  label: string
  portrait: string | null
  isSelected: boolean
}

export interface DestinationChip {
  slot: number
  label: string
  isCompatible: boolean
  isSelected: boolean
  hasOwnProposal: boolean
  hasFriendProposal: boolean
}

export interface FriendSlotProposal {
  key: string
  person: string
  skinName: string
  thumb: string | null
}

export interface SkinActionState {
  kind: SkinActionKind
  label: string
  otherSlot: number | null
}

interface UseSkinSheetProps {
  fighterCode: string
  activeSlot: number
  candidateVid: string
}

interface UseSkinSheetEmits {
  (event: 'close'): void
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

export const useSkinSheet = (props: UseSkinSheetProps, emit: UseSkinSheetEmits) => {
  const targetSlot = ref(props.activeSlot)
  const selectedVariantId = ref<string | null>(null)

  const desktop = useDesktop()

  const { activePerson } = usePerson()

  const skin = computed(() => {
    tick.value

    if (!props.candidateVid) return null

    return skinOf(props.candidateVid) || null
  })

  const isOpen = computed(() => Boolean(skin.value))

  const matchedAlt = computed(() => {
    const currentSkin = skin.value

    if (!currentSkin) return null

    return (
      driveAlts.value.find(
        (alt) =>
          alt.code === props.fighterCode
          && (alt.vid === currentSkin.vid || alt.mod_id === String(currentSkin.id)),
      ) ?? null
    )
  })

  const rawVariants = computed<DriveVariant[]>(() => matchedAlt.value?.variants ?? [])

  const selectedVariant = computed<DriveVariant | null>(() => {
    const list = rawVariants.value

    if (!list.length) return null

    if (selectedVariantId.value) {
      const hit = list.find((item) => item.id === selectedVariantId.value)

      if (hit) return hit
    }

    return list[0] ?? null
  })

  const variantOptions = computed<VariantOption[]>(() => {
    const list = rawVariants.value

    if (list.length <= 1) return []

    const activeId = selectedVariant.value?.id ?? null

    return list.map((variant) => ({
      id: variant.id,
      slotNumber: variant.slot,
      label: 'Color ' + variant.slot,
      portrait: isSha(variant.portrait) ? portraitUrl(variant.portrait) : null,
      isSelected: variant.id === activeId,
    }))
  })

  const candidateImage = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin) return null

    const activeVar = selectedVariant.value

    if (activeVar) return isSha(activeVar.portrait) ? portraitUrl(activeVar.portrait) : null

    return thumbOf(currentSkin)
  })

  const authorLabel = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin || !currentSkin.audited) return null
    if (!currentSkin.author || currentSkin.author === 'pending') return null

    return currentSkin.author
  })

  const isDownloaded = computed(() => {
    const currentSkin = skin.value

    if (!currentSkin) return false

    return downloadedVids().has(currentSkin.vid) || Boolean(matchedAlt.value)
  })

  const externalModUrl = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin || isDownloaded.value) return null
    if (!currentSkin.url) return null

    return currentSkin.url
  })

  const compatibleSlots = computed<number[]>(() => {
    const currentSkin = skin.value

    if (!currentSkin) return SLOTS

    const sourceSlots = SSBU.sourceSlotsOf({
      variant: selectedVariant.value?.id ?? null,
      alt: matchedAlt.value,
      skin: currentSkin,
    })

    return SSBU.compatibleSlots(props.fighterCode, sourceSlots)
  })

  const hasIncompatibleSlots = computed(() => compatibleSlots.value.length < 8)

  const destinationChips = computed<DestinationChip[]>(() => {
    tick.value

    const allowed = compatibleSlots.value
    const person = activePerson.value

    return SLOTS.map((slot) => {
      const list = proposalsAt(props.fighterCode, slot) as ProposalRow[]
      const hasOwn = Boolean(person && list.some((row) => row.name === person))
      const hasFriend = list.some((row) => !person || row.name !== person)

      return {
        slot,
        label: trajeName(slot),
        isCompatible: allowed.includes(slot),
        isSelected: targetSlot.value === slot,
        hasOwnProposal: hasOwn,
        hasFriendProposal: hasFriend,
      }
    })
  })

  const targetCurrent = computed(() => {
    tick.value

    return curOf(props.fighterCode, targetSlot.value)
  })

  const targetCurrentName = computed(() => {
    const slot = targetCurrent.value

    if (!slot || slot.kind === 'original') return 'Original'

    return currentName(slot) || 'Mod'
  })

  const targetCurrentImg = computed(() => targetCurrent.value?.img || null)

  const friendProposalsOnTarget = computed<FriendSlotProposal[]>(() => {
    tick.value

    const person = activePerson.value
    const rows = proposalsAt(props.fighterCode, targetSlot.value) as ProposalRow[]

    return rows
      .filter((row) => !person || row.name !== person)
      .map((row) => {
        const rowSkin = skinOf(row.vid)

        return {
          key: row.key,
          person: PlanHelper.personLabel(row.name),
          skinName: rowSkin ? rowSkin.name : row.vid,
          thumb: CostumeHelper.proposalThumbOf(props.fighterCode, row.vid, row.variant),
        }
      })
  })

  const effectiveVariantId = computed<string | null>(() => {
    if (!rawVariants.value.length) return null

    return selectedVariant.value?.id ?? null
  })

  const actionState = computed<SkinActionState>(() => {
    tick.value

    const currentSkin = skin.value

    if (!currentSkin) return { kind: SkinActionKind.Blocked, label: 'Reemplazar', otherSlot: null }
    if (!compatibleSlots.value.includes(targetSlot.value)) {
      return { kind: SkinActionKind.Blocked, label: 'Color no compatible', otherSlot: null }
    }

    const slot = targetSlot.value
    const variantId = effectiveVariantId.value
    const currentOwnVid = ownVid(props.fighterCode, slot) as string | null
    const currentOwnVar = ownVariant(props.fighterCode, slot) as string | null

    if (currentOwnVid === currentSkin.vid && (currentOwnVar || null) === variantId) {
      return {
        kind: SkinActionKind.Clear,
        label: 'Quitar propuesta',
        otherSlot: null,
      }
    }

    const block = SSBU.assignBlock(
      ownEntries() as PlanRow[],
      props.fighterCode,
      slot,
      currentSkin.vid,
      variantId,
    )

    if (block.kind === 'duplicate' && typeof block.other === 'number') {
      return {
        kind: SkinActionKind.Jump,
        label: 'Ir a ' + trajeName(block.other),
        otherSlot: block.other,
      }
    }

    return {
      kind: SkinActionKind.Replace,
      label: 'Reemplazar',
      otherSlot: null,
    }
  })

  const chooseVariant = (variantId: string) => {
    selectedVariantId.value = variantId
  }

  const chooseDestination = (chip: DestinationChip) => {
    if (!chip.isCompatible) return

    targetSlot.value = chip.slot
  }

  const zoomCandidate = () => {
    const currentSkin = skin.value

    if (!currentSkin) return

    if (selectedVariant.value && candidateImage.value) {
      zoomImage(`${currentSkin.name} · Color ${selectedVariant.value.slot}`, candidateImage.value)

      return
    }

    if (!selectedVariant.value) zoomSkin(currentSkin, 0)
  }

  const zoomTargetCurrent = () => {
    if (!targetCurrentImg.value) return

    zoomImage(`${trajeName(targetSlot.value)} · ${targetCurrentName.value}`, targetCurrentImg.value)
  }

  const runPrimaryAction = () => {
    const currentSkin = skin.value
    const stateNow = actionState.value

    if (!currentSkin || stateNow.kind === SkinActionKind.Blocked) return

    if (stateNow.kind === SkinActionKind.Jump && stateNow.otherSlot !== null) {
      selectSlot(stateNow.otherSlot, false)

      return
    }

    const destination = targetSlot.value

    if (stateNow.kind === SkinActionKind.Clear) {
      clearAt(props.fighterCode, destination)

      return
    }

    proposeAt(
      props.fighterCode,
      destination,
      currentSkin.vid,
      effectiveVariantId.value,
      () => {
        selectSlot(destination, desktop.value)
        showNotice(
          `Propuesta guardada · ${trajeName(destination)}`,
          {
            label: 'Deshacer',
            fn: () => {
              clearAt(props.fighterCode, destination)
            },
          },
          5000,
        )
      },
    )
  }

  const onDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen.value) emit('close')
  }

  watch(
    () => [props.fighterCode, props.candidateVid] as const,
    () => {
      const variants = rawVariants.value

      if (!variants.length) {
        selectedVariantId.value = null

        return
      }

      const matchingActive = variants.find((item) => item.slot === props.activeSlot + 1)

      selectedVariantId.value = (matchingActive ?? variants[0])?.id ?? null
    },
    { immediate: true },
  )

  watch(
    () => [props.fighterCode, props.activeSlot, props.candidateVid, compatibleSlots.value.join(',')] as const,
    () => {
      if (compatibleSlots.value.includes(props.activeSlot)) {
        targetSlot.value = props.activeSlot

        return
      }

      targetSlot.value = compatibleSlots.value[0] ?? props.activeSlot
    },
    { immediate: true },
  )

  return {
    desktop,
    skin,
    isOpen,
    candidateImage,
    authorLabel,
    variantOptions,
    destinationChips,
    hasIncompatibleSlots,
    targetSlot,
    targetCurrentName,
    targetCurrentImg,
    friendProposalsOnTarget,
    externalModUrl,
    actionState,
    chooseVariant,
    chooseDestination,
    zoomCandidate,
    zoomTargetCurrent,
    runPrimaryAction,
    onDrawerOpenChange,
  }
}
