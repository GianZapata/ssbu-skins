import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { fighterOf, hasSlot, selectSlot, setSkin, skinParam, S, tick, viewRoute } from '../../composables/useApp'
import { commitStage } from '../../features/fighters/stage'
import { clearAt, touched, zoomSkin } from '../../features/plan/composables/usePlan'
import { curOf, isUnsent, skinOf, slotPlanOf } from '../../features/plan/helpers/lookup'
import { keyOf, planEntries, planVid, state } from '../../features/plan/services/sync'
import { PreviewSource } from '../../features/fighters/enums/PreviewSource'
import { PulseKind } from '../../features/fighters/enums/PulseKind'
import { downloadedVids, loadDriveAlts, unauditedVids } from '../../features/roster/driveAlts'
import { ProposalState } from '../../features/roster/enums/ProposalState'
import { RosterHelper } from '../../features/roster/helpers/roster.helper'
import { InstallFaceKind } from '../../shared/enums/InstallFaceKind'
import { SSBU, type PlanRow, type StageChoice } from '../../shared/helpers/ssbu'
import { coverOf, currentName } from '../../shared/helpers/skins'
import { trajeName } from '../../shared/helpers/text'
import type { CostumeLayer } from '../../shared/enums/CostumeLayer'

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

interface CellCurrent {
  name: string
  img: string | null
  original: boolean
}

interface CellNext {
  name: string
  img: string | null
  vid: string
}

export interface Cell {
  n: number
  sel: boolean
  vid: string | null
  label: string
  quitar: string
  layer: CostumeLayer
  layerLabel: string
  proposal: ProposalState
  proposalLabel: string
  current: CellCurrent
  next: CellNext | null
}

export interface StagePreview {
  name: string
  img: string | null
  vid: string
  author: string
  url: string
  source: PreviewSource
}

const gridLabel = (name: string, chosen: boolean, other: number | null) => {
  if (chosen) return name + ', en Nueva'
  if (other !== null) return name + ', ya está en ' + trajeName(other)

  return name
}

const authorOf = (author: string | undefined) => (author && author !== 'pending' ? author : '')

export const useFighterPage = () => {
  // Pulso al elegir (de este dispositivo) y halo cuando alguien cambia un traje en vivo.
  const pulse = reactive<Record<number, PulseKind>>({})

  const onlyDownloaded = ref(false)

  let timers: number[] = []
  let baseline = ''
  let baseCode = ''

  const model = computed(() => {
    tick.value

    const current = viewRoute()
    const code = current.code
    const fighter = fighterOf(code)
    const withSlot = hasSlot()
    const slot = withSlot ? current.n : 0

    if (!fighter) return { fighter: null, code, slot, withSlot, cells: [] as Cell[], rows: [], total: 0 }

    const usable = !fighter.mii

    const cells: Cell[] = SLOTS.map((n) => {
      const cur = curOf(code, n)
      const decision = slotPlanOf(code, n)
      const face = SSBU.installFace(Boolean(state.slotPlanReady), decision, cur)
      const order = face.kind === InstallFaceKind.Install ? face.install : null
      const pick = order ? skinOf(order.vid) : null
      const name = currentName(cur)
      const original = cur?.kind === 'original'
      const vid = usable ? (planVid(code, n) as string | null) : null
      const proposal = RosterHelper.proposalOf(vid, isUnsent(code, n))
      let nextImg: string | null = null

      if (pick) nextImg = coverOf(pick)
      else if (cur) nextImg = cur.img

      const next = order ? { name: order.name, img: nextImg, vid: order.vid || '' } : null
      let shown = 'skin sin nombre'

      if (face.kind === InstallFaceKind.Original) shown = 'original'
      else if (cur) shown = cur.name

      const label = next ? trajeName(n) + ': ' + shown + ' cambia a ' + next.name : trajeName(n) + ': ' + shown

      return {
        n,
        sel: withSlot && n === slot,
        vid,
        label,
        quitar: 'Quitar propuesta, ' + trajeName(n),
        layer: RosterHelper.layerOf(cur),
        layerLabel: RosterHelper.layerLabelOf(cur),
        proposal,
        proposalLabel: RosterHelper.getProposalMeta(proposal).label,
        current: { name, img: cur ? cur.img : null, original },
        next,
      }
    })

    // La cuadrícula solo marca la candidata. El plan no cambia hasta el botón.
    const staged = usable ? skinOf(skinParam()) : null
    const placed = new Map<string, number>()
    const mine = (planEntries() as PlanRow[]).filter((row) => row.code === code)

    mine.forEach((row) => placed.set(row.vid, row.n))

    const inProfile = new Map<string, number>()

    SLOTS.forEach((n) => {
      const cur = curOf(code, n)

      if (cur?.layer === 'profile' && cur.vid) inProfile.set(cur.vid, n)
    })

    const downloaded = downloadedVids()
    const unaudited = unauditedVids()
    const all = usable ? SSBU.catList(state.all, { code }, S.tc) : []

    const rows = all
      .map(({ p }) => {
        const at = placed.has(p.vid) ? (placed.get(p.vid) as number) : null
        const chosen = staged ? p.vid === staged.vid : withSlot && at === slot
        const other = at !== null && at !== slot ? at : null
        const label = gridLabel(p.name, chosen, other)
        const profileAt = inProfile.has(p.vid) ? (inProfile.get(p.vid) as number) : null
        const tags: string[] = []

        if (profileAt !== null) tags.push('En el perfil · ' + trajeName(profileAt))
        else if (downloaded.has(p.vid)) tags.push('Descargada')

        if (unaudited.has(p.vid)) tags.push('Sin auditar')

        return {
          vid: p.vid,
          name: p.name,
          img: coverOf(p),
          chosen,
          other,
          label,
          detail: 'Ampliar imagen de ' + p.name,
          tag: tags.join(' · '),
          downloaded: downloaded.has(p.vid),
        }
      })
      .filter((row) => !onlyDownloaded.value || row.downloaded)

    // Las descargadas primero: es lo que se puede instalar sin buscar el mod.
    const ordered = [...rows.filter((row) => row.downloaded), ...rows.filter((row) => !row.downloaded)]
    const total = usable ? SSBU.catList(state.all, { code }, SSBU.emptyCat()).length : 0

    return { fighter, code, slot, withSlot, cells, rows: ordered, total }
  })

  const stage = computed(() => {
    const m = model.value

    return m.withSlot ? m.cells[m.slot] || null : null
  })

  const candidate = computed(() => {
    tick.value

    return model.value.fighter ? skinOf(skinParam()) : null
  })

  const preview = computed((): StagePreview | null => {
    const skin = candidate.value

    if (skin) return { name: skin.name, img: coverOf(skin), vid: skin.vid, author: authorOf(skin.author), url: skin.url || '', source: PreviewSource.Candidate }

    const current = stage.value
    const saved = current && current.vid ? skinOf(current.vid) : null

    if (saved) return { name: saved.name, img: coverOf(saved), vid: saved.vid, author: authorOf(saved.author), url: saved.url || '', source: PreviewSource.Proposal }

    if (current && current.next) {
      const planned = skinOf(current.next.vid)

      return { name: current.next.name, img: current.next.img, vid: current.next.vid, author: authorOf(planned?.author), url: planned?.url || '', source: PreviewSource.Plan }
    }

    return null
  })

  const choice = computed((): StageChoice => {
    tick.value

    const m = model.value
    const skin = candidate.value
    const saved = stage.value ? stage.value.vid : null
    const placed = skin
      ? (planEntries() as PlanRow[]).find((row) => row.code === m.code && row.vid === skin.vid && row.n !== m.slot)
      : null

    return SSBU.stageChoice({
      slot: m.slot,
      vid: skin ? skin.vid : null,
      saved,
      elsewhere: placed ? placed.n : null,
      withdrawn: !!(skin && skin.withdrawn),
      mii: !!(m.fighter && m.fighter.mii) || !!(skin && skin.mii),
      incompatible: !!(skin && skin.wifi_status === 'incompatible'),
    })
  })

  const placeLabel = computed(() => {
    const name = model.value.fighter ? model.value.fighter.name : ''

    if (!name) return ''

    return name + ' · ' + trajeName(model.value.slot)
  })

  /** Con una skin candidata y sin traje, la página pide el traje. */
  const placing = computed(() => {
    const skin = candidate.value

    if (!skin || model.value.withSlot) return null

    return { name: skin.name, img: coverOf(skin) }
  })

  /** La cuadrícula deja la skin en Nueva. No escribe el plan. */
  const pick = (vid: string) => {
    if (!model.value.fighter || !skinOf(vid)) return

    setSkin(vid)
  }

  const openDetail = (vid: string) => {
    const skin = skinOf(vid)

    if (skin) zoomSkin(skin, 0)
  }

  const openStage = () => {
    const shown = preview.value

    if (shown) openDetail(shown.vid)
  }

  const commit = () => {
    const m = model.value

    commitStage(m.code, m.slot, choice.value, candidate.value)
  }

  const discard = () => {
    setSkin('')
  }

  const clear = (n: number) => clearAt(model.value.code, n)

  const toggleDownloaded = () => {
    onlyDownloaded.value = !onlyDownloaded.value
  }

  const focusSearch = () => {
    const field = document.getElementById('skin-search')

    if (!field) return

    field.focus()
    field.scrollIntoView({ block: 'nearest' })
  }

  watch(
    () => model.value.cells.map((cell) => cell.vid || '').join('|') + '@' + model.value.code,
    (snapshot) => {
      const code = model.value.code
      const was = baseline.split('|')
      const now = model.value.cells.map((cell) => cell.vid || '')
      const same = baseCode === code && baseline !== ''

      baseline = snapshot.split('@')[0]
      baseCode = code

      if (!same) return

      now.forEach((vid, n) => {
        if (vid === (was[n] || '')) return

        const mine = Date.now() - (touched[keyOf(code, n)] || 0) < 3000

        pulse[n] = mine ? PulseKind.Local : PulseKind.Live
        timers.push(window.setTimeout(() => { delete pulse[n] }, mine ? 320 : 640))
      })
    },
    { immediate: true },
  )

  void loadDriveAlts()

  onBeforeUnmount(() => {
    timers.forEach((id) => window.clearTimeout(id))
  })

  return { model, stage, preview, choice, placeLabel, placing, onlyDownloaded, pulse, pick, openDetail, openStage, commit, discard, clear, toggleDownloaded, focusSearch, selectSlot }
}
