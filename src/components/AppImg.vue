<script setup lang="ts">
import { ref, watch } from 'vue'
import { QBtn, QIcon, QImg } from 'quasar'

interface AppImgProps {
  src?: string | null
  alt?: string
  fit?: 'cover' | 'contain'
  srcset?: string
  sizes?: string
  eager?: boolean
  /** Si se indica, una foto rota muestra "Reintentar" en lugar de solo el marcador. */
  retry?: boolean
}

const props = withDefaults(defineProps<AppImgProps>(), { src: null, alt: '', fit: 'cover', srcset: undefined, sizes: undefined, eager: false, retry: false })
const failed = ref(false)
const attempt = ref(0)

watch(() => props.src, () => {
  failed.value = false
})

const retryLoad = () => {
  failed.value = false
  attempt.value += 1
}
</script>

<template>
  <div class="app-img">
    <q-img
      v-if="props.src && !failed"
      :key="attempt"
      :src="props.src"
      :alt="props.alt"
      :fit="props.fit"
      :srcset="props.srcset || undefined"
      :sizes="props.srcset ? props.sizes : undefined"
      :loading="props.eager ? 'eager' : 'lazy'"
      no-spinner
      no-transition
      class="app-img__el"
      @error="failed = true"
    />
    <div v-else class="app-img__ph" :role="props.alt ? 'img' : undefined" :aria-label="props.alt || undefined">
      <q-icon name="image_not_supported" size="28px" aria-hidden="true" />
      <q-btn v-if="props.retry && props.src" no-caps unelevated icon="refresh" label="Reintentar" class="app-img__retry" @click.stop="retryLoad" />
    </div>
  </div>
</template>
