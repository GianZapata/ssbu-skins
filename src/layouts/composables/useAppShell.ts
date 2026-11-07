import { computed, onMounted, ref, watch } from 'vue'
import { back, fighterOf, go, onFighter, portraitOf, showBack, start, stepFighter, tick, titleOf, viewRoute } from '../../composables/useApp'
import { useFighterPick } from '../../features/explore/composables/useFighterPick'
import { activePerson, closePersonSheet, isOpenPerson, openPersonSheet } from '../../features/plan/composables/usePerson'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../../features/plan/composables/usePlan'
import { useSaveStatus } from '../../features/plan/saveStatus'

export const useAppShell = () => {
  const countPulse = ref(false)

  const { problem } = useSaveStatus()
  const { isOpenFighterPick, openFighterPick, closeFighterPick } = useFighterPick()

  const title = computed(() => {
    tick.value

    if (onFighter() && !showBack()) return fighterOf(viewRoute().code)?.name ?? titleOf()

    return titleOf()
  })

  const portrait = computed(() => {
    tick.value

    return portraitOf()
  })

  const canBack = computed(() => {
    tick.value

    return showBack()
  })

  const isFighterHeader = computed(() => {
    tick.value

    return onFighter() && !showBack()
  })

  const chosen = computed(() => {
    tick.value

    return countChosen()
  })

  const personMenuLabel = computed(() => {
    const person = activePerson.value

    if (person) return 'Cambiar persona (' + person + ')'

    return 'Elegir persona'
  })

  const prevFighter = () => {
    stepFighter(-1)
  }

  const nextFighter = () => {
    stepFighter(1)
  }

  const closePicker = () => {
    closeFighterPick()
  }

  const runNotice = () => {
    const current = notice.value

    if (!current) return

    notice.value = null
    if (current.fn) current.fn()
  }

  watch(chosen, (next, prev) => {
    if (next === prev) return

    countPulse.value = true
    window.setTimeout(() => {
      countPulse.value = false
    }, 260)
  })

  onMounted(() => {
    start()
    bootPlan()
  })

  return {
    problem,
    notice,
    title,
    portrait,
    canBack,
    isFighterHeader,
    chosen,
    countPulse,
    personMenuLabel,
    isOpenPerson,
    isOpenFighterPick,
    back,
    go,
    prevFighter,
    nextFighter,
    openFighterPick,
    closePicker,
    retrySync,
    dismissNotice,
    openPersonSheet,
    closePersonSheet,
    runNotice,
  }
}
