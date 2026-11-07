const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const shown = (element: HTMLElement) => element.getClientRects().length > 0

/** Tab y Mayús+Tab recorren solo el interior de una hoja, sin escapar al resto de la página. */
export const useFocusLoop = () => {
  const loop = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const root = event.currentTarget as HTMLElement
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(shown)

    if (!items.length) return

    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement

    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !root.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }

  return { loop }
}
