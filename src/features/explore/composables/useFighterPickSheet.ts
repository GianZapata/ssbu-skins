import { computed, ref } from 'vue'
import { norm } from '../../../shared/helpers/text'

export interface PickerFighter {
  code: string
  name: string
  portrait: string | null
  count: number
}

interface FighterPickSheetProps {
  rows: PickerFighter[]
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

export const useFighterPickSheet = (props: FighterPickSheetProps) => {
  const query = ref('')

  const rows = computed(() => {
    const words = wordsOf(query.value)

    return props.rows.filter((row) => words.every((word) => norm(row.name).includes(word)))
  })

  return { query, rows }
}
