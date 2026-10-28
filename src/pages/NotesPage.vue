<script setup lang="ts">
import { QBtn, QIcon, QInput, QPage } from 'quasar'
import { noteDraft, useNotesPage } from './composables/useNotesPage'

const { notes, add, toggle } = useNotesPage()
</script>

<template>
  <q-page class="page list-page">
    <h1 class="sr-only">Notas</h1>
    <form class="note-form" @submit.prevent="add">
      <q-input
        v-model="noteDraft"
        class="search"
        outlined
        maxlength="80"
        placeholder="Por ejemplo, DBZ"
        aria-label="Pedido de búsqueda"
        autocomplete="off"
      />
      <q-btn unelevated no-caps class="btn-main" type="submit" label="Añadir" :disable="!noteDraft.trim()" />
    </form>
    <div v-if="!notes.length" class="empty" role="status">
      <q-icon name="sticky_note_2" size="40px" aria-hidden="true" />
      <b>Ninguna búsqueda anotada</b>
    </div>
    <ul v-else class="notes">
      <li v-for="note in notes" :key="note.id" class="note" :class="{ 'note--done': note.done }">
        <span class="note__text">{{ note.text }}</span>
        <q-btn flat no-caps class="note__btn" :label="note.done ? 'Pendiente' : 'Hecha'" @click="toggle(note)" />
      </li>
    </ul>
  </q-page>
</template>
