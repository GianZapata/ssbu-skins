import { computed, ref } from 'vue'
import { tick } from '../../composables/useApp'
import { addRequest, toggleRequest, type NoteItem } from '../../features/plan/composables/usePlan'
import { state } from '../../features/plan/services/sync'

export const noteDraft = ref('')

export const useNotesPage = () => {
  const notes = computed(() => {
    tick.value
    return (state.NOTES as NoteItem[]) || []
  })

  const add = () => {
    const text = noteDraft.value
    noteDraft.value = ''
    void addRequest(text)
  }

  const toggle = (note: NoteItem) => {
    void toggleRequest(note.id, !note.done)
  }

  return { notes, add, toggle }
}
