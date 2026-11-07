<script setup lang="ts">
import { QBtn, QIcon, QImg } from 'quasar'
import type { QImgProps } from 'quasar'
import { useAppImg } from '../composables/useAppImg'

interface AppImgProps {
  src?: string | null
  alt?: string
  fit?: NonNullable<QImgProps['fit']>
  srcset?: string
  sizes?: string
  eager?: boolean
  retry?: boolean
  missing?: string
}

const props = withDefaults(defineProps<AppImgProps>(), {
  src: null,
  alt: '',
  fit: 'cover',
  srcset: undefined,
  sizes: undefined,
  eager: false,
  retry: false,
  missing: '',
})

const { failed, attempt, retryLoad } = useAppImg(props)
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
    <div v-else class="app-img__ph" :role="props.alt || props.missing ? 'img' : undefined" :aria-label="props.alt || props.missing || undefined">
      <q-icon name="image_not_supported" size="28px" aria-hidden="true" />
      <span v-if="props.missing" class="app-img__missing">{{ props.missing }}</span>
      <q-btn v-if="props.retry && props.src" no-caps unelevated icon="refresh" label="Reintentar" class="app-img__retry" @click.stop="retryLoad" />
    </div>
  </div>
</template>
