import './domain'
import type { Fighter, Skin } from '../../boot'
import type { InstallFaceKind } from '../enums/InstallFaceKind'

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

export interface StageChoice {
  kind: 'use' | 'replace' | 'clear' | 'goto' | 'none'
  label: string
  line: string
  other: number | null
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

export interface InstallDecision {
  estado?: string
  state?: string
  name?: string
  vid?: string
  mod_id?: number
}

export interface InstallOrder {
  name: string
  vid: string | null
  mod_id: number | null
}

export interface InstallFace {
  kind: InstallFaceKind
  img: string | null
  install: InstallOrder | null
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
  stageChoice: (input: {
    slot: number
    vid: string | null
    saved: string | null
    elsewhere: number | null
    withdrawn: boolean
    mii: boolean
    incompatible: boolean
  }) => StageChoice
  seriesOf: (code: string) => string
  seriesLabel: (id: string) => string
  isAlt: (skin: Skin) => boolean
  onlineOf: (skin: Skin) => [string, string]
  FILTER_KEYS: string[]
  initials: (name: string) => string
  installFace: (ready: boolean, slot: InstallDecision | null, current: Current | null) => InstallFace
}

const host = globalThis as typeof globalThis & { SSBU: Domain }
export const SSBU = host.SSBU
