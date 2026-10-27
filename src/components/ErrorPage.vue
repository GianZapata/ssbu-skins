<script setup lang="ts">
import { computed } from 'vue'
import { QBtn, QDialog, QIcon } from 'quasar'
import AppImg from './AppImg.vue'
import { tick } from '../composables/useApp'
import { retrySync } from '../features/plan/composables/usePlan'
import { skinOf } from '../features/plan/helpers/lookup'
import { state } from '../features/plan/services/sync'
import { thumbOf } from '../shared/helpers/skins'

/* Un único mensaje y un único botón. Si falla al guardar, se ve la skin que no se guardó. */
const failing = computed(() => {
  tick.value
  const on = state.syncKind === 'service'
  const op = (state.PEND as Array<{ to: string | null }>)[0]
  const skin = op && op.to ? skinOf(op.to) : null
  return { on, name: skin ? skin.name : '', img: thumbOf(skin) }
})
</script>

<template>
  <q-dialog :model-value="failing.on" persistent maximized transition-show="fade" transition-hide="fade" :transition-duration="240" class="error-dialog">
    <div class="error" role="alert">
      <div class="error__art" aria-hidden="true">
        <span class="error__ring"></span>
        <span class="error__tile">
          <AppImg v-if="failing.img" :src="failing.img" eager />
          <q-icon v-else name="cloud_off" size="40px" />
        </span>
        <span class="error__bang"><q-icon name="priority_high" size="22px" /></span>
      </div>
      <h1 class="error__title">Algo falló</h1>
      <p v-if="failing.name" class="sr-only">{{ 'Skin que no se pudo guardar: ' + failing.name }}</p>
      <q-btn unelevated no-caps icon="refresh" label="Reintentar" class="btn-main error__btn" @click="retrySync" />
    </div>
  </q-dialog>
</template>
