import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Escritorio a partir de 1024 px (el mismo corte que usa app.css). */
export const useDesktop = () => {
  const desktop = ref(typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  let query: MediaQueryList | null = null
  const sync = () => { desktop.value = !!query && query.matches }
  onMounted(() => {
    query = window.matchMedia('(min-width: 1024px)')
    sync()
    query.addEventListener('change', sync)
  })
  onBeforeUnmount(() => query?.removeEventListener('change', sync))
  return desktop
}
