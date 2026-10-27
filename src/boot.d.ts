export interface Skin {
  vid: string
  name: string
  author: string
  role: string
  audited: boolean
  wifi_status: string
  withdrawn: boolean
  mii: boolean
  img?: string | null
  srcset?: string
  g?: string[]
  native?: number[]
  legacy?: string
  variant?: string | null
  pack?: { with: string[] } | null
  conditions?: string | null
  deps?: string | null
  conflicts?: string | null
  url?: string
  id?: string
  slots_orig?: string | null
  dest?: string | null
  design?: string | null
  compat?: string | null
  console_test?: string | null
  file_note?: string | null
  notes?: string | null
  wifi_quote?: string | null
  wifi_source?: string | null
  wifi_source_url?: string | null
  dl?: number | null
  rank?: number | null
  dlshared?: boolean
  downloads_scope?: string
  images_scope?: string
  audit_scope?: string
  depkind?: string | null
}

export interface Fighter {
  code: string
  name: string
  portrait?: string | null
  mii?: boolean
  picks: Skin[]
  original_ref?: { costume?: string, verified?: boolean, source?: string, source_page?: string, scope?: string }
}

export interface BootMeta {
  generated?: string
  base: string
  inventory: { meta?: Record<string, unknown>, fighters?: Record<string, { slots?: Record<string, Record<string, unknown>> }> } | null
  firebase: Record<string, string> | null
  embed?: boolean
}

declare global {
  var F_EMBED: Fighter[]
  var META: BootMeta
  interface Window {
    PSWP: any
    __ssbuDiag: () => {
      state: string
      syncKind: string | null
      pend: number
      lastOk: string | null
      online: boolean
      project: string | null
      errors: Array<{ t: number, where: string, kind: string, code: string, msg: string }>
    }
  }
}

export {}
