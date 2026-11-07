import { ref } from 'vue'
import { useDesktop } from '../../../composables/useDesktop'
import type { PersonName } from '../enums/PersonName'
import { choosePerson, usePerson } from './usePerson'

interface UsePersonSheetEmits {
  (event: 'close'): void
}

export const usePersonSheet = (emit: UsePersonSheetEmits) => {
  const grid = ref<HTMLElement | null>(null)

  const desktop = useDesktop()
  const { people, activePerson } = usePerson()

  const selectPerson = (person: PersonName) => {
    choosePerson(person)
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) emit('close')
  }

  const focusInitial = () => {
    const target =
      grid.value?.querySelector<HTMLElement>('.person-btn--on') ??
      grid.value?.querySelector<HTMLElement>('.person-btn')

    target?.focus()
  }

  return {
    desktop,
    grid,
    people,
    activePerson,
    selectPerson,
    onOpenChange,
    focusInitial,
  }
}
