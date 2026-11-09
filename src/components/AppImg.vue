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
  missing?: string
}

const props = withDefaults(defineProps<AppImgProps>(), {
  src: null,
  alt: '',
  fit: 'cover',
  srcset: undefined,
  sizes: undefined,
  eager: false,
  missing: '',
})

const { failed, loaded, attempt, retryLoad } = useAppImg(props)
</script>

<template>
  <div class="app-img" :class="{ 'app-img--loading': props.src && !failed && !loaded }">
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
      @load="loaded = true"
      @error="failed = true"
    />
    <div v-else-if="props.src" class="app-img__ph app-img__ph--failed" role="img" :aria-label="'No cargó la imagen' + (props.alt ? ': ' + props.alt : '')">
      <q-icon name="broken_image" size="24px" aria-hidden="true" />
      <span class="app-img__label">No cargó la imagen</span>
      <q-btn no-caps unelevated icon="refresh" label="Reintentar" class="app-img__retry" @click.stop="retryLoad" />
    </div>
    <div v-else class="app-img__ph app-img__ph--missing" role="img" :aria-label="props.alt || props.missing || 'Sin retrato'">
      <q-icon name="broken_image" size="24px" aria-hidden="true" />
      <span v-if="props.missing" class="app-img__missing">{{ props.missing }}</span>
    </div>
  </div>
</template>
