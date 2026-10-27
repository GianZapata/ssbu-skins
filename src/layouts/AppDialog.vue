<script setup lang="ts">
import { computed } from 'vue'
import {
  catState,
  closeDialog,
  DialogKind,
  dialog,
  exportText,
  tick,
} from '../composables/useApp'
import { FILTERS, toggleFilter } from '../features/catalog/composables/useCatalog'
import { skinOf } from '../features/plan/helpers/lookup'
import {
  copyDiag,
  copyExport,
  diagView,
  downloadExport,
  histRows,
  legacyItems,
  recoverGo,
  recoverNo,
  retrySync,
  undoLast,
} from '../features/plan/composables/usePlan'
import { state } from '../features/plan/services/sync'
import type { CatState } from '../shared/helpers/ssbu'
import { trajeName } from '../shared/helpers/text'

const hist = computed(() => {
  tick.value
  return histRows()
})
const diag = computed(() => {
  tick.value
  return diagView()
})
const legacy = computed(() => {
  tick.value
  return legacyItems().map((row) => ({ ...row, name: skinOf(row.vid)?.name || 'Skin sin nombre' }))
})
const filters = computed(() => {
  tick.value
  return catState()
})
const canUndo = computed(() => {
  tick.value
  return !!state.lastAct
})

const onChip = (key: string) => {
  toggleFilter(key as keyof CatState)
}

const onBackdrop = (event: MouseEvent) => {
  if (event.target === event.currentTarget) closeDialog()
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDialog()
    return
  }
  if (event.key !== 'Tab') return

  const dlgEl = document.getElementById('dlg')
  if (!dlgEl) return
  const focusables = dlgEl.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([hidden]), a[href]:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])'
  )
  const visible = Array.from(focusables).filter((el) => {
    return el.offsetParent !== null && !el.hasAttribute('hidden') && window.getComputedStyle(el).display !== 'none'
  })
  if (!visible.length) return

  const first = visible[0]
  const last = visible[visible.length - 1]

  if (event.shiftKey) {
    if (document.activeElement === first || !dlgEl.contains(document.activeElement)) {
      event.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last || !dlgEl.contains(document.activeElement)) {
      event.preventDefault()
      first.focus()
    }
  }
}
</script>

<template>
  <div id="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT" :class="{ open: dialog.open }" :hidden="!dialog.open" @click="onBackdrop" @keydown="onKeydown">
    <div class="box">
      <div class="hd">
        <h2 id="dlgT">{{ dialog.title }}</h2>
        <button id="dlgX" type="button" class="ib" aria-label="Cerrar" @click="closeDialog">
          <svg class="ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div id="dlgB">
        <div v-if="dialog.kind === DialogKind.hist">
          <button v-if="canUndo" id="hUndo" type="button" class="btn p" @click="undoLast(); closeDialog()">Deshacer mi último cambio</button>
          <div v-for="(row, index) in hist" :key="index" class="hrow">
            <div><b>{{ row.slot }} · {{ row.who }}</b><br>Alguien {{ row.what }}</div>
          </div>
          <p v-if="!hist.length" class="empty">Todavía no hay cambios en el historial.</p>
        </div>
        <div v-else-if="dialog.kind === DialogKind.exportar">
          <button id="xCopy" type="button" class="btn p" @click="copyExport">Copiar</button>
          <button id="xDown" type="button" class="btn" @click="downloadExport">Descargar</button>
          <pre id="xPre" tabindex="0">{{ exportText }}</pre>
        </div>
        <div v-else-if="dialog.kind === DialogKind.diag">
          <p>{{ diag.text }}</p>
          <p><b>Estado:</b> {{ diag.info.state }} · <b>Pendientes:</b> {{ diag.info.pend }} · <b>En línea:</b> {{ diag.info.online ? 'sí' : 'no' }}</p>
          <p><b>Proyecto:</b> {{ diag.info.project || '—' }}</p>
          <p v-for="(err, index) in diag.info.errors" :key="index"><b>{{ err.kind }}</b> {{ err.code }} {{ err.msg }}</p>
          <button id="dgCopy" type="button" class="btn p" @click="copyDiag">Copiar diagnóstico</button>
          <button id="dgRetry" type="button" class="btn" @click="retrySync">Reintentar ahora</button>
        </div>
        <div v-else-if="dialog.kind === DialogKind.filters">
          <div class="chips" role="group" aria-label="Filtros">
            <button v-for="chip in FILTERS" :key="chip[0]" type="button" class="chip" :data-chip="chip[0]" :aria-pressed="!!filters[chip[0]]" @click="onChip(chip[0])">{{ chip[1] }}</button>
          </div>
          <button id="filtrosOk" type="button" class="btn p" @click="closeDialog">Listo</button>
        </div>
        <div v-else-if="dialog.kind === DialogKind.recover">
          <p v-if="legacy.length">Este dispositivo guardó {{ legacy.length }} de la versión anterior. No se han añadido al plan.</p>
          <div v-for="row in legacy" :key="row.code + '_' + row.slot" class="hrow">
            <div><b>{{ trajeName(row.slot) }}</b><br>{{ row.name }}</div>
          </div>
          <button v-if="legacy.length" type="button" class="btn p" data-m="recover-go" @click="recoverGo(); closeDialog()">Añadir al plan compartido</button>
          <button v-if="legacy.length" type="button" class="btn" data-m="recover-no" @click="recoverNo(); closeDialog()">No añadir</button>
          <p v-if="!legacy.length" class="empty">No hay elecciones antiguas pendientes.</p>
        </div>
      </div>
    </div>
  </div>
</template>
