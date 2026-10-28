import { ref } from 'vue'
import type { Skin } from '../../boot'

/** Candidata de esta visita. No se guarda y no sobrevive a otro traje ni a Luchadores. */
export const candidate = ref<Skin | null>(null)
export const candidateCode = ref('')
export const candidateSlot = ref(0)

let handoff: { code: string, slot: number, vid: string } | null = null

export const setCandidate = (code: string, slot: number, skin: Skin) => {
  candidateCode.value = code
  candidateSlot.value = slot
  candidate.value = skin
}

export const clearCandidate = () => {
  candidate.value = null
  candidateCode.value = ''
}

export const activeCandidate = (code: string, slot: number) => {
  if (!candidate.value || candidateCode.value !== code || candidateSlot.value !== slot) return null
  return candidate.value
}

/** Instalar desde el catálogo deja la skin en Nueva al abrir el traje. */
export const handoffCandidate = (code: string, slot: number, vid: string) => {
  handoff = { code, slot, vid }
}

export const consumeHandoff = (code: string, slot: number) => {
  if (!handoff || handoff.code !== code || handoff.slot !== slot) return ''
  const vid = handoff.vid
  handoff = null
  return vid
}
