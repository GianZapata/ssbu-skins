import { computed, ref } from 'vue'
import type { Fighter } from '../../boot'
import { tick } from '../../composables/useApp'
import { curOf } from '../../features/plan/helpers/lookup'
import { state } from '../../features/plan/services/sync'
import { trajeName, norm } from '../../shared/helpers/text'

export const installedQuery = ref('')

interface InstalledRow {
  key: string
  title: string
  sub: string
  img: string | null
  href: string
  label: string
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

const rowOf = (fighter: Fighter, slot: number, words: string[]): InstalledRow | null => {
  const current = curOf(fighter.code, slot)

  if (!current) return null
  if (current.kind !== 'mod' && current.kind !== 'pending' && current.kind !== 'unknown') return null

  const where = fighter.name + ', ' + trajeName(slot)

  if (!words.every((word) => norm(where + ' ' + current.name).includes(word))) return null

  const named = current.kind === 'mod'

  return {
    key: fighter.code + '_' + slot,
    title: named ? current.name : where,
    sub: named ? where : current.name,
    img: current.img,
    href: '#/luchador/' + encodeURIComponent(fighter.code) + '/' + (slot + 1),
    label: where + ', ' + current.name,
  }
}

export const useInstalledPage = () => {
  const loading = computed(() => {
    tick.value

    return (state.F as Fighter[]).length === 0
  })

  const rows = computed(() => {
    tick.value

    const words = wordsOf(installedQuery.value)
    const fighters = (state.F as Fighter[]).filter((fighter) => !fighter.mii)

    return fighters.flatMap((fighter) => {
      const slots = [0, 1, 2, 3, 4, 5, 6, 7]

      return slots.map((slot) => rowOf(fighter, slot, words)).filter((row): row is InstalledRow => row !== null)
    })
  })

  return { loading, rows }
}
