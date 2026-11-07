<script setup lang="ts">
import { QBtn, QDialog } from 'quasar'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'

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

const { desktop, grid, people, activePerson, selectPerson, onOpenChange, focusInitial } = usePersonSheet(emit)
const { loop } = useFocusLoop()
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="props.isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    no-refocus
    aria-labelledby="person-sheet-title"
    class="sheet-dialog"
    @show="focusInitial"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--person" @keydown="loop">
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

  <DrawerRoot v-else :open="props.isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay vaul-overlay--top" />
      <DrawerContent
        class="vaul-sheet vaul-sheet--top sheet sheet--person"
        @open-auto-focus.prevent="focusInitial"
        @close-auto-focus.prevent
      >
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle id="person-sheet-title" class="sheet__h">¿Quién propone?</DrawerTitle>
          <DrawerClose as-child>
            <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" />
          </DrawerClose>
        </div>
        <div class="sheet__scroll">
          <DrawerDescription class="person-note">El nombre se elige entre amigos; no pide contraseña.</DrawerDescription>
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
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
