import type { Skin } from '../../../boot'
import { planEntries, state } from '../services/sync'
import { SSBU, type InstallDecision, type PlanRow } from '../../../shared/helpers/ssbu'

export interface SlotPlanRow extends InstallDecision {
  slot: number
}

export const curOf = (code: string, slot: number) => SSBU.curOf(code, slot, {
  byCode: state.byCode,
  INV: state.INV,
  idx: state.idx,
})

export const skinOf = (vid: string | null | undefined) => {
  const entry = vid ? (state.idx as Record<string, { p: Skin }>)[vid] : undefined
  return entry ? entry.p : null
}

export const changesOf = (code: string) => (planEntries() as PlanRow[]).filter((row) => row.code === code)

export const slotPlanOf = (code: string, slot: number) => {
  const rows = (state.SLOT_PLAN as Record<string, { slots?: SlotPlanRow[] }>)[code]
  const found = rows && rows.slots ? rows.slots.find((row) => row.slot === slot) : undefined

  return found || null
}
