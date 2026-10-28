import { computed, ref } from 'vue'
import { tick } from '../../composables/useApp'
import { state, syncInfo } from './services/sync'

export const savedUntil = ref(0)

const onDevice = ref(false)

let timer = 0

export const markSaved = (device = false) => {
  onDevice.value = device
  savedUntil.value = Date.now() + 4000
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    savedUntil.value = 0
  }, 4000)
}

const pendingCount = () => (state.PEND as unknown[]).length

const fresh = () => savedUntil.value > Date.now() && (syncInfo() as [string, string])[0] !== 'saving'

export const useSaveStatus = () => {
  const saving = computed(() => {
    tick.value

    return (syncInfo() as [string, string])[0] === 'saving'
  })

  const saved = computed(() => {
    tick.value

    return fresh() && !onDevice.value
  })

  const savedHere = computed(() => {
    tick.value

    return fresh() && onDevice.value
  })

  const problem = computed(() => {
    tick.value

    const count = pendingCount()

    if (state.syncKind === 'service') return 'No se pudo guardar la elección'

    if (state.syncKind !== 'offline') return ''

    if (count === 0) return 'Sin conexión'

    if (count === 1) return 'Sin conexión · 1 elección pendiente'

    return 'Sin conexión · ' + count + ' elecciones pendientes'
  })

  return { saving, saved, savedHere, problem }
}
