import { computed, onMounted, ref } from 'vue'
import type { Fighter } from '../../boot'
import { tick } from '../../composables/useApp'
import { clearAt, planGroups, proposeAt } from '../plan/composables/usePlan'
import { planVid, state } from '../plan/services/sync'
import { isSha, portraitUrl } from './portrait'

export interface DriveAlt {
  code: string
  mod_id: string
  name: string
  slots: number[]
  any: boolean
  vid: string | null
}

export interface BoardPick {
  code: string
  vid: string
  name: string
}

interface SlotRecord {
  name?: string
  img?: string
  portrait?: string
  skin?: boolean
}

const alts = ref<DriveAlt[]>([])

const portraits = ref<Record<string, Record<string, string>>>({})

const loadJson = async <T>(url: string, empty: T): Promise<T> => {
  try {
    const response = await fetch(url)

    if (!response.ok) return empty

    return await response.json() as T
  } catch {
    return empty
  }
}

const slotRecord = (code: string, n: number): SlotRecord | null => {
  const inventory = state.INV as { fighters?: Record<string, { slots?: Record<string, SlotRecord> }> } | null

  return inventory?.fighters?.[code]?.slots?.[String(n)] || null
}

export const useBoard = () => {
  const pick = ref<BoardPick | null>(null)

  const query = ref('')

  onMounted(async () => {
    alts.value = await loadJson<DriveAlt[]>('/drive-alts.json', [])
    portraits.value = await loadJson('/sd-portraits.json', {})
  })

  const fighters = computed(() => {
    tick.value

    const needle = query.value.trim().toLowerCase()

    return (state.F as Fighter[]).filter((fighter) => {
      if (fighter.mii) return false
      if (!needle) return true

      return fighter.name.toLowerCase().includes(needle)
    })
  })

  const costumeName = (code: string, n: number) => slotRecord(code, n)?.name || 'Original'

  const costumeImage = (fighter: Fighter, n: number) => {
    const record = slotRecord(fighter.code, n)
    const sha = portraits.value[fighter.code]?.[String(n)] || record?.portrait

    if (isSha(sha)) return portraitUrl(sha)

    if (record?.img) return record.img

    const costumes = (fighter as Fighter & { costumes?: Array<string | null> }).costumes

    return costumes?.[n] || ''
  }

  const alternatives = (code: string) => {
    const installed = new Set(
      Array.from({ length: 8 }, (_, n) => {
        const record = slotRecord(code, n) as (SlotRecord & { vid?: string }) | null

        return record?.vid || ''
      }).filter(Boolean),
    )

    return alts.value.filter((item) => item.code === code && !(item.vid && installed.has(item.vid)))
  }

  const changes = computed(() => {
    tick.value

    return planGroups()
  })

  const toggle = (fighter: Fighter, alt: DriveAlt) => {
    if (!alt.vid) return

    const same = pick.value && pick.value.code === fighter.code && pick.value.vid === alt.vid

    pick.value = same ? null : { code: fighter.code, vid: alt.vid, name: alt.name }
  }

  const choose = (code: string, n: number) => {
    const current = pick.value

    if (!current || current.code !== code) return
    if (!proposeAt(code, n, current.vid)) return

    pick.value = null
  }

  const discard = (code: string, n: number) => {
    clearAt(code, n)
  }

  const chosenVid = (code: string, n: number) => {
    tick.value

    return planVid(code, n) as string | null
  }

  return { pick, query, fighters, changes, costumeName, costumeImage, alternatives, toggle, choose, discard, chosenVid }
}
