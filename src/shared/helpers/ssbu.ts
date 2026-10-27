import './domain'
import type { Fighter, Skin } from '../../boot'

export interface CatState {
  q: string
  f: string
  rec: boolean
  autor_explicito: boolean
  autor_condicionado: boolean
  tercero: boolean
  sin_evidencia: boolean
  incompatible: boolean
  unaudited: boolean
  avail: boolean
}

export interface PlanRow {
  code: string
  n: number
  vid: string
}

export interface Current {
  kind: string
  name: string
  img: string | null
  badge?: string
  verif?: string
  replace?: string
  staged?: { name?: string } | null
  url?: string
  author?: string | null
  version?: string | null
  src?: string
  vid?: string | null
}

interface Op {
  code: string
  slot: number
  to: string | null
  exp: string | null
  kind: string
}

export interface Domain {
  keyOf: (code: string, slot: number) => string
  validSlot: (slot: number) => boolean
  emptyCat: () => CatState
  migrateCat: (saved: unknown) => CatState
  assignBlock: (entries: PlanRow[], code: string, slot: number, vid: string) => { kind: string, other?: number }
  setOp: (code: string, slot: number, vid: string, prev: string | null) => Op | null
  clearOp: (code: string, slot: number, prev: string | null) => Op | null
  curOf: (code: string, slot: number, ctx: unknown) => Current | null
  catList: (rows: unknown[], ctx: { code: string } | null, st: CatState) => Array<{ f: Fighter, p: Skin }>
  isAlt: (skin: Skin) => boolean
  onlineOf: (skin: Skin) => [string, string]
  FILTER_KEYS: string[]
  initials: (name: string) => string
}

const host = globalThis as typeof globalThis & { SSBU: Domain }
export const SSBU = host.SSBU
