import { computed, onMounted, watch } from 'vue'
import { back, go, portraitOf, route, showBack, start, tick, titleOf } from '../../composables/useApp'
import { hdrHidden, resetReveal, startReveal } from '../../composables/useReveal'
import { activePerson, closePersonSheet, isOpenPerson, openPersonSheet } from '../../features/plan/composables/usePerson'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../../features/plan/composables/usePlan'
import { useSaveStatus } from '../../features/plan/saveStatus'

export const useAppShell = () => {
  const { problem } = useSaveStatus()

  const title = computed(() => {
    tick.value

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

  const chosen = computed(() => {
    tick.value

    return countChosen()
  })

  const personMenuLabel = computed(() => {
    const person = activePerson.value

    if (person) return 'Cambiar persona (' + person + ')'

    return 'Elegir persona'
  })

  const runNotice = () => {
    const current = notice.value

    if (!current) return

    notice.value = null
    if (current.fn) current.fn()
  }

  watch(
    () => route.value.v + ':' + route.value.code,
    () => resetReveal(),
  )

  onMounted(() => {
    start()
    startReveal()
    bootPlan()
  })

  return {
    hdrHidden,
    problem,
    notice,
    title,
    portrait,
    canBack,
    chosen,
    personMenuLabel,
    isOpenPerson,
    back,
    go,
    retrySync,
    dismissNotice,
    openPersonSheet,
    closePersonSheet,
    runNotice,
  }
}
