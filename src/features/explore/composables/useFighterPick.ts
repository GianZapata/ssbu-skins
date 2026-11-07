import { ref, watch } from 'vue'
import { closedOverlay, ovDone, ovPush } from '../../../composables/useApp'

export const isOpenFighterPick = ref(false)

const focusOpener = () => {
  document.querySelector<HTMLElement>('[data-fighter-pick]')?.focus()
}

export const openFighterPick = () => {
  if (isOpenFighterPick.value) return

  isOpenFighterPick.value = true
  ovPush('fighters')
}

export const closeFighterPick = (then?: () => void) => {
  if (!isOpenFighterPick.value) {
    if (then) then()

    return
  }

  isOpenFighterPick.value = false

  if (ovDone('fighters', then)) return

  if (then) then()

  focusOpener()
}

let bound = false

export const useFighterPick = () => {
  if (!bound) {
    bound = true
    watch(closedOverlay, (id) => {
      if (id !== 'fighters' || !isOpenFighterPick.value) return

      closedOverlay.value = ''
      isOpenFighterPick.value = false
      focusOpener()
    })
  }

  return {
    isOpenFighterPick,
    openFighterPick,
    closeFighterPick,
  }
}
