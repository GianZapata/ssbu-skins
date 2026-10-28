import type { Skin } from '../../boot'
import type { Current } from './ssbu'

/** Miniatura de una skin: la primera de srcset si existe, si no la imagen principal. */
export const thumbOf = (skin: Skin | null | undefined) => {
  if (!skin) return null
  if (skin.srcset) {
    const part = skin.srcset.split(',')[0].trim().split(/\s+/)[0]
    if (part) return part
  }
  return skin.img || null
}

/** Portada para tarjetas y comparación: la de 530 px, no la miniatura de 220. */
export const coverOf = (skin: Skin | null | undefined) => {
  if (!skin) return null
  return skin.img || thumbOf(skin)
}

/** Nombre visible de lo que hay instalado: solo si es el original o tiene nombre. */
export const currentName = (current: Current | null) => {
  if (!current) return ''
  if (current.kind === 'original') return 'Original'
  if (current.kind === 'mod' || current.kind === 'pending' || current.kind === 'unknown') return current.name
  return ''
}
