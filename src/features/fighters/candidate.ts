import { ref } from 'vue'
import type { Skin } from '../../boot'

/** Candidata de esta visita. No se guarda. No sobrevive al salir del luchador. */
export const candidate = ref<Skin | null>(null)
export const candidateCode = ref('')
export const candidateSlot = ref(0)
export const candidateRoams = ref(false)

let handoff: { code: string, slot: number, vid: string } | null = null

export const setCandidate = (code: string, slot: number, skin: Skin, roams = false) => {
  candidateCode.value = code
  candidateSlot.value = slot
  candidate.value = skin
  candidateRoams.value = roams
}

export const clearCandidate = () => {
  candidate.value = null
  candidateCode.value = ''
  candidateRoams.value = false
}

/** La candidata que viene del catálogo sigue al traje que se toca. */
export const followCandidate = (code: string, slot: number) => {
  if (!candidate.value || !candidateRoams.value || candidateCode.value !== code) return false

  candidateSlot.value = slot

  return true
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
