import { ref, watch } from 'vue'
import { closedOverlay, ovDone, ovPush } from '../../../composables/useApp'

const focusOpener = () => {
  document.querySelector<HTMLElement>('[data-fighter-pick]')?.focus()
}

export const useFighterPick = () => {
  const open = ref(false)

  const show = () => {
    if (open.value) return

    open.value = true
    ovPush('fighters')
  }

  const hide = (then?: () => void) => {
    if (!open.value) {
      if (then) then()

      return
    }

    open.value = false

    if (ovDone('fighters', then)) return

    if (then) then()

    focusOpener()
  }

  watch(closedOverlay, (id) => {
    if (id !== 'fighters' || !open.value) return

    closedOverlay.value = ''
    open.value = false
    focusOpener()
  })

  return { open, show, hide }
}
