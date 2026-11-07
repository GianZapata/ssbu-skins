<script setup lang="ts">
import { QBtn } from 'quasar'
import AppImg from '../../../components/AppImg.vue'

interface PlacingBandProps {
  name: string
  img: string | null
}

interface PlacingBandEmits {
  cancel: []
}

const props = defineProps<PlacingBandProps>()
const emit = defineEmits<PlacingBandEmits>()
</script>

<template>
  <div class="placing" role="status">
    <span class="placing__img"><AppImg :src="props.img" fit="cover" :missing="props.img ? '' : 'Sin retrato'" /></span>
    <p class="placing__txt">Elegir traje para <b>{{ props.name }}</b></p>
    <q-btn flat no-caps class="placing__cancel" label="Cancelar" @click="emit('cancel')" />
  </div>
</template>
