import { fighterOf } from '../../../composables/useApp'
import { planEntries, state } from '../services/sync'
import { SSBU, type PlanRow } from '../../../shared/helpers/ssbu'
import { curOf, skinOf } from './lookup'

export const buildExport = () => {
  const rows = planEntries() as PlanRow[]
  const meta = (state.INV && state.INV.meta) || {}
  const profile = (meta.profile || {}) as { name?: string }
  return {
    schema: 3,
    generated_at: new Date().toISOString(),
    catalog: globalThis.META.generated || null,
    inventory: {
      version: meta.version,
      profile: meta.profile,
      verification: meta.verification,
      scanned_at: meta.scanned_at,
      sources: meta.sources,
    },
    target: { game: 'Super Smash Bros. Ultimate', version: '13.0.5', loader: 'ARCropolis 4.1.1' },
    changes: rows.map((row) => {
      const fighter = fighterOf(row.code)
      const current = curOf(row.code, row.n) || { kind: 'unknown', name: 'Sin identificar', img: null }
      const skin = skinOf(row.vid)
      const status = (state.STATUS as Record<string, { status?: string, result?: string | null }>)[row.vid] || {}
      return {
        fighter: fighter ? fighter.name : row.code,
        roster_no: row.code,
        traje: row.n + 1,
        slot: 'c0' + row.n,
        current: { kind: current.kind, name: current.name, source: current.src || null, confirmed: false },
        user_destination: { traje: row.n + 1, slot: 'c0' + row.n, priority: 'el destino elegido manda sobre dest_hint' },
        replaces: { kind: current.kind, name: current.name, vid: current.vid || null },
        relocation: skin && skin.native && skin.native.length
          ? { native_slots: skin.native.map((n) => 'c0' + n), needs_move: !skin.native.includes(row.n), checked: false }
          : null,
        proposal: skin ? {
          vid: skin.vid,
          role: SSBU.isAlt(skin) ? 'alternativa' : 'recomendada',
          variant: skin.variant || null,
          mod_id: skin.id,
          name: skin.name,
          author: skin.author,
          url: skin.url,
          online: SSBU.onlineOf(skin)[1],
          conditions: skin.conditions || null,
          dependencies: skin.deps || null,
          conflicts: skin.conflicts || null,
          native_slots: skin.slots_orig || null,
          dest_hint: skin.dest || null,
          pack: skin.pack,
          withdrawn: !!skin.withdrawn,
        } : null,
        missing_in_catalog: !skin,
        vid: row.vid,
        status: status.status || 'wanted',
        result: status.result || null,
      }
    }),
    history: (state.HIST as Array<{ t?: number, code: string, slot: number, from: string | null, to: string | null, kind: string }>).slice(0, 50).map((row) => ({
      at: row.t ? new Date(row.t).toISOString() : null,
      roster_no: row.code,
      traje: row.slot + 1,
      from: row.from,
      to: row.to,
      kind: row.kind,
    })),
    profile,
  }
}
