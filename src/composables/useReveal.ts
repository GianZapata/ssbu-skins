import { ref } from 'vue'

/**
 * La cabecera se oculta al bajar y reaparece al subir (solo en móvil). La tira de trajes
 * se queda fija arriba. En escritorio la cabecera no se mueve.
 */
export const hdrHidden = ref(false)

let started = false
let last = 0

export const startReveal = () => {
  if (started || typeof window === 'undefined') return
  started = true
  last = window.scrollY
  window.addEventListener('scroll', () => {
    const y = Math.max(0, window.scrollY)
    const delta = y - last
    if (y < 8) hdrHidden.value = false
    else if (delta > 6 && y > 56) hdrHidden.value = true
    else if (delta < -6) hdrHidden.value = false
    if (Math.abs(delta) > 6 || y < 8) last = y
  }, { passive: true })
}

export const resetReveal = () => { hdrHidden.value = false }
