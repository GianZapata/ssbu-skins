import { computed, ref } from 'vue'
import { onKeyStroke, usePointerSwipe } from '@vueuse/core'
import type { Skin } from '../../boot'
import {
  fighterOf,
  route,
  S,
  selectSlot,
  setSkin,
  skinParam,
  slotOf,
  stepFighter,
  tick,
  viewRoute,
} from '../../composables/useApp'
import { useDesktop } from '../../composables/useDesktop'
import { useOutOfView } from '../../composables/useOutOfView'
import { isOpenFighterPick, openFighterPick } from '../../features/explore/composables/useFighterPick'
import { zoomSkin } from '../../features/plan/composables/usePlan'
import { isOpenPerson } from '../../features/plan/composables/usePerson'
import { skinOf } from '../../features/plan/helpers/lookup'
import { ownEntries, ownVid } from '../../features/plan/services/sync'
import { downloadedVids, unauditedVids } from '../../features/roster/driveAlts'
import type { PlanRow } from '../../shared/helpers/ssbu'
import { thumbOf } from '../../shared/helpers/skins'
import { norm, trajeName } from '../../shared/helpers/text'

export interface SkinGridRow {
  vid: string
  name: string
  img: string | null
  chosen: boolean
  other: number | null
  label: string
  detail: string
  tag: string
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

const skinTagOf = (isDownloaded: boolean, isUnaudited: boolean): string => {
  if (!isDownloaded) return ''
  if (isUnaudited) return 'En Drive'

  return 'Descargada'
}

export const useFighterPage = () => {
  const onlyDownloaded = ref(false)
  const swipeZone = ref<HTMLElement | null>(null)
  const topSentinel = ref<HTMLElement | null>(null)

  const desktop = useDesktop()

  const showScrollTop = useOutOfView(topSentinel)

  const pointerSwipe = usePointerSwipe(swipeZone, {
    threshold: 56,
    onSwipeEnd: () => {
      if (isOverlayOpen.value) return
      if (!['left', 'right'].includes(pointerSwipe.direction.value)) return
      if (Math.abs(pointerSwipe.distanceX.value) < 56) return
      if (Math.abs(pointerSwipe.distanceX.value) <= Math.abs(pointerSwipe.distanceY.value) * 1.8) return

      stepFighter(pointerSwipe.direction.value === 'left' ? 1 : -1)
    },
  })

  const fighter = computed(() => {
    tick.value

    return fighterOf(viewRoute().code) || null
  })

  const fighterCode = computed(() => fighter.value?.code || '01')

  const activeSlot = computed(() => {
    tick.value

    return slotOf()
  })

  const candidateVid = computed(() => {
    tick.value

    return skinParam()
  })

  const isOverlayOpen = computed(() => {
    tick.value

    const mobileSheetOpen = !desktop.value && Boolean(candidateVid.value)
    const galleryOpen = typeof window !== 'undefined' && Boolean(window.PSWP)

    return (
      isOpenPerson.value
      || isOpenFighterPick.value
      || route.value.v === 'cambios'
      || mobileSheetOpen
      || galleryOpen
    )
  })

  const allPicks = computed<Skin[]>(() => {
    tick.value

    const currentFighter = fighter.value

    if (!currentFighter) return []

    const unaudited = unauditedVids()

    return currentFighter.picks.filter(
      (skin) => !skin.withdrawn && (skin.audited || unaudited.has(skin.vid)),
    )
  })

  const skinRows = computed<SkinGridRow[]>(() => {
    tick.value

    const code = fighterCode.value
    const slot = activeSlot.value
    const activeCandidate = candidateVid.value
    const currentOwnVid = ownVid(code, slot) as string | null
    const mine = (ownEntries() as PlanRow[]).filter((entry) => entry.code === code)
    const downloaded = downloadedVids()
    const unaudited = unauditedVids()
    const queryWords = norm(S.tc.q || '').split(/\s+/).filter(Boolean)

    const filtered = allPicks.value.filter((skin) => {
      if (onlyDownloaded.value && !downloaded.has(skin.vid)) return false
      if (!queryWords.length) return true

      const haystack = norm(skin.name + ' ' + (skin.author || ''))

      return queryWords.every((word) => haystack.includes(word))
    })

    const ordered = [...filtered].sort((left, right) => {
      const leftDl = downloaded.has(left.vid) ? 1 : 0
      const rightDl = downloaded.has(right.vid) ? 1 : 0

      if (leftDl !== rightDl) return rightDl - leftDl

      return left.name.localeCompare(right.name, 'es')
    })

    return ordered.map((skin) => {
      const isSelected = activeCandidate
        ? activeCandidate === skin.vid
        : currentOwnVid === skin.vid

      const elsewhere = mine.find((entry) => entry.vid === skin.vid && entry.n !== slot) ?? null
      const tag = skinTagOf(downloaded.has(skin.vid), unaudited.has(skin.vid))
      const labelParts = [skin.name]

      if (tag) labelParts.push(tag)
      if (elsewhere) labelParts.push('en ' + trajeName(elsewhere.n))

      return {
        vid: skin.vid,
        name: skin.name,
        img: thumbOf(skin),
        chosen: isSelected,
        other: elsewhere ? elsewhere.n : null,
        label: labelParts.join(', '),
        detail: 'Ampliar imágenes de ' + skin.name,
        tag,
      }
    })
  })

  const onSelectSlot = (slot: number) => {
    selectSlot(slot, true)
  }

  const onPickSkin = (vid: string) => {
    if (candidateVid.value === vid) {
      setSkin('')

      return
    }

    setSkin(vid)
  }

  const onDetailSkin = (vid: string) => {
    const target = skinOf(vid)

    if (target) zoomSkin(target, 0)
  }

  const onToggleDownloaded = () => {
    onlyDownloaded.value = !onlyDownloaded.value
  }

  const onCloseSkinSheet = () => {
    setSkin('')
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onKeyStroke(['ArrowLeft', 'ArrowRight', '/'], (event) => {
    if (isOverlayOpen.value || isEditableTarget(event.target)) return

    if (event.key === '/') {
      event.preventDefault()
      openFighterPick()

      return
    }

    event.preventDefault()
    stepFighter(event.key === 'ArrowRight' ? 1 : -1)
  })

  return {
    desktop,
    fighter,
    fighterCode,
    activeSlot,
    candidateVid,
    onlyDownloaded,
    allPicks,
    skinRows,
    swipeZone,
    topSentinel,
    showScrollTop,
    onSelectSlot,
    onPickSkin,
    onDetailSkin,
    onToggleDownloaded,
    onCloseSkinSheet,
    scrollToTop,
  }
}
