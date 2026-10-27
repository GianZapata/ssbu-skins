<script setup lang="ts">
import { ref } from 'vue'

interface FaceImgProps {
  src: string | null | undefined
  alt: string
  eager?: boolean
}

const props = defineProps<FaceImgProps>()
const failed = ref(false)
</script>

<template>
  <span class="im">
    <img v-if="props.src && !failed" :src="props.src" :alt="props.alt" :loading="props.eager ? 'eager' : 'lazy'" decoding="async" @error="failed = true">
    <span v-else class="noimg" role="img" :aria-label="props.alt || 'Sin imagen'">Sin imagen</span>
  </span>
</template>
