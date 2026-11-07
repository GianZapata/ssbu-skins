import { NavigationDirection } from '../enums/NavigationDirection'

interface ViewTransitionHandle {
  finished: Promise<void>
}

interface ViewTransitionInput {
  update: () => void | Promise<void>
  types?: string[]
}

interface ViewTransitionDocument {
  startViewTransition?: (arg: ViewTransitionInput | (() => void | Promise<void>)) => ViewTransitionHandle
}

const focusHeading = () => {
  const heading = document.getElementById('ttl')

  heading?.focus({ preventScroll: true })
}

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const runDirectionalTransition = (
  direction: NavigationDirection,
  update: () => void | Promise<void>,
  onFinished?: () => void,
) => {
  const doc = (typeof document !== 'undefined' ? document : null) as ViewTransitionDocument | null

  if (!doc?.startViewTransition || prefersReducedMotion()) {
    update()
    requestAnimationFrame(() => {
      focusHeading()
      onFinished?.()
    })

    return
  }

  let transition: ViewTransitionHandle

  try {
    transition = doc.startViewTransition({
      update,
      types: [direction],
    })
  } catch {
    transition = doc.startViewTransition(update)
  }

  void transition.finished.finally(() => {
    focusHeading()
    onFinished?.()
  })
}
