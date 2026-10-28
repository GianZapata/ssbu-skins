import { computed, ref } from 'vue'
import { tick } from '../../composables/useApp'
import { state, syncInfo } from './services/sync'

export const savedUntil = ref(0)

let timer = 0

export const markSaved = () => {
  savedUntil.value = Date.now() + 4000
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    savedUntil.value = 0
  }, 4000)
}

const pendingCount = () => (state.PEND as unknown[]).length

export const useSaveStatus = () => {
  const saving = computed(() => {
    tick.value

    return (syncInfo() as [string, string])[0] === 'saving'
  })

  const saved = computed(() => {
    tick.value

    return savedUntil.value > Date.now() && !saving.value
  })

  const local = computed(() => {
    tick.value

    return !state.FBCFG || state.dbState === 'local'
  })

  const problem = computed(() => {
    tick.value

    const count = pendingCount()

    if (state.syncKind === 'service') return 'No se pudieron guardar los cambios'

    if (state.syncKind !== 'offline') return ''

    if (count === 0) return 'Sin conexión'

    if (count === 1) return 'Sin conexión · 1 cambio pendiente'

    return 'Sin conexión · ' + count + ' cambios pendientes'
  })

  return { saving, saved, local, problem }
}
