# Fase 3 — Propuestas por persona Implementation Plan

> **For agentic workers:** Ejecutar tarea por tarea verificando cada comando real del repositorio antes de cada commit. Trabajar en una rama dedicada desde `master` (`feat/fase3-propuestas-persona`), asumiendo la Fase 2 ya fusionada en `master`. Si al ejecutar encuentras una discrepancia menor de entorno o líneas vecinas, corrígela en el acto manteniendo intactos los contratos, las pruebas y `Self-check TS: 0 pendientes`. Nunca añadas `Co-Authored-By` ni atribución de IA en los commits; usa únicamente Conventional Commits. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Permitir una propuesta por persona y traje (`changes/{code}_{slot}_{name}` con `name` en `['Gian', 'Alan', 'Ches', 'Samu']`), mediante un gate perezoso (`PersonSheet`) que nunca bloquea la carga ni la lectura, aislando `assignBlock` y el deshacer (`clearAt`) por persona activa, protegiendo las propuestas legacy sin `name` como solo lectura («Otros») en `firestore.rules`, y agrupando las propuestas por traje y persona en `tools/review_plan.py`.

**Architecture:** `@vueuse/core` gestiona la elección persistida en `localStorage` (`ssbu_person`) dentro de `usePerson.ts` con almacenamiento tolerante a fallos; `PersonSheet.vue` solo se abre al intentar guardar una propuesta sin persona elegida o desde «Cambiar persona» en el menú `⋮`. `domain.ts`, `ssbu.ts` y `sync.ts` indexan `PLAN`, `confirmedPlan`, `removedPlanAt` y la cola `PEND` por el ID completo `{code}_{slot}_{name}` (conservando lectura de documentos legacy `{code}_{slot}` como «Otros»), exponen `proposalsAt(code, n)` con la persona activa primero y mantienen `planVid(code, n)` compatible con la UI previa a Fase 4 devolviendo la propuesta propia o, en lectura, la más reciente de otros.

**Tech Stack:** Vue 3.5, `@vueuse/core`, Quasar (`QDialog` provisional hasta la migración global a `vaul-vue` en Fase 4), TypeScript 5.9 (`gian-how-i-code` + `gian-ts-style`), Firestore Security Rules v2, Python 3.9+ (`unittest`), Node `node:test`, Playwright (`tests/run.sh`).

---

## Mapa de archivos

- **Crear:**
  - `src/features/plan/enums/PersonName.ts` — Conjunto cerrado `APP_OWNED`: `Gian`, `Alan`, `Ches`, `Samu`.
  - `src/features/plan/composables/usePerson.ts` — Persistencia en `ssbu_person` con `@vueuse/core` (`useStorage` + `StorageLike` seguro), estado `isOpenPerson` y gate perezoso `requirePerson`.
  - `src/features/plan/composables/usePersonSheet.ts` — Composable de `PersonSheet.vue` dueño de la selección.
  - `src/features/plan/components/PersonSheet.vue` — Hoja accesible con los 4 botones (`≥ 48 px`) y aviso honesto de lista cerrada sin contraseña.
  - `src/layouts/composables/useAppShell.ts` — Composable extraído de `AppShell.vue` al añadir el control de persona (`gian-how-i-code` `25-vue-sfc`).
- **Modificar:**
  - `package.json` y `package-lock.json` — Instala `@vueuse/core`.
  - `src/features/plan/helpers/plan.helper.ts` — Añade `people`, `isPersonName`, `personLabel` (`'Otros'` para legacy sin `name`) y `originOfPerson`.
  - `src/layouts/AppShell.vue` — Usa `useAppShell`, añade «Elegir persona» / «Cambiar persona (X)» en el menú `⋮` y monta `<PersonSheet v-if="isOpenPerson" />`.
  - `src/app.css` — Estilos de `.person-grid`, `.person-btn` y `.person-note` conservando intactos todos los tokens `:root` verificados por `tests/unit/test_contrast.mjs`.
  - `firestore.rules` — Valida `okPerson(name)` e `id == code + '_' + string(slot) + '_' + name` en `changes/{id}` (`create, update`) y `history/{id}`, y restringe `delete` en `changes/{id}` a documentos con `name` válido para dejar los `{code}_{slot}` legacy como solo lectura.
  - `tools/db.py` — Propaga `name` y `person` (`name or 'Otros'`) en `draft()` y `name` en `history`.
  - `tools/review_plan.py` — Propaga `person` desde `changes` / `admin` / `file`, aísla duplicados de mod por `(person, code)` y agrupa la salida Markdown por traje listando cada persona.
  - `docs/SELECTION_CONTRACT.md` — Documenta `changes/{code}_{slot}_{name}`, `person`/`name`, la protección de solo lectura para propuestas legacy («Otros») y que la exportación sigue siendo borrador de propuestas.
  - `src/shared/helpers/domain.ts` — Añade `PEOPLE`, `validPerson`, `docKey`, `parseDocKey`, `proposalsAt`, `ownVid`, `ownVariant`, `ownEntries` y soporte de `name` en `setOp`, `clearOp`, `planVid`, `planVariant` y `planEntries` (JavaScript puro compatible con `vm.runInNewContext`).
  - `src/shared/helpers/ssbu.ts` — Tipa `ProposalRow`, extiende `PlanRow` y `Op` con `name` y expone los nuevos métodos de `Domain`.
  - `src/features/plan/services/sync.ts` — Indexa `PLAN`, `confirmedPlan`, `removedPlanAt` y `PEND` por `{code}_{slot}_{name}` (manteniendo los 5 marcadores exactos que extrae `tests/unit/sync_ordering.js`), escribe `name` en `changes` e `history` y expone `proposalsAt`, `ownVid`, `ownVariant`, `ownEntries`, `getPerson`, `setPerson` y `docKey`.
  - `src/features/plan/helpers/lookup.ts` — Actualiza `isUnsent` para consultar operaciones pendientes del traje (con filtro opcional por persona).
  - `src/features/plan/composables/usePlan.ts` — Enlaza `bindPersonSync(setPerson)`, pasa `proposeAt` por `requirePerson`, filtra `assignBlock` y `clearAt` exclusivamente sobre `ownEntries()` / `ownVid()`, incluye `person` y `name` en `exportPlan()` y expone helpers en `window`.
  - `src/features/fighters/composables/useSummarySheet.ts` y `src/features/fighters/components/SummarySheet.vue` — Compatibiliza la hoja actual con múltiples propuestas por traje usando `row.key`, mostrando el nombre de la persona (`Gian`, `Alan`, `Ches`, `Samu` u `Otros`) y permitiendo deshacer únicamente propuestas propias (`canUndo`) hasta el rediseño por pestañas de Fase 5.
  - `tests/unit/test_review.py`, `tests/unit/test_domain.mjs`, `tests/unit/sync_ordering.js` — Cobertura unitaria de persona, aislamiento y coexistencia legacy.
  - `tests/e2e/lib.js`, `tests/e2e/ack-transition.js`, `tests/e2e/sync-errors.js`, `tests/e2e/recorridos.js`, `tests/e2e/local.spec.js` — Sembrado por defecto de `ssbu_person = 'Gian'` en flujos de escritura, prueba dedicada del gate perezoso sin persona guardada, coexistencia simultánea de `Gian` + `Alan` en el mismo traje y verificación de reglas sobre emulador (`L.raw`).
- **No tocar:**
  - `/Volumes/SWITCH SD`, `Gian-Ultimate-Modpack-private`, `~/Documents/smash-mod-assets`, ni desplegar `firestore.rules` sin autorización explícita de Gian.

## Sin datos todavía y texto de la referencia que no se publica

- **Sin datos todavía:**
  - Documentos previos en `changes/{code}_{slot}` creados antes de Fase 3 no tienen campo `name`: la app y `review_plan.py` los leen y etiquetan como `Otros` en modo solo lectura (`allow delete` denegado en `firestore.rules`), sin inventar autor ni borrarlos desde el cliente.
- **Texto de la referencia que no se publica:**
  - Términos internos del plan («gate perezoso», «Fase 3», «legacy», «LCP») no se muestran en la interfaz; `PersonSheet` muestra únicamente la pregunta `¿Quién propone?`, los 4 nombres y el aviso claro de que el nombre se elige entre amigos sin contraseña.

---

### Task 1: `@vueuse/core`, `PersonName`, `usePerson`, `PersonSheet` y menú `⋮` en `AppShell`

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/features/plan/enums/PersonName.ts`
- Modify: `src/features/plan/helpers/plan.helper.ts`
- Create: `src/features/plan/composables/usePerson.ts`
- Create: `src/features/plan/composables/usePersonSheet.ts`
- Create: `src/features/plan/components/PersonSheet.vue`
- Create: `src/layouts/composables/useAppShell.ts`
- Modify: `src/layouts/AppShell.vue`
- Modify: `src/app.css`

- [ ] **Step 1: Crear rama desde `master` e instalar `@vueuse/core`**

Run:
```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout master
git -C /Users/gian/Desktop/ssbu/ssbu-skins pull --ff-only
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout -b feat/fase3-propuestas-persona
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm install @vueuse/core
```
Expected: rama `feat/fase3-propuestas-persona` creada y `@vueuse/core` añadido a `dependencies` en `package.json`.

- [ ] **Step 2: Crear `src/features/plan/enums/PersonName.ts` y actualizar `src/features/plan/helpers/plan.helper.ts`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/enums/PersonName.ts`:

```ts
export enum PersonName {
  Gian = 'Gian',
  Alan = 'Alan',
  Ches = 'Ches',
  Samu = 'Samu',
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/helpers/plan.helper.ts` por:

```ts
import { PersonName } from '../enums/PersonName'
import { ProposalOrigin } from '../enums/ProposalOrigin'

interface ProposalOriginMeta {
  label: string
}

export class PlanHelper {
  static readonly people: readonly PersonName[] = [
    PersonName.Gian,
    PersonName.Alan,
    PersonName.Ches,
    PersonName.Samu,
  ]

  static readonly originMeta: Record<ProposalOrigin, ProposalOriginMeta> = {
    [ProposalOrigin.Unsent]: {
      get label() {
        return 'Sin enviar'
      },
    },
    [ProposalOrigin.Mine]: {
      get label() {
        return 'Tuyas'
      },
    },
    [ProposalOrigin.Friend]: {
      get label() {
        return 'De otros'
      },
    },
  }

  static getOriginMeta(origin: ProposalOrigin | null | undefined): ProposalOriginMeta {
    if (origin == null) return this.originMeta[ProposalOrigin.Mine]

    return this.originMeta[origin]
  }

  static isPersonName(value: unknown): value is PersonName {
    return (this.people as readonly unknown[]).includes(value)
  }

  static personLabel(name: string | null | undefined): string {
    if (this.isPersonName(name)) return name

    return 'Otros'
  }

  static originOfPerson(
    rowName: string | null | undefined,
    currentPerson: PersonName | null,
    unsent: boolean,
  ): ProposalOrigin {
    if (unsent) return ProposalOrigin.Unsent
    if (currentPerson && rowName === currentPerson) return ProposalOrigin.Mine

    return ProposalOrigin.Friend
  }

  static whenLabel(at: number | null | undefined) {
    if (at == null) return ''

    return new Date(at).toLocaleString('es')
  }
}
```

- [ ] **Step 3: Crear `usePerson.ts`, `usePersonSheet.ts` y `PersonSheet.vue`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePerson.ts`:

```ts
import { computed, ref } from 'vue'
import { useStorage, type StorageLike } from '@vueuse/core'
import type { PersonName } from '../enums/PersonName'
import { PlanHelper } from '../helpers/plan.helper'

const memoryStore = new Map<string, string>()

const safeStorage: StorageLike = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return memoryStore.get(key) ?? null
    }
  },
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value)

    try {
      localStorage.setItem(key, value)
    } catch {
      return
    }
  },
  removeItem: (key: string) => {
    memoryStore.delete(key)

    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  },
}

const storedPerson = useStorage<string>('ssbu_person', '', safeStorage)
export const isOpenPerson = ref(false)

let pendingCallback: ((person: PersonName) => void) | null = null
let onPersonSync: (person: PersonName | null) => void = () => {}

export const activePerson = computed<PersonName | null>(() => {
  const value = storedPerson.value

  if (PlanHelper.isPersonName(value)) return value

  return null
})

export const bindPersonSync = (listener: (person: PersonName | null) => void) => {
  onPersonSync = listener
  onPersonSync(activePerson.value)
}

export const syncStoredPerson = (person: string | null) => {
  if (PlanHelper.isPersonName(person)) {
    storedPerson.value = person
    onPersonSync(person)

    return
  }

  storedPerson.value = ''
  onPersonSync(null)
}

export const openPersonSheet = () => {
  pendingCallback = null
  isOpenPerson.value = true
}

export const closePersonSheet = () => {
  pendingCallback = null
  isOpenPerson.value = false
}

export const choosePerson = (person: PersonName) => {
  storedPerson.value = person
  onPersonSync(person)

  const callback = pendingCallback

  pendingCallback = null
  isOpenPerson.value = false

  if (callback) callback(person)
}

export const requirePerson = (action: (person: PersonName) => void): boolean => {
  const current = activePerson.value

  if (current) {
    action(current)

    return true
  }

  pendingCallback = action
  isOpenPerson.value = true

  return false
}

export const usePerson = () => ({
  people: PlanHelper.people,
  activePerson,
  isOpenPerson,
  openPersonSheet,
  closePersonSheet,
  choosePerson,
  requirePerson,
})
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePersonSheet.ts`:

```ts
import { useDesktop } from '../../../composables/useDesktop'
import type { PersonName } from '../enums/PersonName'
import { choosePerson, usePerson } from './usePerson'

interface UsePersonSheetEmits {
  (event: 'close'): void
}

export const usePersonSheet = (emit: UsePersonSheetEmits) => {
  const desktop = useDesktop()
  const { people, activePerson } = usePerson()

  const selectPerson = (person: PersonName) => {
    choosePerson(person)
  }

  const onDialogUpdate = (nextOpen: boolean) => {
    if (!nextOpen) emit('close')
  }

  return {
    desktop,
    people,
    activePerson,
    selectPerson,
    onDialogUpdate,
  }
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/components/PersonSheet.vue`:

```vue
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

const { desktop, people, activePerson, selectPerson, onDialogUpdate } = usePersonSheet(emit)
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
    class="sheet-dialog"
    @update:model-value="onDialogUpdate"
  >
    <div class="sheet sheet--person" role="dialog" aria-labelledby="person-sheet-title" @keydown="loop">
      <div class="sheet__grab" aria-hidden="true"></div>
      <div class="sheet__head">
        <h2 id="person-sheet-title" class="sheet__h">¿Quién propone?</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>
      <div class="sheet__scroll">
        <p class="person-note">El nombre se elige entre amigos; no pide contraseña.</p>
        <div class="person-grid">
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
```

- [ ] **Step 4: Extraer `useAppShell.ts`, conectar `AppShell.vue` y añadir estilos en `src/app.css`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/layouts/composables/useAppShell.ts`:

```ts
import { computed, onMounted, watch } from 'vue'
import { back, go, portraitOf, route, showBack, start, tick, titleOf } from '../../composables/useApp'
import { hdrHidden, resetReveal, startReveal } from '../../composables/useReveal'
import { activePerson, closePersonSheet, isOpenPerson, openPersonSheet } from '../../features/plan/composables/usePerson'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../../features/plan/composables/usePlan'
import { useSaveStatus } from '../../features/plan/saveStatus'

export const useAppShell = () => {
  const { problem } = useSaveStatus()

  const title = computed(() => {
    tick.value

    return titleOf()
  })

  const portrait = computed(() => {
    tick.value

    return portraitOf()
  })

  const canBack = computed(() => {
    tick.value

    return showBack()
  })

  const chosen = computed(() => {
    tick.value

    return countChosen()
  })

  const personMenuLabel = computed(() => {
    const person = activePerson.value

    if (person) return 'Cambiar persona (' + person + ')'

    return 'Elegir persona'
  })

  const runNotice = () => {
    const current = notice.value

    if (!current) return

    notice.value = null
    if (current.fn) current.fn()
  }

  watch(
    () => route.value.v + ':' + route.value.code,
    () => resetReveal(),
  )

  onMounted(() => {
    start()
    startReveal()
    bootPlan()
  })

  return {
    hdrHidden,
    problem,
    notice,
    title,
    portrait,
    canBack,
    chosen,
    personMenuLabel,
    isOpenPerson,
    back,
    go,
    retrySync,
    dismissNotice,
    openPersonSheet,
    closePersonSheet,
    runNotice,
  }
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/layouts/AppShell.vue` por:

```vue
<script setup lang="ts">
import { QAvatar, QBtn, QHeader, QItem, QItemSection, QLayout, QList, QMenu, QPageContainer, QToolbar } from 'quasar'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import PersonSheet from '../features/plan/components/PersonSheet.vue'
import { useAppShell } from './composables/useAppShell'

const {
  hdrHidden,
  problem,
  notice,
  title,
  portrait,
  canBack,
  chosen,
  personMenuLabel,
  isOpenPerson,
  back,
  go,
  retrySync,
  dismissNotice,
  openPersonSheet,
  closePersonSheet,
  runNotice,
} = useAppShell()
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app" :class="{ 'app--hdr-hidden': hdrHidden }">
    <q-header class="app-header" :class="{ 'app-header--hide': hdrHidden }" height-hint="56">
      <div class="app-frame">
        <q-toolbar class="app-header__bar">
          <q-btn v-if="canBack" flat round padding="0" class="icon-btn" icon="arrow_back" aria-label="Volver" @click="back" />
          <q-avatar v-if="portrait" square size="36px" class="app-header__face">
            <img :src="portrait" alt="" decoding="async">
          </q-avatar>
          <h1 id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>
          <span id="sync" class="sync-word"></span>
          <q-btn flat round padding="0" class="icon-btn" icon="more_vert" aria-label="Más opciones">
            <q-menu anchor="bottom right" self="top right">
              <q-list>
                <q-item v-close-popup clickable data-person-menu @click="openPersonSheet">
                  <q-item-section>{{ personMenuLabel }}</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="go('#/notas')">
                  <q-item-section>Búsquedas pendientes</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-btn
            flat
            no-caps
            class="hdr-btn"
            :class="{ 'hdr-btn--on': chosen > 0 }"
            :label="'Cambios · ' + chosen"
            :aria-label="'Ver cambios, ' + chosen"
            @click="go('#/cambios')"
          />
        </q-toolbar>
        <div v-if="problem" class="sync-fail" role="status">
          <span>{{ problem }}</span>
          <q-btn flat no-caps class="hdr-btn" label="Reintentar" @click="retrySync" />
        </div>
        <div v-if="notice" id="toast" class="notice" role="status">
          <span>{{ notice.text }}</span>
          <button v-if="notice.label" type="button" @click="runNotice">{{ notice.label }}</button>
          <button type="button" aria-label="Cerrar aviso" @click="dismissNotice">Cerrar</button>
        </div>
      </div>
    </q-header>

    <q-page-container>
      <slot />
    </q-page-container>

    <SummarySheet />
    <PersonSheet v-if="isOpenPerson" :is-open="isOpenPerson" @close="closePersonSheet" />
  </q-layout>
</template>
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/app.css`, añadir al final del archivo (sin tocar `:root`):

```css
/* ============================ Elección de persona ============================ */
.q-dialog__inner > .sheet.sheet--person { height: auto; max-height: calc(100dvh - 96px); }
.person-note { margin: 0; color: var(--tx-mu); font-size: 14px; line-height: 20px; }
.person-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.person-btn { min-height: 52px; padding: 10px 16px; border: 1px solid var(--bd-active); border-radius: 12px; background: var(--s2); color: var(--tx); font-size: 17px; font-weight: 700; text-align: center; }
.person-btn--on { border-color: var(--ac); background: var(--color-propuesta-bg); color: var(--color-propuesta); }
```

- [ ] **Step 5: Verificar `typecheck`, contraste y `self-check.mjs`, y commitear Task 1**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/test_contrast.mjs
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins add package.json package-lock.json src/features/plan/enums/PersonName.ts src/features/plan/helpers/plan.helper.ts src/features/plan/composables/usePerson.ts src/features/plan/composables/usePersonSheet.ts src/features/plan/components/PersonSheet.vue src/layouts/composables/useAppShell.ts src/layouts/AppShell.vue src/app.css
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(plan): add lazy person selector and storage"
```
Expected: `vue-tsc --noEmit` sin errores, `test_contrast.mjs` en verde y `Self-check TS: 0 pendientes`.

---

### Task 2: `firestore.rules`, `tools/db.py`, `tools/review_plan.py` y `docs/SELECTION_CONTRACT.md`

**Files:**
- Modify: `firestore.rules`
- Modify: `tools/db.py:113-141`
- Modify: `tools/review_plan.py`
- Modify: `docs/SELECTION_CONTRACT.md`
- Modify: `tests/unit/test_review.py`

- [ ] **Step 1: Actualizar `firestore.rules` para `{code}_{slot}_{name}` y proteger legacy en `delete`**

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/firestore.rules` por:

```protobuf
rules_version = '2';
// Modelo: propuestas por persona y traje con sesión anónima automática.
//  - catalog, installed, drive, slot_plan, meta, status: los escribe el backend (cuenta de servicio); la web solo lee.
//  - changes/{luchador}_{traje}_{persona}: una propuesta por persona (Gian, Alan, Ches, Samu) y traje.
//    Los documentos anteriores {luchador}_{traje} sin `name` quedan protegidos como solo lectura («Otros»).
//  - history/{id}: registro inmutable de cada cambio con el campo `name`.
//  - selection/*: modelo histórico; solo lectura.
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function catPath(code) { return /databases/$(database)/documents/catalog/$(code); }
    function okVid(code, vid) {
      return vid is string && vid.size() <= 80 && exists(catPath(code)) && vid in get(catPath(code)).data.vids;
    }
    function okSlot(s) { return s is int && s >= 0 && s <= 7; }
    function okRef(v) { return v == null || (v is string && v.size() <= 80); }
    function okPerson(n) { return n is string && n in ['Gian', 'Alan', 'Ches', 'Samu']; }
    function okVariant(d, vid) {
      return !('variant' in d) || (
        d.variant is string
        && d.variant.size() == vid.size() + 13
        && d.variant[0:vid.size()] == vid
        && d.variant[vid.size():d.variant.size()].matches(':[0-9a-f]{8}:c0[0-7]')
      );
    }

    match /catalog/{code}   { allow read: if true; allow write: if false; }
    match /installed/{code} { allow read: if true; allow write: if false; }
    match /drive/{code}     { allow read: if true; allow write: if false; }
    match /slot_plan/{code} { allow read: if true; allow write: if false; }
    match /meta/{doc}       { allow read: if true; allow write: if false; }
    match /status/{vid}     { allow read: if true; allow write: if false; }
    match /selection/{doc}  { allow read: if true; allow write: if false; }

    match /changes/{id} {
      allow read: if true;
      allow create, update: if signedIn()
        && request.resource.data.keys().hasOnly(['code', 'slot', 'vid', 'variant', 'name', 'by', 'at'])
        && request.resource.data.code is string && request.resource.data.code.size() <= 4
        && okSlot(request.resource.data.slot)
        && okPerson(request.resource.data.name)
        && id == request.resource.data.code + '_' + string(request.resource.data.slot) + '_' + request.resource.data.name
        && okVid(request.resource.data.code, request.resource.data.vid)
        && okVariant(request.resource.data, request.resource.data.vid)
        && request.resource.data.by == request.auth.uid
        && request.resource.data.at == request.time;
      allow delete: if signedIn()
        && 'name' in resource.data
        && okPerson(resource.data.name)
        && id == resource.data.code + '_' + string(resource.data.slot) + '_' + resource.data.name;
    }

    match /requests/{id} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.keys().hasOnly(['text', 'done', 'by', 'at'])
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 80
        && request.resource.data.done == false
        && request.resource.data.by == request.auth.uid
        && request.resource.data.at == request.time;
      allow update: if signedIn()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['done'])
        && request.resource.data.done is bool;
      allow delete: if signedIn();
    }

    match /history/{id} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.keys().hasOnly(['code', 'slot', 'from', 'to', 'from_variant', 'variant', 'name', 'kind', 'by', 'at'])
        && request.resource.data.code is string && request.resource.data.code.size() <= 4
        && okSlot(request.resource.data.slot)
        && okPerson(request.resource.data.name)
        && okRef(request.resource.data.from) && okRef(request.resource.data.to)
        && (!('from_variant' in request.resource.data) || (request.resource.data.from_variant is string && request.resource.data.from_variant.size() <= 120))
        && (!('variant' in request.resource.data) || (request.resource.data.variant is string && request.resource.data.variant.size() <= 120))
        && request.resource.data.kind in ['set', 'clear', 'undo']
        && request.resource.data.by == request.auth.uid
        && request.resource.data.at == request.time;
      allow update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Actualizar `draft(db)` en `tools/db.py`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/db.py`, actualizar `draft(db)` (líneas 113–141) para conservar `name` y `person`:

```python
def draft(db):
    fighters, meta = cd.load(); inv = cd.load_inventory(fighters)
    by_vid = {p['vid']: (f, p) for f in fighters for p in f['picks']}
    status = {d.id: d.to_dict() for d in db.collection('status').stream()}
    rows = []
    for d in db.collection('changes').stream():
        c = d.to_dict(); f, p = by_vid.get(c.get('vid'), (None, None))
        code, n = c['code'], c['slot']; fi = next((x for x in fighters if x['code'] == code), None)
        cv = c.get('variant')
        person = c.get('name') or 'Otros'
        chosen = {'id': cv, 'source_slot': cv[-3:], 'destination_slot': f'c{n:02d}'} if isinstance(cv, str) and re.fullmatch(r'.+:[0-9a-f]{8}:c0[0-7]', cv) else None
        st = status.get(c['vid']) or {}
        rows.append({'fighter': fi['name'] if fi else code, 'roster_no': code, 'traje': n + 1, 'slot': f'c{n:02d}',
                     'name': c.get('name'), 'person': person,
                     'current': _current(inv, code, n),
                     'proposal': None if not p else {'vid': p['vid'], 'role': p['role'], 'variant': p['variant'], 'chosen_variant': chosen, 'mod_id': p['id'], 'name': p['name'], 'author': p['author'], 'url': p['url'],
                                                    'online': ONLINE.get(p['wifi_status'], 'Online: sin auditar'), 'conditions': p['conditions'] or None,
                                                    'dependencies': p['deps'] or None, 'conflicts': p['conflicts'] or None, 'native_slots': p['slots_orig'],
                                                    'dest_hint': p['dest'], 'pack': p['pack'], 'withdrawn': p['withdrawn']},
                     'missing_in_catalog': p is None, 'vid': c['vid'], 'variant': cv, 'proposed_at': c['at'].isoformat() if c.get('at') else None,
                     'status': st.get('status', 'wanted'), 'result': st.get('result')})
    rows.sort(key=lambda r: (r['roster_no'], r['traje'], r['person']))
    hist = [{'at': h['at'].isoformat() if h.get('at') else None, 'roster_no': h['code'], 'traje': h['slot'] + 1, 'from': h.get('from'), 'to': h.get('to'),
             **({'name': h['name']} if h.get('name') else {}),
             **({'from_variant': h['from_variant']} if h.get('from_variant') else {}), **({'variant': h['variant']} if h.get('variant') else {}), 'kind': h.get('kind')}
            for h in (d.to_dict() for d in db.collection('history').order_by('at', direction='DESCENDING').limit(50).stream())]
    out = {'schema': 3, 'generated_at': now().isoformat(), 'catalog': meta.get('generated'),
           'inventory': {'verification': ((inv or {}).get('meta') or {}).get('verification'), 'scanned_at': ((inv or {}).get('meta') or {}).get('scanned_at'),
                         'sources': ((inv or {}).get('meta') or {}).get('sources'), 'note': ((inv or {}).get('meta') or {}).get('note')},
           'target': {'game': 'Super Smash Bros. Ultimate', 'version': '13.0.5', 'loader': 'ARCropolis 4.1.1'},
           'changes': rows, 'history': hist}
    print(json.dumps(out, ensure_ascii=False, indent=2))
```

- [ ] **Step 3: Agrupar por traje y listar cada persona en `tools/review_plan.py`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/review_plan.py`:
1. Añadir `PEOPLE_ORDER = ('Gian', 'Alan', 'Ches', 'Samu', 'Otros')` junto a `PAIRS`, y una función `_person_of(c, default_other=False)`:
   ```python
   PEOPLE_ORDER = ('Gian', 'Alan', 'Ches', 'Samu', 'Otros')

   def _person_of(c, default_other=False):
       raw = c.get('person') or c.get('name')
       if raw in ('Gian', 'Alan', 'Ches', 'Samu', 'Otros'):
           return raw
       doc_id = str(c.get('_id') or '')
       parts = doc_id.split('_')
       if len(parts) == 3 and parts[2] in ('Gian', 'Alan', 'Ches', 'Samu'):
           return parts[2]
       return 'Otros' if default_other else None
   ```
2. En `read_file(path)`, incluir `'person': _person_of(c, default_other=('name' in c or 'person' in c))`.
3. En `review(changes, history, fighters, inv, plan_inv_version=None, families=None)`:
   - Ordenar `rows` por `(fighter_idx, c['slot'], PEOPLE_ORDER.index(p) if p in PEOPLE_ORDER else 99)` donde `p = _person_of(c)`.
   - Guardar `'person': person` dentro de cada `it` (`items`).
   - Cambiar la acumulación de duplicados por luchador de `per_fighter[code].append(...)` a `per_fighter[(person or '', code)].append((n, p, chosen_variant))`, y en el recorrido global de `per_fighter`:
     ```python
     for (person_key, code), lst in per_fighter.items():
         who = f' ({person_key})' if person_key else ''
         c = collections.Counter(p['id'] for _, p, _ in lst)
         for mid, k in c.items():
             if k <= 1:
                 continue
             rows_m = [(n, cv) for n, p, cv in lst if p['id'] == mid]
             slots_str = ', '.join(f'c{n:02d}' for n, _ in rows_m)
             variants_m = [cv for _, cv in rows_m if cv]
             if len(variants_m) == k and len(set(variants_m)) == k:
                 add(F, 'INFO', f'{by_code[code]["name"]}{who}: {k} variantes distintas del mod {mid} en {slots_str}')
             else:
                 add(F, 'AVISO', f'{by_code[code]["name"]}{who}: el mismo mod ({mid}) está en {k} trajes ({slots_str}); si es un pack de varios diseños está bien, si no es un duplicado')
     ```
4. En `render(items, F, meta)`, agrupar elementos consecutivos del mismo `(it['fighter'], it['traje'])` cuando haya propuestas con `person`:
   ```python
   cur = None
   idx_i = 0
   while idx_i < len(items):
       it = items[idx_i]
       if it['fighter'] != cur:
           cur = it['fighter']
           L += [f'## {cur}', '']
       group = [it]
       while idx_i + len(group) < len(items) and items[idx_i + len(group)]['fighter'] == cur and items[idx_i + len(group)]['traje'] == it['traje']:
           group.append(items[idx_i + len(group)])
       idx_i += len(group)
       if len(group) == 1 and not it.get('person'):
           worst = min((['ERROR', 'AVISO', 'INFO'].index(x['sev']) for x in it['notes']), default=3)
           L.append(f'### {["⛔", "⚠️", "ℹ️", "✅"][worst]} Traje {it["traje"]} ({it["slot"]}): {it.get("current", "?")} → {it["name"] or it["vid"]}')
           meta_bits = [b for b in (it.get('role'), it.get('author') and 'por ' + it['author'], it.get('url')) if b]
           if meta_bits:
               L.append('_' + ' · '.join(meta_bits) + '_')
           L += [f'- {icon[x["sev"]]} {x["msg"]}' for x in sorted(it['notes'], key=lambda x: ['ERROR', 'AVISO', 'INFO'].index(x['sev']))] or ['- ✅ sin observaciones']
           L.append('')
       else:
           slot_worst = min((['ERROR', 'AVISO', 'INFO'].index(x['sev']) for g in group for x in g['notes']), default=3)
           L.append(f'### {["⛔", "⚠️", "ℹ️", "✅"][slot_worst]} Traje {it["traje"]} ({it["slot"]}) · actual: {it.get("current", "?")}')
           for g in group:
               g_worst = min((['ERROR', 'AVISO', 'INFO'].index(x['sev']) for x in g['notes']), default=3)
               who = g.get('person') or 'Otros'
               L.append(f'#### {["⛔", "⚠️", "ℹ️", "✅"][g_worst]} {who} → {g["name"] or g["vid"]}')
               meta_bits = [b for b in (g.get('role'), g.get('author') and 'por ' + g['author'], g.get('url')) if b]
               if meta_bits:
                   L.append('_' + ' · '.join(meta_bits) + '_')
               L += [f'- {icon[x["sev"]]} {x["msg"]}' for x in sorted(g['notes'], key=lambda x: ['ERROR', 'AVISO', 'INFO'].index(x['sev']))] or ['- ✅ sin observaciones']
           L.append('')
   ```
5. En `main()`, actualizar `_rows`:
   ```python
   def _rows(ch, default_other=False):
       return [
           {
               'code': c['code'],
               'slot': int(c['slot']),
               'vid': c['vid'],
               **({'variant': c['variant']} if c.get('variant') else {}),
               **({'person': _person_of(c, default_other=default_other)} if _person_of(c, default_other=default_other) else {}),
           }
           for c in ch if c.get('vid')
       ]
   ```
   Pasar `default_other=True` en `--source admin` y `--source changes`, y `default_other=False` en `--source file`.

- [ ] **Step 4: Actualizar `docs/SELECTION_CONTRACT.md` y añadir pruebas en `tests/unit/test_review.py`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/docs/SELECTION_CONTRACT.md`:
- Sustituir `changes/{luchador}_{traje}` por `changes/{luchador}_{traje}_{persona}` (`persona` en `Gian`, `Alan`, `Ches`, `Samu`), explicando que los documentos previos `{luchador}_{traje}` sin `name` permanecen como solo lectura bajo la etiqueta `Otros` y que la exportación `schema: 3` incluye `"name": "Gian"` y `"person": "Gian"` en cada elemento de `changes` sin convertir el archivo en orden de instalación.

En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_review.py`, añadir una clase `ReviewByPersonTests(unittest.TestCase)` que compruebe:
1. Dos propuestas sobre el mismo traje (`{'code': '01', 'slot': 0, 'vid': v1, 'person': 'Gian'}` y `{'code': '01', 'slot': 0, 'vid': v2, 'person': 'Alan'}`) y una legacy (`{'code': '01', 'slot': 0, 'vid': v1, 'person': 'Otros'}`) se renderizan bajo un único encabezado `### ... Traje 1 (c00)` listando `#### ... Gian →`, `#### ... Alan →` y `#### ... Otros →`.
2. Que `Gian` y `Alan` propongan el mismo `mod_id` en trajes distintos (`c00` y `c02`) **no** dispara el `AVISO` de mod duplicado, mientras que una misma persona (`Gian` en `c00` y `c02` sin variantes distintas) **sí** lo dispara.

- [ ] **Step 5: Ejecutar suite Python y commitear Task 2**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && python3 -m unittest discover -s tests/unit -p 'test_*.py' -v
git -C /Users/gian/Desktop/ssbu/ssbu-skins add firestore.rules tools/db.py tools/review_plan.py docs/SELECTION_CONTRACT.md tests/unit/test_review.py
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(rules,review): scope changes by person and protect legacy docs"
```
Expected: todas las pruebas Python en verde (`OK`).

---

### Task 3: Cola, reconciliación y aislamiento por persona en `domain.ts`, `ssbu.ts`, `sync.ts`, `lookup.ts`, `usePlan.ts` y `SummarySheet`

**Files:**
- Modify: `src/shared/helpers/domain.ts`
- Modify: `src/shared/helpers/ssbu.ts`
- Modify: `src/features/plan/services/sync.ts`
- Modify: `src/features/plan/helpers/lookup.ts`
- Modify: `src/features/plan/composables/usePlan.ts`
- Modify: `src/features/fighters/composables/useSummarySheet.ts`
- Modify: `src/features/fighters/components/SummarySheet.vue`
- Modify: `tests/unit/test_domain.mjs`
- Modify: `tests/unit/sync_ordering.js`

- [ ] **Step 1: Añadir llaves y consultas por persona en `src/shared/helpers/domain.ts` y `src/shared/helpers/ssbu.ts`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/domain.ts` (JavaScript puro sin tipos TS para `vm.runInNewContext`):

1. Junto a `keyOf`, definir:
   ```js
   const PEOPLE = ['Gian', 'Alan', 'Ches', 'Samu'];
   const validPerson = name => PEOPLE.includes(name);
   const docKey = (c, n, name) => (validPerson(name) ? c + '_' + n + '_' + name : c + '_' + n);

   function parseDocKey(key) {
     const parts = String(key || '').split('_');
     if (parts.length !== 2 && parts.length !== 3) return null;
     const slot = Number(parts[1]);
     if (!validSlot(slot) || !parts[0]) return null;
     const name = parts.length === 3 ? parts[2] : null;
     if (name !== null && !validPerson(name)) return null;
     return { code: parts[0], slot, name };
   }
   ```
2. Reemplazar `planVid`, `planVariant` y `planEntries` por:
   ```js
   function proposalsAt(code, n, ctx) {
     const plan = (ctx && ctx.PLAN) || {};
     const pend = (ctx && ctx.PEND) || [];
     const person = ctx && validPerson(ctx.person) ? ctx.person : null;
     const byAuthor = new Map();

     Object.entries(plan).forEach(([k, val]) => {
       const parsed = parseDocKey(k);
       if (!parsed || parsed.code !== code || parsed.slot !== n || !val || !val.vid) return;
       const author = parsed.name || (validPerson(val.name) ? val.name : null);
       byAuthor.set(author || '__legacy__', {
         key: k,
         code,
         n,
         vid: val.vid,
         variant: val.variant || null,
         name: author,
         by: val.by || null,
         at: val.at ?? null,
         unsent: false,
       });
     });

     for (const o of pend) {
       const opName = validPerson(o.name) ? o.name : person;
       if (o.code !== code || o.slot !== n || !opName) continue;
       if (o.to) {
         byAuthor.set(opName, {
           key: docKey(code, n, opName),
           code,
           n,
           vid: o.to,
           variant: o.variant || null,
           name: opName,
           by: null,
           at: Date.now(),
           unsent: true,
         });
       } else {
         byAuthor.delete(opName);
       }
     }

     const list = Array.from(byAuthor.values());
     list.sort((a, b) => {
       const aMine = person && a.name === person ? 1 : 0;
       const bMine = person && b.name === person ? 1 : 0;
       if (aMine !== bMine) return bMine - aMine;
       const aLegacy = a.name === null ? 1 : 0;
       const bLegacy = b.name === null ? 1 : 0;
       if ((b.at || 0) !== (a.at || 0)) return (b.at || 0) - (a.at || 0);
       if (aLegacy !== bLegacy) return aLegacy - bLegacy;
       return PEOPLE.indexOf(a.name) - PEOPLE.indexOf(b.name);
     });
     return list;
   }

   function ownVid(code, n, ctx) {
     const person = ctx && validPerson(ctx.person) ? ctx.person : null;
     if (!person) return null;
     const hit = proposalsAt(code, n, ctx).find(item => item.name === person);
     return hit ? hit.vid : null;
   }

   function ownVariant(code, n, ctx) {
     const person = ctx && validPerson(ctx.person) ? ctx.person : null;
     if (!person) return null;
     const hit = proposalsAt(code, n, ctx).find(item => item.name === person);
     return hit ? (hit.variant || null) : null;
   }

   function planVid(code, n, ctx) {
     const first = proposalsAt(code, n, ctx)[0];
     return first ? first.vid : null;
   }

   function planVariant(code, n, ctx) {
     const first = proposalsAt(code, n, ctx)[0];
     return first ? (first.variant || null) : null;
   }

   function planEntries(ctx) {
     const plan = (ctx && ctx.PLAN) || {};
     const pend = (ctx && ctx.PEND) || [];
     const byCode = (ctx && ctx.byCode) || {};
     const pairs = new Set();
     Object.keys(plan).forEach(k => {
       const parsed = parseDocKey(k);
       if (parsed && byCode[parsed.code]) pairs.add(parsed.code + '_' + parsed.slot);
     });
     pend.forEach(o => {
       if (byCode[o.code] && validSlot(o.slot)) pairs.add(o.code + '_' + o.slot);
     });
     const out = [];
     pairs.forEach(pair => {
       const idxSep = pair.lastIndexOf('_');
       const code = pair.slice(0, idxSep);
       const n = Number(pair.slice(idxSep + 1));
       proposalsAt(code, n, ctx).forEach(row => out.push(row));
     });
     const ord = Object.keys(byCode);
     out.sort((a, b) =>
       ord.indexOf(a.code) - ord.indexOf(b.code)
       || a.n - b.n
       || (a.name === null ? 99 : PEOPLE.indexOf(a.name)) - (b.name === null ? 99 : PEOPLE.indexOf(b.name))
     );
     return out;
   }

   function ownEntries(ctx) {
     const person = ctx && validPerson(ctx.person) ? ctx.person : null;
     if (!person) return [];
     return planEntries(ctx).filter(row => row.name === person);
   }
   ```
3. En `setOp(code, n, vid, prev, variant, prevVariant, name)` y `clearOp(code, n, prev, prevVariant, name)`:
   ```js
   function setOp(code, n, vid, prev, variant, prevVariant, name) {
     if (!validSlot(n)) return null;
     if (prev === vid && (variant || null) === (prevVariant || null)) return null;

     const op = { code, slot: n, to: vid, exp: prev, kind: 'set' };

     if (validPerson(name)) op.name = name;
     if (variant) op.variant = variant;
     op.expVariant = prevVariant || null;
     return op;
   }

   function clearOp(code, n, prev, prevVariant, name) {
     if (!validSlot(n) || !prev) return null;

     const op = { code, slot: n, to: null, exp: prev, kind: 'clear' };

     if (validPerson(name)) op.name = name;
     op.expVariant = prevVariant || null;
     return op;
   }
   ```
4. Exportar `PEOPLE, validPerson, docKey, parseDocKey, proposalsAt, ownVid, ownVariant, ownEntries` en el objeto retornado por `SSBU`.

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/ssbu.ts`:
- Añadir `export interface ProposalRow` (`key`, `code`, `n`, `vid`, `variant`, `name`, `by`, `at`, `unsent`), ampliar `PlanRow` con `key?: string`, `name?: string | null`, `by?: string | null`, `at?: number | null`, `unsent?: boolean`, ampliar `Op` con `name?: string`, y declarar `PEOPLE`, `validPerson`, `docKey`, `parseDocKey`, `proposalsAt`, `ownVid`, `ownVariant`, `ownEntries` y el argumento opcional `name?: string | null` en `setOp` / `clearOp` dentro de `Domain`.

- [ ] **Step 2: Actualizar `src/features/plan/services/sync.ts` conservando los marcadores de `sync_ordering.js`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/services/sync.ts`:

> **Invariante crítica:** Conservar intactos los 5 límites textuales que `tests/unit/sync_ordering.js` extrae con `between(...)`:
> 1. `const confirmedPlan=` … `let PEND=`
> 2. `function planVid(` … `\nfunction planEntries(`
> 3. `async function flush(){` … `// otra persona cambió`
> 4. `const ts=` … `\nasync function startDb(`
> 5. `"sub(f.collection(f.db,'changes'),"` … `\n  sub(f.query`

Aplicar los siguientes cambios en `sync.ts`:
1. Debajo de `const keyOf = (c, n) => c + '_' + n`, añadir:
   ```js
   const PEOPLE = ['Gian', 'Alan', 'Ches', 'Samu']
   const validPerson = (name) => PEOPLE.includes(name)
   const docKey = (c, n, name) => (validPerson(name) ? c + '_' + n + '_' + name : c + '_' + n)
   function parseDocKey(key) {
     const parts = String(key || '').split('_')
     if (parts.length !== 2 && parts.length !== 3) return null
     const slot = Number(parts[1])
     if (!Number.isInteger(slot) || slot < 0 || slot > 7 || !parts[0]) return null
     const name = parts.length === 3 ? parts[2] : null
     if (name !== null && !validPerson(name)) return null
     return { code: parts[0], slot, name }
   }
   let activePerson = validPerson(LS('ssbu_person')) ? LS('ssbu_person') : null
   function getPerson() { return activePerson }
   function setPerson(name) {
     const next = validPerson(name) ? name : null
     if (activePerson === next) return next
     activePerson = next
     LS('ssbu_person', next)
     render(true)
     if (next && PEND.length) flush()
     return next
   }
   ```
2. En el bloque `const confirmedPlan={},removedPlanAt={};` … `let PEND=`:
   ```js
   const confirmedPlan={},removedPlanAt={};
   function confirmPlan(key,vid,after,variant=null,name=null){
    if((PLAN[key]?.at||0)>after||(removedPlanAt[key]||0)>after)return;
    const parsed=parseDocKey(key),person=validPerson(name)?name:(parsed?parsed.name:null);
    confirmedPlan[key]={vid,after,variant,name:person};if(vid)PLAN[key]={vid,variant,...(person?{name:person}:{})};else delete PLAN[key];LS('ssbu_plan_cache',JSON.stringify(PLAN))}
   function mergeChanges(m,changes){
    for(const c of changes)if(c.type==='removed')removedPlanAt[c.doc.id]=ts(c.doc.data().at)||0;
    for(const [key,a] of Object.entries(confirmedPlan)){
     const value=m[key],removed=changes.find(c=>c.doc.id===key&&c.type==='removed'),removedAt=removed?(ts(removed.doc.data().at)||0):null;
     if((value&&((value.vid===a.vid&&(value.variant||null)===(a.variant||null)&&value.at!==null&&value.at>=a.after)||(value.at||0)>a.after))||(removedAt!==null&&(a.vid===null?removedAt>=a.after:removedAt>a.after)))delete confirmedPlan[key];
     else if(a.vid)m[key]={vid:a.vid,variant:a.variant||null,...(a.name?{name:a.name}:{})};else delete m[key];
    }

    return m}
   let PEND=J('ssbu_pend3',[]);
   ```
3. Entre `function planVid(` y `\nfunction planEntries(`:
   ```js
   function proposalsAt(code,n){
    const byAuthor=new Map();
    Object.entries(PLAN).forEach(([k,val])=>{
     const parsed=parseDocKey(k);
     if(!parsed||parsed.code!==code||parsed.slot!==n||!val||!val.vid)return;
     const author=parsed.name||(validPerson(val.name)?val.name:null);
     byAuthor.set(author||'__legacy__',{key:k,code,n,vid:val.vid,variant:val.variant||null,name:author,by:val.by||null,at:val.at??null,unsent:false});
    });
    for(const o of PEND){
     const opName=validPerson(o.name)?o.name:activePerson;
     if(o.code!==code||o.slot!==n||!opName)continue;
     if(o.to)byAuthor.set(opName,{key:docKey(code,n,opName),code,n,vid:o.to,variant:o.variant||null,name:opName,by:null,at:Date.now(),unsent:true});
     else byAuthor.delete(opName);
    }
    const list=Array.from(byAuthor.values());
    list.sort((a,b)=>{
     const aMine=activePerson&&a.name===activePerson?1:0,bMine=activePerson&&b.name===activePerson?1:0;
     if(aMine!==bMine)return bMine-aMine;
     if((b.at||0)!==(a.at||0))return (b.at||0)-(a.at||0);
     const aLeg=a.name===null?1:0,bLeg=b.name===null?1:0;
     if(aLeg!==bLeg)return aLeg-bLeg;
     return PEOPLE.indexOf(a.name)-PEOPLE.indexOf(b.name);
    });
    return list}
   function ownVid(code,n){if(!activePerson)return null;const hit=proposalsAt(code,n).find(x=>x.name===activePerson);return hit?hit.vid:null}
   function ownVariant(code,n){if(!activePerson)return null;const hit=proposalsAt(code,n).find(x=>x.name===activePerson);return hit?(hit.variant||null):null}
   function planVid(code,n){const first=proposalsAt(code,n)[0];return first?first.vid:null}
   function planVariant(code,n){const first=proposalsAt(code,n)[0];return first?(first.variant||null):null}
   function planEntries(){const pairs=new Set();
    Object.keys(PLAN).forEach(k=>{const p=parseDocKey(k);if(p&&byCode[p.code])pairs.add(p.code+'_'+p.slot)});
    PEND.forEach(o=>{if(byCode[o.code]&&Number.isInteger(o.slot)&&o.slot>=0&&o.slot<=7)pairs.add(o.code+'_'+o.slot)});
    const out=[];pairs.forEach(pair=>{const i=pair.lastIndexOf('_'),code=pair.slice(0,i),n=+pair.slice(i+1);proposalsAt(code,n).forEach(r=>out.push(r))});
    const ord=Object.keys(byCode);out.sort((a,b)=>ord.indexOf(a.code)-ord.indexOf(b.code)||a.n-b.n||(a.name===null?99:PEOPLE.indexOf(a.name))-(b.name===null?99:PEOPLE.indexOf(b.name)));return out}
   function ownEntries(){if(!activePerson)return [];return planEntries().filter(r=>r.name===activePerson)}
   ```
   *(Nota: `proposalsAt`, `ownVid` y `ownVariant` van **antes** de `function planVid(` para que `between('function planVid(', '\nfunction planEntries(')` extraiga `planVid` y `planVariant`, y en `sync_ordering.js` extraemos desde `function proposalsAt(` hasta `\nfunction planEntries(`.)*
4. En `flush()` (manteniendo `async function flush(){` … `// otra persona cambió`):
   - En el modo local (`!FBCFG`): usar `const opName = validPerson(o.name) ? o.name : activePerson; if (!opName) return; const k = docKey(o.code, o.slot, opName)` y guardar `name: opName` en `PLAN[k]`.
   - En el bucle `while(PEND.length)`:
     ```js
     const op=PEND[0];
     const opName=validPerson(op.name)?op.name:activePerson;
     if(!opName)break;
     const key=docKey(op.code,op.slot,opName);
     ```
   - En `tx.set(ref, ...)` y `tx.set(h, ...)`: incluir `name:opName`.
   - En `confirmPlan(...)`: `confirmPlan(key,res.conflict?res.cur:op.to,res.observedAt,res.conflict?res.curVariant:(op.variant||null),opName);`
   - En `conflict(op, cur, curVariant)` (debajo de `// otra persona cambió`): preservar `name: op.name || activePerson` al reencolar «Usar la mía».
5. En el listener `sub(f.collection(f.db,'changes'), ...`:
   ```js
   sub(f.collection(f.db,'changes'),s=>{const m={};s.forEach(d=>{const parsed=parseDocKey(d.id);if(!parsed)return;const v=d.data();const author=parsed.name||(validPerson(v.name)?v.name:null);m[d.id]={vid:v.vid,variant:v.variant||null,name:author,by:v.by,at:ts(v.at)}});const next=mergeChanges(m,s.docChanges());const same=stable(PLAN)===stable(next);PLAN=next;LS('ssbu_plan_cache',JSON.stringify(PLAN));
    good();paintSync();if(!same)render(true);planLoaded=true;flush()});
   ```
   Y en `history` incluir `name: v.name || null`.
6. Exportar también `docKey`, `parseDocKey`, `proposalsAt`, `ownVid`, `ownVariant`, `ownEntries`, `getPerson`, `setPerson` y `activePerson` en `state`.

- [ ] **Step 3: Actualizar `lookup.ts`, `usePlan.ts`, `useSummarySheet.ts` y `SummarySheet.vue`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/helpers/lookup.ts`:
- Actualizar `isUnsent(code: string, slot: number, name?: string | null)`:
  ```ts
  interface PendOp {
    code: string
    slot: number
    name?: string | null
  }

  export const isUnsent = (code: string, slot: number, name?: string | null) =>
    (state.PEND as PendOp[]).some(
      (op) => op.code === code && op.slot === slot && (name === undefined || (op.name || state.activePerson) === name),
    )
  ```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePlan.ts`:
- Importar `bindPersonSync`, `requirePerson`, `syncStoredPerson` desde `./usePerson`, `PersonName` desde `../enums/PersonName`, y `docKey`, `getPerson`, `ownEntries`, `ownVariant`, `ownVid`, `proposalsAt`, `setPerson` desde `../services/sync`.
- Enlazar `bindPersonSync((person) => { setPerson(person) })` en la inicialización del módulo.
- Implementar `commitProposal` y `proposeAt`:
  ```ts
  const commitProposal = (person: PersonName, code: string, slot: number, vid: string, variant: string | null): boolean => {
    const prev = ownVid(code, slot) as string | null
    const prevVariant = ownVariant(code, slot) as string | null

    if (variant === null && vid === prev && prevVariant) return false

    const block = SSBU.assignBlock(ownEntries() as PlanRow[], code, slot, vid, variant)

    if (['duplicate', 'same', 'bad-slot'].includes(block.kind)) return false

    const op = SSBU.setOp(code, slot, vid, prev, variant, prevVariant, person)

    if (!op) return false

    touched[docKey(code, slot, person)] = Date.now()
    touched[keyOf(code, slot)] = Date.now()
    enqueue(op)

    return true
  }

  export const proposeAt = (code: string, slot: number, vid: string, variant: string | null = null): boolean => {
    if (!SSBU.validSlot(slot)) return false

    let saved = false

    const hasPerson = requirePerson((person) => {
      saved = commitProposal(person, code, slot, vid, variant)
    })

    if (!hasPerson) return false

    return saved
  }

  export const clearAt = (code: string, slot: number): boolean => {
    const person = getPerson() as PersonName | null

    if (!person) return false

    const prev = ownVid(code, slot) as string | null
    const prevVariant = ownVariant(code, slot) as string | null
    const op = SSBU.clearOp(code, slot, prev, prevVariant, person)

    if (!op) return false

    touched[docKey(code, slot, person)] = Date.now()
    touched[keyOf(code, slot)] = Date.now()
    enqueue(op)

    return true
  }
  ```
- En `exportPlan()`, añadir `name: entry.name || null` y `person: PlanHelper.personLabel(entry.name)` en cada elemento de `changes`, y `name: row.name || null` en `history`.
- En `publish()`, exponer también:
  ```ts
  host.proposalsAt = proposalsAt
  host.ownVid = ownVid
  host.ownVariant = ownVariant
  host.ownEntries = ownEntries
  host.docKey = docKey
  host.getPerson = getPerson
  host.setPerson = (name: string | null) => {
    syncStoredPerson(name)

    return getPerson()
  }
  ```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useSummarySheet.ts` y `SummarySheet.vue`:
- Usar `rowKey = row.key || docKey(row.code, row.n, row.name || undefined)` en lugar de `keyOf(row.code, row.n)` para que dos propuestas en el mismo traje no colisionen en `v-for`.
- Usar `PlanHelper.originOfPerson(row.name, activePerson.value, unsent)` para clasificar entre `Sin enviar`, `Tuyas` y `De otros`, y `PlanHelper.personLabel(row.name)` como `author` (`Gian`, `Alan`, `Ches`, `Samu` u `Otros`).
- Añadir `canUndo: Boolean(activePerson.value && row.name === activePerson.value)` en `SummaryRow`, y en `SummarySheet.vue` renderizar el botón `srow__x` (`:data-undo="row.key"`) **únicamente cuando `row.canUndo` es `true`** (eliminando el flujo antiguo de borrar propuestas ajenas, ya que cada amigo solo deshace las suyas y los documentos legacy sin `name` son de solo lectura).

- [ ] **Step 4: Actualizar `tests/unit/test_domain.mjs` y `tests/unit/sync_ordering.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_domain.mjs`, añadir pruebas para:
   - `docKey` y `parseDocKey` con `'01_2_Gian'` (`{ code: '01', slot: 2, name: 'Gian' }`), legacy `'01_2'` (`{ code: '01', slot: 2, name: null }`) y nombres fuera de lista (`'01_2_Otro'` → `null`).
   - `proposalsAt`, `ownVid` y `planVid`: con `PLAN = { '01_0_Alan': { vid: '01:100', at: 20 }, '01_0': { vid: '01:200', at: 10 } }` y `person: 'Gian'`, `ownVid('01', 0, ctx)` es `null` (no bloquea ni confunde el guardado de Gian), mientras `planVid('01', 0, ctx)` devuelve `'01:100'` en lectura y `proposalsAt('01', 0, ctx)` devuelve ambas propuestas; cuando Gian añade `'01_0_Gian'`, `ownVid` y `planVid` pasan a devolver la de Gian primero.
   - `assignBlock(ownEntries(ctx), ...)` permite a Gian proponer en `c01` un `vid` que Alan ya tiene en `c00`, pero bloquea a Gian si el propio Gian ya lo tiene en `c00`.
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/sync_ordering.js`:
   - Actualizar `planVidSource = between('function proposalsAt(', '\nfunction ownEntries(');` (o hasta `\nfunction planEntries(` incluyendo `proposalsAt`, `ownVid`, `ownVariant`, `planVid`, `planVariant`).
   - Definir `const key = '82_0_Gian';`, `stored = (vid, at = 1, name = 'Gian') => ({ code: '82', slot: 0, vid, name, by: 'fixture-user', at: timestamp(at) });`, y añadir en `context`: `PEOPLE: ['Gian', 'Alan', 'Ches', 'Samu']`, `activePerson: 'Gian'`, `validPerson: n => ['Gian', 'Alan', 'Ches', 'Samu'].includes(n)`, `docKey: (c, n, p) => p ? `${c}_${n}_${p}` : `${c}_${n}``, `parseDocKey` (o extraer `const keyHelpers = between('const PEOPLE =', 'const byCode =')` directamente de `sync.ts` para probar el código real sin duplicarlo).
   - Cambiar `'01_1'` en las 2 pruebas de actualización remota no relacionada a `'01_1_Alan'` (`stored('X', 2, 'Alan')`) y añadir una prueba nueva: un snapshot o edición de `'82_0_Alan'` nunca pisa ni entra en conflicto con `'82_0_Gian'`, y un documento legacy `'82_0'` sin `name` coexiste en `PLAN['82_0']` con `name: null`.

- [ ] **Step 5: Ejecutar pruebas unitarias JS/TS, `typecheck` y `self-check.mjs`, y commitear Task 3**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/test_domain.mjs tests/unit/sync_ordering.js tests/unit/test_contrast.mjs
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins add src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts src/features/plan/services/sync.ts src/features/plan/helpers/lookup.ts src/features/plan/composables/usePlan.ts src/features/fighters/composables/useSummarySheet.ts src/features/fighters/components/SummarySheet.vue tests/unit/test_domain.mjs tests/unit/sync_ordering.js
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(sync): isolate proposals, blocks, and undo per person"
```
Expected: todas las pruebas de `test_domain.mjs`, `sync_ordering.js` y `test_contrast.mjs` en verde, `vue-tsc --noEmit` limpio y `Self-check TS: 0 pendientes`.

---

### Task 4: Pruebas end-to-end (`tests/e2e/*`), gate perezoso, reglas en emulador y cierre

**Files:**
- Modify: `tests/e2e/lib.js`
- Modify: `tests/e2e/ack-transition.js`
- Modify: `tests/e2e/sync-errors.js`
- Modify: `tests/e2e/recorridos.js`
- Modify: `tests/e2e/local.spec.js`

- [ ] **Step 1: Actualizar `tests/e2e/lib.js`, `ack-transition.js` y `sync-errors.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/lib.js`:
   - En `mk(b, { w = 390, h = 844, mobile = true, badImg = false, noFirebase = false, deferChanges = false, person = 'Gian' } = {})`, antes de crear la página (`ctx.newPage()`), si `person` no es `null`:
     ```js
     if (person) await ctx.addInitScript(name => { try { localStorage.setItem('ssbu_person', name); } catch (_) {} }, person);
     ```
     De este modo, `perf.js`, `identity.js`, `ack-transition.js`, `sync-errors.js` y el cliente `A` de `recorridos.js` operan como `'Gian'`, mientras que cualquier prueba puede pasar `{ person: 'Alan' }` o `{ person: null }` para ejercitar otra persona o el gate perezoso sin persona guardada.
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/ack-transition.js`:
   - Actualizar `PLAN['82_0']` → `PLAN['82_0_Gian']` y `[data-undo="82_0"]` → `[data-undo="82_0_Gian"]`.
3. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/sync-errors.js`:
   - En la línea 24 (`PEND.push(...)`), incluir `name: 'Gian'`: `PEND.push({ code: '01', slot: 5, name: 'Gian', to: '01:no-existe', exp: null, kind: 'set' })`.

- [ ] **Step 2: Actualizar `tests/e2e/recorridos.js` y `tests/e2e/local.spec.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/recorridos.js`:
   - Crear el cliente `B` con `const B = await mk(b, { w: 390, h: 844, person: 'Alan' });`.
   - En la sección final de propuestas entre amigos (líneas 124–140):
     - `B` (`Alan`) propone en `('02', 1, byCode['02'].picks[0].vid)` y `A` (`Gian`) también propone en `('02', 1, byCode['02'].picks[1].vid)`: comprobar que `proposalsAt('02', 1)` tiene **2** propuestas (`Gian` primero en `A`, `Alan` segundo) sin pisarse.
     - En `#/cambios` sobre `A`, comprobar que `[data-section="mine"] [data-undo="02_1_Gian"]` existe (1), mientras `[data-section="friend"] [data-undo="02_1_Alan"]` es `0` (solo lectura: `A` no puede borrar la propuesta de `Alan`).
   - Añadir un cliente `C = await mk(b, { w: 390, h: 844, person: null })` para probar el **gate perezoso** y las **reglas de Firestore**:
     - Navegar a `#/luchadores` y `#/luchador/01/3`: comprobar que `C.getByRole('dialog', { name: '¿Quién propone?' })` está oculto (`count() === 0`).
     - Tocar la primera skin y pulsar `[data-act]`: comprobar que se abre `¿Quién propone?` sin escribir aún en `PEND`, pulsar `[data-person="Ches"]` y comprobar que el diálogo se cierra y `PLAN['01_2_Ches']` llega al emulador.
     - Ejecutar `L.raw(C, async (f, t) => { ... })` comprobando:
       1. `setDoc(doc(f.db, 'changes', '01_0'), ...)` sin `name` → rechazado (`permission-denied`).
       2. `setDoc(doc(f.db, 'changes', '01_0_Otro'), { ..., name: 'Otro' })` → rechazado (`permission-denied`).
       3. `setDoc(doc(f.db, 'changes', '01_0_Gian'), { ..., name: 'Alan' })` (ID distinto de `name`) → rechazado (`permission-denied`).
       4. Sembrar con Python Admin un documento legacy `changes/01_7` sin `name` y comprobar que `deleteDoc(doc(f.db, 'changes', '01_7'))` desde el cliente es rechazado (`permission-denied`) mientras `proposalsAt('01', 7)` lo sigue leyendo con `name === null`.
     - Cerrar `C.ctx.close()`.
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/local.spec.js`:
   - Añadir al principio un `test.beforeEach` que siembre `localStorage.setItem('ssbu_person', 'Gian')` mediante `page.addInitScript` salvo cuando el título del test incluya `'gate perezoso'`.
   - Añadir un test `'gate perezoso: navegar no abre la hoja; guardar sin persona pide elegir y completa la propuesta'` que verifique el flujo completo en local y el cambio posterior desde `Más opciones` → `Cambiar persona (Samu)`.

- [ ] **Step 3: Ejecutar validación completa del repositorio y commitear Task 4**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && python3 -m unittest discover -s tests/unit -p 'test_*.py'
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/*.mjs tests/unit/*.js
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run build
cd /Users/gian/Desktop/ssbu/ssbu-skins && (cd tests && npx playwright test e2e/local.spec.js --config=playwright.local.config.js)
cd /Users/gian/Desktop/ssbu/ssbu-skins && bash tests/run.sh --sin-webkit
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tests/e2e/lib.js tests/e2e/ack-transition.js tests/e2e/sync-errors.js tests/e2e/recorridos.js tests/e2e/local.spec.js
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "test(e2e): verify lazy person gate, friend isolation, and firestore rules"
```
Expected: `typecheck` sin errores, `unittest` OK, `node --test` OK, `local.spec.js` OK, `tests/run.sh --sin-webkit` con `0 fallos` (incluyendo `perf.js` con `LCP <= 2500 ms` y `CLS <= 0.05`) y `Self-check TS: 0 pendientes`.

---

## Orden de despliegue y entrega (bloqueado hasta OK de Gian)

1. **Antes de fusionar el PR en `master`:** pedir autorización explícita a Gian para publicar primero `firestore.rules` en Firebase (`ssbu-441b1`), ya que el cliente nuevo escribe en `changes/{code}_{slot}_{name}` con el campo `name` e `history` con `name`.
2. Con `firestore.rules` publicadas y CI («Pruebas») en verde, fusionar `feat/fase3-propuestas-persona` en `master` para que Vercel despliegue la aplicación actualizada sin ventana de error de permisos.
