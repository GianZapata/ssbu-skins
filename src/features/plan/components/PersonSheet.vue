<script setup lang="ts">
import { QBtn, QDialog } from 'quasar'
import { useFocusLoop } from '../../../composables/useFocusLoop'
import { usePersonSheet } from '../composables/usePersonSheet'

interface PersonSheetProps {
  isOpen: boolean
}

interface PersonSheetEmits {
  close: []
}

const props = defineProps<PersonSheetProps>()
const emit = defineEmits<PersonSheetEmits>()

const { desktop, grid, people, activePerson, selectPerson, onDialogUpdate, focusInitial } = usePersonSheet(emit)
const { loop } = useFocusLoop()
</script>

<template>
  <q-dialog
    :model-value="props.isOpen"
    :position="desktop ? 'standard' : 'bottom'"
    :full-width="!desktop"
    :transition-show="desktop ? 'scale' : 'slide-up'"
    :transition-hide="desktop ? 'scale' : 'slide-down'"
    :transition-duration="desktop ? 220 : 280"
    no-refocus
    aria-labelledby="person-sheet-title"
    class="sheet-dialog"
    @show="focusInitial"
    @update:model-value="onDialogUpdate"
  >
    <div class="sheet sheet--person" @keydown="loop">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head">
        <h2 id="person-sheet-title" class="sheet__h">¿Quién propone?</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>
      <div class="sheet__scroll">
        <p class="person-note">El nombre se elige entre amigos; no pide contraseña.</p>
        <div ref="grid" class="person-grid">
          <button
            v-for="person in people"
            :key="person"
            type="button"
            class="person-btn"
            :class="{ 'person-btn--on': activePerson === person }"
            :aria-pressed="activePerson === person"
            :data-person="person"
            @click="selectPerson(person)"
          >
            {{ person }}
          </button>
        </div>
      </div>
    </div>
  </q-dialog>
</template>
