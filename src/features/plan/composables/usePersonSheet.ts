import { useDesktop } from '../../../composables/useDesktop'
import type { PersonName } from '../enums/PersonName'
import { choosePerson, usePerson } from './usePerson'

interface UsePersonSheetEmits {
  (event: 'close'): void
}

export const usePersonSheet = (emit: UsePersonSheetEmits) => {
  const desktop = useDesktop()
  const { people, activePerson } = usePerson()

  const selectPerson = (person: PersonName) => {
    choosePerson(person)
  }

  const onDialogUpdate = (nextOpen: boolean) => {
    if (!nextOpen) emit('close')
  }

  return {
    desktop,
    people,
    activePerson,
    selectPerson,
    onDialogUpdate,
  }
}
