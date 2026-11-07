import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** Verdadero cuando el elemento ya quedó por encima de la parte visible de la página. */
export const useOutOfView = (target: Ref<HTMLElement | null>) => {
  const out = ref(false)

  let observer: IntersectionObserver | null = null

  const observe = (element: HTMLElement | null) => {
    observer?.disconnect()
    out.value = false

    if (!element || typeof IntersectionObserver === 'undefined') return

    observer = new IntersectionObserver(([entry]) => {
      out.value = !entry.isIntersecting && entry.boundingClientRect.bottom < 0
    })

    observer.observe(element)
  }

  watch(target, observe, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => observer?.disconnect())

  return out
}
