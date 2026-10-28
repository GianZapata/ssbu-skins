import { computed, nextTick, ref } from 'vue'
import { GridDensity } from '../enums/GridDensity'

const KEY = 'ssbu_grid'

const stored = (): GridDensity => {
  try {
    if (localStorage.getItem(KEY) === GridDensity.Ampliada) return GridDensity.Ampliada
  } catch (e) { /* sin almacenamiento */ }

  return GridDensity.Compacta
}

export const gridDensity = ref<GridDensity>(stored())

const write = (value: GridDensity) => {
  gridDensity.value = value

  try { localStorage.setItem(KEY, value) } catch (e) { /* sin almacenamiento */ }
}

export const useGridDensity = () => {
  const compact = computed(() => gridDensity.value === GridDensity.Compacta)

  const toggle = () => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-keep]')]
    const seen = cards.find((card) => card.getBoundingClientRect().bottom > 80) || null
    const key = seen?.dataset.keep || ''
    const offset = seen ? seen.getBoundingClientRect().top : 0

    write(compact.value ? GridDensity.Ampliada : GridDensity.Compacta)

    if (!key) return

    const place = () => {
      const again = document.querySelector<HTMLElement>('[data-keep="' + CSS.escape(key) + '"]')

      if (!again) return

      const delta = again.getBoundingClientRect().top - offset

      if (Math.abs(delta) > 1) window.scrollBy(0, delta)
    }

    nextTick(() => {
      place()
      requestAnimationFrame(() => requestAnimationFrame(place))
    })
  }

  return { compact, toggle }
}
