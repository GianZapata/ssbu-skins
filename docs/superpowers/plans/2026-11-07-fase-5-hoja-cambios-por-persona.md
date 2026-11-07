# Fase 5 — Hoja `Cambios · N` por persona Implementation Plan

> **For agentic workers:** Ejecutar tarea por tarea verificando cada comando real del repositorio antes de cada commit. Trabajar en una rama dedicada desde `master` (`feat/fase5-cambios-por-persona`), asumiendo las Fases 1 a 4 ya fusionadas en `master`. Si al ejecutar encuentras una discrepancia menor de entorno o líneas vecinas, corrígela en el acto manteniendo intactos los contratos, las pruebas y `Self-check TS: 0 pendientes`. Nunca añadas `Co-Authored-By` ni atribución de IA en los commits; usa únicamente Conventional Commits. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Rediseñar la hoja `Cambios · N` (`#/cambios`) con `vaul-vue` en móvil (`< 1024 px`) y `QDialog` en escritorio (`≥ 1024 px`), organizándola en pestañas accesibles por persona: pestaña `Mías` con `Deshacer` a un toque, pestañas dinámicas de solo lectura por cada amigo con propuestas (`Gian`, `Alan`, `Ches`, `Samu` distinto de la persona activa) y pestaña `Otros` (también en solo lectura) cuando existan propuestas legacy sin `name`, mostrando miniaturas `actual → propuesta` con el retrato real de la variante elegida (o `Sin retrato` si carece de él), fecha y salto directo a `#/luchador/<code>/<traje>`.

**Architecture:** `useSummarySheet.ts` agrupa `planGroups()` por pestaña usando `SummaryTabKind` (`Mine`, `Person`, `Legacy`), reutiliza `CostumeHelper.proposalThumbOf(code, vid, variant)` de la Fase 4 para resolver el retrato exacto de la variante verificada sin inventar imágenes, mantiene navegación por teclado Roving `tabindex` (`ArrowLeft`, `ArrowRight`, `Home`, `End`) sobre `role="tablist"` / `role="tab"` / `role="tabpanel"` y anima el subrayado activo con `<MotionSpan layout-id="summary-tab-indicator" />`. Al migrar este último diálogo móvil a `vaul-vue`, se eliminan `src/composables/useFocusLoop.ts` y `src/features/plan/enums/ProposalOrigin.ts` sin consumidores restantes.

**Tech Stack:** Vue 3.5, `vaul-vue`, `motion-v`, Quasar (`QDialog` en escritorio), TypeScript 5.9 (`gian-how-i-code` + `gian-ts-style`), Node `node:test`, Playwright (`tests/run.sh`).

---

## Mapa de archivos

- **Crear:**
  - `src/features/fighters/enums/SummaryTabKind.ts` — Conjunto cerrado `APP_OWNED`: `Mine = 'mine'`, `Person = 'person'`, `Legacy = 'legacy'`.
- **Modificar:**
  - `src/features/plan/helpers/plan.helper.ts` — Retira la clasificación antigua `ProposalOrigin` (`Tuyas` / `De otros` / `Sin enviar`) y conserva `people`, `isPersonName`, `personLabel` y `whenLabel`.
  - `src/features/fighters/composables/useSummarySheet.ts` — Construye las pestañas `Mías`, `<Persona>` y `Otros`, resuelve retratos de variante con `CostumeHelper.proposalThumbOf`, expone navegación de pestañas accesible con Roving `tabindex`, `Deshacer` a un toque exclusivo en `Mías` y salto a `#/luchador/<code>/<traje>`.
  - `src/features/fighters/components/SummarySheet.vue` — Migra móvil (`< 1024 px`) a `vaul-vue` y escritorio (`≥ 1024 px`) a `QDialog`, renderiza `tablist` + `MotionSpan` (`layout-id="summary-tab-indicator"`) + `tabpanel` y oculta cualquier acción de borrado fuera de `Mías`.
  - `src/app.css` — Añade estilos de `.summary-tabs`, `.summary-tab`, `.summary-tab__line`, `.summary-panel` y badge `.srow__unsent`, conservando intactos todos los tokens `:root` validados por `tests/unit/test_contrast.mjs`.
  - `tests/e2e/recorridos.js`, `tests/e2e/ack-transition.js`, `tests/e2e/local.spec.js`, `tests/e2e/visual.spec.js` — Verifica pestaña `Mías` con `Deshacer` directo, pestañas de amigos y `Otros` en estricto solo lectura, navegación por teclado entre pestañas, retrato de variante y salto al traje al tocar la fila.
- **Eliminar:**
  - `src/composables/useFocusLoop.ts` — Último consumidor (`SummarySheet.vue`) migrado a `vaul-vue` / `QDialog`.
  - `src/features/plan/enums/ProposalOrigin.ts` — Reemplazado por `SummaryTabKind` y separación real por persona.
- **No tocar:**
  - `/Volumes/SWITCH SD`, `Gian-Ultimate-Modpack-private`, `~/Documents/smash-mod-assets`, `firestore.rules` (ya desplegadas en Fase 3).

## Sin datos todavía y texto de la referencia que no se publica

- **Sin datos todavía:**
  - Las propuestas legacy en `changes/{code}_{slot}` sin campo `name` se agrupan automáticamente en la pestaña `Otros` en modo solo lectura (`canUndo: false`, sin botón de deshacer).
  - Si una propuesta apunta a una variante cuyo `portrait` en `drive-alts.json` es `null`, `toImg` recibe `null` y `AppImg` muestra `Sin retrato` sin sustituirlo por la miniatura de otro color del pack.
- **Texto de la referencia que no se publica:**
  - No se publican rótulos internos del plan (`Fase 5`, `legacy`, `Roving tabindex`, `vaul-vue`); las pestañas usan únicamente `Mías`, los nombres reales (`Gian`, `Alan`, `Ches`, `Samu`) y `Otros`.

---

### Task 1: `SummaryTabKind`, limpieza de `PlanHelper` y refactor de `useSummarySheet.ts`

**Files:**
- Create: `src/features/fighters/enums/SummaryTabKind.ts`
- Delete: `src/features/plan/enums/ProposalOrigin.ts`
- Modify: `src/features/plan/helpers/plan.helper.ts`
- Modify: `src/features/fighters/composables/useSummarySheet.ts`

- [ ] **Step 1: Crear rama desde `master`, añadir `SummaryTabKind.ts` y limpiar `ProposalOrigin`**

Run:
```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout master
git -C /Users/gian/Desktop/ssbu/ssbu-skins pull --ff-only
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout -b feat/fase5-cambios-por-persona
rm -f /Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/enums/ProposalOrigin.ts
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/enums/SummaryTabKind.ts`:

```ts
export enum SummaryTabKind {
  Mine = 'mine',
  Person = 'person',
  Legacy = 'legacy',
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/helpers/plan.helper.ts` por:

```ts
import { PersonName } from '../enums/PersonName'

export class PlanHelper {
  static readonly people: readonly PersonName[] = [
    PersonName.Gian,
    PersonName.Alan,
    PersonName.Ches,
    PersonName.Samu,
  ]

  static isPersonName(value: unknown): value is PersonName {
    return (this.people as readonly unknown[]).includes(value)
  }

  static personLabel(name: string | null | undefined): string {
    if (this.isPersonName(name)) return name

    return 'Otros'
  }

  static whenLabel(at: number | null | undefined): string {
    if (at == null) return ''

    return new Date(at).toLocaleString('es')
  }
}
```

- [ ] **Step 2: Reescribir `src/features/fighters/composables/useSummarySheet.ts` con pestañas por persona y retrato de variante**

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useSummarySheet.ts` por:

```ts
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { back, fighterHash, fighterOf, route, swap, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { currentName } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { clearAt, planGroups } from '../../plan/composables/usePlan'
import { usePerson } from '../../plan/composables/usePerson'
import type { PersonName } from '../../plan/enums/PersonName'
import { curOf, isUnsent, skinOf } from '../../plan/helpers/lookup'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { useSaveStatus } from '../../plan/saveStatus'
import { docKey } from '../../plan/services/sync'
import { SummaryTabKind } from '../enums/SummaryTabKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface SummaryRow {
  code: string
  n: number
  key: string
  t: string
  from: string
  to: string
  fromImg: string | null
  toImg: string | null
  label: string
  quitar: string
  personName: PersonName | null
  author: string
  when: string
  unsent: boolean
  canUndo: boolean
}

export interface SummaryGroup {
  code: string
  name: string
  portrait: string | null
  rows: SummaryRow[]
}

export interface SummaryTab {
  id: string
  kind: SummaryTabKind
  label: string
  count: number
  canUndo: boolean
  groups: SummaryGroup[]
}

const variantSuffix = (variant?: string | null): string => {
  if (!variant) return ''

  const match = /:c0([0-7])$/.exec(variant)

  return match ? ' · Color ' + (Number(match[1]) + 1) : ''
}

const filterGroups = (
  groups: SummaryGroup[],
  predicate: (row: SummaryRow) => boolean,
): SummaryGroup[] =>
  groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(predicate),
    }))
    .filter((group) => group.rows.length > 0)

const countRows = (groups: SummaryGroup[]): number =>
  groups.reduce((acc, group) => acc + group.rows.length, 0)

const buildTabs = (
  allGroups: SummaryGroup[],
  currentPerson: PersonName | null,
): SummaryTab[] => {
  if (!allGroups.length) return []

  const tabs: SummaryTab[] = []
  const mineGroups = currentPerson
    ? filterGroups(allGroups, (row) => row.personName === currentPerson)
    : []

  tabs.push({
    id: 'mine',
    kind: SummaryTabKind.Mine,
    label: 'Mías',
    count: countRows(mineGroups),
    canUndo: true,
    groups: mineGroups,
  })

  PlanHelper.people.forEach((person) => {
    if (person === currentPerson) return

    const personGroups = filterGroups(allGroups, (row) => row.personName === person)
    const count = countRows(personGroups)

    if (!count) return

    tabs.push({
      id: 'person:' + person,
      kind: SummaryTabKind.Person,
      label: person,
      count,
      canUndo: false,
      groups: personGroups,
    })
  })

  const legacyGroups = filterGroups(allGroups, (row) => row.personName === null)
  const legacyCount = countRows(legacyGroups)

  if (legacyCount > 0) {
    tabs.push({
      id: 'legacy',
      kind: SummaryTabKind.Legacy,
      label: 'Otros',
      count: legacyCount,
      canUndo: false,
      groups: legacyGroups,
    })
  }

  return tabs
}

export const useSummarySheet = () => {
  const activeTabId = ref('mine')
  const keptTabs = shallowRef<SummaryTab[]>([])
  const tabRefs = shallowRef<Array<HTMLButtonElement | null>>([])

  const desktop = useDesktop()
  const { saving, saved, savedHere } = useSaveStatus()
  const { activePerson, openPersonSheet } = usePerson()

  const isOpen = computed(() => {
    tick.value

    return route.value.v === 'cambios'
  })

  const groups = computed<SummaryGroup[]>(() => {
    tick.value

    const person = activePerson.value

    return planGroups().map((group) => ({
      code: group.fighter.code,
      name: group.fighter.name,
      portrait: group.fighter.portrait || null,
      rows: group.rows.map((row): SummaryRow => {
        const cur = curOf(row.code, row.n)
        const skin = skinOf(row.vid)
        const from = currentName(cur)
        const to = (skin ? skin.name : row.vid) + variantSuffix(row.variant)
        const shown = cur?.kind === 'original' ? 'Original' : from
        const personName = PlanHelper.isPersonName(row.name) ? row.name : null
        const key = row.key || docKey(row.code, row.n, personName || undefined)
        const unsent = Boolean(row.unsent) || (personName !== null && isUnsent(row.code, row.n, personName))
        const canUndo = Boolean(person && personName === person)

        return {
          code: row.code,
          n: row.n,
          key,
          t: trajeName(row.n),
          from: shown,
          to,
          fromImg: cur ? cur.img : null,
          toImg: CostumeHelper.proposalThumbOf(row.code, row.vid, row.variant),
          label: `${group.fighter.name}, ${trajeName(row.n)}: ${shown || 'Original'} cambia a ${to}`,
          quitar: `Deshacer propuesta en ${trajeName(row.n)} de ${group.fighter.name}`,
          personName,
          author: PlanHelper.personLabel(personName),
          when: PlanHelper.whenLabel(row.at ?? null),
          unsent,
          canUndo,
        }
      }),
    }))
  })

  const liveTabs = computed(() => buildTabs(groups.value, activePerson.value))

  const tabs = computed(() => (isOpen.value ? liveTabs.value : keptTabs.value))

  const empty = computed(() => isOpen.value && !groups.value.length)

  const currentTab = computed<SummaryTab | null>(() => {
    const list = tabs.value

    if (!list.length) return null

    return list.find((tab) => tab.id === activeTabId.value) ?? list[0] ?? null
  })

  const setTabRef = (index: number, element: unknown) => {
    tabRefs.value[index] = element instanceof HTMLButtonElement ? element : null
  }

  const selectTab = (tabId: string) => {
    activeTabId.value = tabId
  }

  const onTabKeydown = (event: KeyboardEvent, index: number) => {
    const list = tabs.value

    if (!list.length) return

    let next = -1

    if (event.key === 'ArrowRight') next = (index + 1) % list.length
    else if (event.key === 'ArrowLeft') next = (index + list.length - 1) % list.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = list.length - 1

    if (next < 0) return

    const target = list[next]

    if (!target) return

    event.preventDefault()
    activeTabId.value = target.id
    void nextTick(() => {
      tabRefs.value[next]?.focus()
    })
  }

  const close = () => {
    if (route.value.v === 'cambios') back()
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen.value) close()
  }

  const goTo = (code: string, n: number) => {
    if (!fighterOf(code)) return

    swap(fighterHash(code, n))
  }

  const undo = (row: SummaryRow) => {
    if (!row.canUndo) return

    clearAt(row.code, row.n)
  }

  const chooseIdentity = () => {
    openPersonSheet()
  }

  watch(
    isOpen,
    (openNow) => {
      if (!openNow) return

      const list = liveTabs.value
      const mine = list.find((tab) => tab.id === 'mine')

      if (mine && mine.count > 0) {
        activeTabId.value = 'mine'

        return
      }

      const firstNonEmpty = list.find((tab) => tab.count > 0) ?? list[0]

      if (firstNonEmpty) activeTabId.value = firstNonEmpty.id
    },
    { immediate: true },
  )

  watch(
    liveTabs,
    (list) => {
      if (list.length) keptTabs.value = list

      if (list.length && !list.some((tab) => tab.id === activeTabId.value)) {
        const fallback = list.find((tab) => tab.count > 0) ?? list[0]

        if (fallback) activeTabId.value = fallback.id
      }
    },
    { immediate: true },
  )

  return {
    desktop,
    saving,
    saved,
    savedHere,
    activePerson,
    isOpen,
    tabs,
    currentTab,
    empty,
    setTabRef,
    selectTab,
    onTabKeydown,
    close,
    onOpenChange,
    goTo,
    undo,
    chooseIdentity,
  }
}
```

- [ ] **Step 3: Verificar `self-check.mjs` sobre `SummaryTabKind.ts`, `plan.helper.ts` y `useSummarySheet.ts`**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs --all src/features/fighters/enums/SummaryTabKind.ts src/features/plan/helpers/plan.helper.ts src/features/fighters/composables/useSummarySheet.ts
```
Expected: `Self-check TS: 0 pendientes`.

---

### Task 2: `SummarySheet.vue` en `vaul-vue` / `QDialog`, eliminación de `useFocusLoop.ts` y estilos de pestañas

**Files:**
- Modify: `src/features/fighters/components/SummarySheet.vue`
- Delete: `src/composables/useFocusLoop.ts`
- Modify: `src/app.css`

- [ ] **Step 1: Eliminar `src/composables/useFocusLoop.ts` y reescribir `src/features/fighters/components/SummarySheet.vue`**

1. Eliminar `/Users/gian/Desktop/ssbu/ssbu-skins/src/composables/useFocusLoop.ts`:
   ```bash
   rm -f /Users/gian/Desktop/ssbu/ssbu-skins/src/composables/useFocusLoop.ts
   ```
2. Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/components/SummarySheet.vue` por:

```vue
<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import { QBtn, QDialog, QIcon } from 'quasar'
import {
  DrawerClose,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'
import AppImg from '../../../components/AppImg.vue'
import { useSummarySheet } from '../composables/useSummarySheet'

const MotionSpan = motion.span

const {
  desktop,
  saving,
  saved,
  savedHere,
  activePerson,
  isOpen,
  tabs,
  currentTab,
  empty,
  setTabRef,
  selectTab,
  onTabKeydown,
  close,
  onOpenChange,
  goTo,
  undo,
  chooseIdentity,
} = useSummarySheet()
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    class="sheet-dialog"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--list" role="dialog" aria-labelledby="summary-sheet-title">
      <div class="sheet__head">
        <h2 id="summary-sheet-title" class="sheet__h">Cambios</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="close" />
      </div>

      <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
      <p v-else-if="saved" class="sheet__line" role="status">Propuesta guardada</p>
      <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo, sin enviar</p>

      <div v-if="empty" class="sheet__empty empty" role="status">
        <q-icon name="inventory_2" size="44px" aria-hidden="true" />
        <b>Aún no hay propuestas</b>
        <q-btn unelevated no-caps class="btn-main" label="Elegir skin" @click="close" />
      </div>

      <template v-else-if="currentTab">
        <LayoutGroup id="summary-tabs-desktop">
          <div class="summary-tabs" role="tablist" aria-label="Propuestas por persona">
            <button
              v-for="(tab, index) in tabs"
              :key="tab.id"
              :ref="(el) => setTabRef(index, el)"
              :id="'summary-tab-d-' + tab.id"
              type="button"
              role="tab"
              class="summary-tab"
              :class="{ 'summary-tab--on': tab.id === currentTab.id }"
              :aria-selected="tab.id === currentTab.id"
              :aria-controls="'summary-panel-d-' + tab.id"
              :tabindex="tab.id === currentTab.id ? 0 : -1"
              :data-tab="tab.id"
              @click="selectTab(tab.id)"
              @keydown="onTabKeydown($event, index)"
            >
              <span>{{ tab.label }} · {{ tab.count }}</span>
              <MotionSpan
                v-if="tab.id === currentTab.id"
                layout-id="summary-tab-indicator-desktop"
                class="summary-tab__line"
                aria-hidden="true"
              />
            </button>
          </div>
        </LayoutGroup>

        <div
          :id="'summary-panel-d-' + currentTab.id"
          role="tabpanel"
          class="sheet__scroll summary-panel"
          :aria-labelledby="'summary-tab-d-' + currentTab.id"
          :data-section="currentTab.kind"
        >
          <p class="sheet__note">Gian revisa las propuestas y decide cuáles instala.</p>

          <div v-if="!currentTab.groups.length" class="summary-panel__empty" role="status">
            <p v-if="!activePerson">Elige tu nombre para separar tus propuestas de las de tus amigos.</p>
            <p v-else>Aún no tienes propuestas guardadas.</p>
            <button v-if="!activePerson" type="button" class="btn-main" @click="chooseIdentity">
              Elegir persona
            </button>
          </div>

          <div v-for="group in currentTab.groups" :key="currentTab.id + ':' + group.code" class="grp">
            <div class="grp__head">
              <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
              <span class="grp__name">{{ group.name }}</span>
            </div>

            <div v-for="row in group.rows" :key="row.key" class="srow">
              <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
                <span class="srow__from"><AppImg :src="row.fromImg" :missing="row.fromImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
                <span class="srow__to"><AppImg :src="row.toImg" :missing="row.toImg ? '' : 'Sin retrato'" fit="contain" /></span>
                <span class="srow__txt">
                  <span class="srow__t">{{ row.t }}</span>
                  <span class="srow__new">{{ row.to }}</span>
                  <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
                  <span v-if="row.unsent" class="srow__unsent">Sin enviar</span>
                  <span v-else-if="row.when" class="srow__who">{{ row.when }}</span>
                </span>
              </button>

              <button
                v-if="currentTab.canUndo && row.canUndo"
                type="button"
                class="srow__x"
                :aria-label="row.quitar"
                :data-undo="row.key"
                @click="undo(row)"
              >
                Deshacer
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-dialog>

  <DrawerRoot v-else :open="isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent class="vaul-sheet sheet sheet--list" aria-label="Cambios">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle class="sheet__h">Cambios</DrawerTitle>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <p v-if="saving" class="sheet__line" role="status">Guardando…</p>
        <p v-else-if="saved" class="sheet__line" role="status">Propuesta guardada</p>
        <p v-else-if="savedHere" class="sheet__line" role="status">Guardada en este dispositivo, sin enviar</p>

        <div v-if="empty" class="sheet__empty empty" role="status">
          <q-icon name="inventory_2" size="44px" aria-hidden="true" />
          <b>Aún no hay propuestas</b>
          <q-btn unelevated no-caps class="btn-main" label="Elegir skin" @click="close" />
        </div>

        <template v-else-if="currentTab">
          <LayoutGroup id="summary-tabs-mobile">
            <div class="summary-tabs" role="tablist" aria-label="Propuestas por persona">
              <button
                v-for="(tab, index) in tabs"
                :key="tab.id"
                :ref="(el) => setTabRef(index, el)"
                :id="'summary-tab-m-' + tab.id"
                type="button"
                role="tab"
                class="summary-tab"
                :class="{ 'summary-tab--on': tab.id === currentTab.id }"
                :aria-selected="tab.id === currentTab.id"
                :aria-controls="'summary-panel-m-' + tab.id"
                :tabindex="tab.id === currentTab.id ? 0 : -1"
                :data-tab="tab.id"
                @click="selectTab(tab.id)"
                @keydown="onTabKeydown($event, index)"
              >
                <span>{{ tab.label }} · {{ tab.count }}</span>
                <MotionSpan
                  v-if="tab.id === currentTab.id"
                  layout-id="summary-tab-indicator-mobile"
                  class="summary-tab__line"
                  aria-hidden="true"
                />
              </button>
            </div>
          </LayoutGroup>

          <div
            :id="'summary-panel-m-' + currentTab.id"
            role="tabpanel"
            class="sheet__scroll summary-panel"
            :aria-labelledby="'summary-tab-m-' + currentTab.id"
            :data-section="currentTab.kind"
          >
            <p class="sheet__note">Gian revisa las propuestas y decide cuáles instala.</p>

            <div v-if="!currentTab.groups.length" class="summary-panel__empty" role="status">
              <p v-if="!activePerson">Elige tu nombre para separar tus propuestas de las de tus amigos.</p>
              <p v-else>Aún no tienes propuestas guardadas.</p>
              <button v-if="!activePerson" type="button" class="btn-main" @click="chooseIdentity">
                Elegir persona
              </button>
            </div>

            <div v-for="group in currentTab.groups" :key="currentTab.id + ':' + group.code" class="grp">
              <div class="grp__head">
                <span class="grp__face"><AppImg :src="group.portrait" fit="contain" /></span>
                <span class="grp__name">{{ group.name }}</span>
              </div>

              <div v-for="row in group.rows" :key="row.key" class="srow">
                <button type="button" class="srow__go" :aria-label="row.label" @click="goTo(row.code, row.n)">
                  <span class="srow__from"><AppImg :src="row.fromImg" :missing="row.fromImg ? '' : 'Sin retrato'" fit="contain" /></span>
                  <q-icon name="east" size="18px" class="srow__arrow" aria-hidden="true" />
                  <span class="srow__to"><AppImg :src="row.toImg" :missing="row.toImg ? '' : 'Sin retrato'" fit="contain" /></span>
                  <span class="srow__txt">
                    <span class="srow__t">{{ row.t }}</span>
                    <span class="srow__new">{{ row.to }}</span>
                    <span v-if="row.from" class="srow__old">Sustituye a {{ row.from }}</span>
                    <span v-if="row.unsent" class="srow__unsent">Sin enviar</span>
                    <span v-else-if="row.when" class="srow__who">{{ row.when }}</span>
                  </span>
                </button>

                <button
                  v-if="currentTab.canUndo && row.canUndo"
                  type="button"
                  class="srow__x"
                  :aria-label="row.quitar"
                  :data-undo="row.key"
                  @click="undo(row)"
                >
                  Deshacer
                </button>
              </div>
            </div>
          </div>
        </template>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
```

- [ ] **Step 2: Añadir estilos de pestañas en `src/app.css`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/app.css` (manteniendo intactos los tokens `:root` `--color-*`):

```css
.summary-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-borde);
}

.summary-tab {
  position: relative;
  min-height: 44px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  color: var(--color-texto-2);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.summary-tab--on {
  color: var(--color-texto);
}

.summary-tab__line {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--color-propuesta);
}

.summary-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.srow__unsent {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-acento);
}
```

- [ ] **Step 3: Comprobar ausencia de `useFocusLoop` y `ProposalOrigin`, ejecutar `typecheck` y `self-check.mjs`, y commitear Tasks 1–2**

Run:
```bash
rg -n "useFocusLoop|ProposalOrigin" /Users/gian/Desktop/ssbu/ssbu-skins/src
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/test_contrast.mjs tests/unit/test_domain.mjs tests/unit/sync_ordering.js
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins add -A src/
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(summary): group Cambios sheet by person tabs with read-only friend views"
```
Expected: `rg` sin coincidencias (`0`), `vue-tsc --noEmit` limpio, pruebas unitarias Node en verde y `Self-check TS: 0 pendientes`.

---

### Task 3: Pruebas E2E de pestañas por persona, solo lectura, teclado y navegación al traje

**Files:**
- Modify: `tests/e2e/ack-transition.js`
- Modify: `tests/e2e/recorridos.js`
- Modify: `tests/e2e/local.spec.js`
- Modify: `tests/e2e/visual.spec.js`

- [ ] **Step 1: Actualizar `ack-transition.js`, `recorridos.js`, `local.spec.js` y `visual.spec.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/ack-transition.js`:
   - En `#/cambios`, comprobar que la pestaña activa es `[data-tab="mine"][aria-selected="true"]` y que al pulsar `[data-undo="82_0_Gian"]` la propuesta se borra a un toque sin pedir confirmación intermedia.
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/recorridos.js`:
   - Con propuestas simultáneas de `Gian` (`02_1_Gian`), `Alan` (`02_1_Alan`) y un documento legacy sin `name` (`01_7` sembrado por Admin SDK):
     - Abrir `#/cambios` en el cliente `A` (`Gian`).
     - Verificar que aparecen las pestañas `[data-tab="mine"]` (`Mías · ...`), `[data-tab="person:Alan"]` (`Alan · 1`) y `[data-tab="legacy"]` (`Otros · 1`).
     - En `Mías` (`[data-section="mine"]`), comprobar que `[data-undo="02_1_Gian"]` está visible y funciona a un toque.
     - Pulsar `[data-tab="person:Alan"]` (`[data-section="person"]`): comprobar que la fila de `Alan` se muestra pero `[data-undo]` tiene `count() === 0` (solo lectura).
     - Pulsar `[data-tab="legacy"]` (`[data-section="legacy"]`): comprobar que la fila legacy se muestra y `[data-undo]` tiene `count() === 0` (solo lectura).
     - Tocar `.srow__go` de esa fila legacy (`01`, slot `7`) y comprobar que `SummarySheet` se cierra y la URL pasa a `#/luchador/01/8` con `[data-costume="7"][aria-pressed="true"]`.
3. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/local.spec.js`:
   - Añadir prueba de teclado sobre `role="tablist"` en `#/cambios`: enfocar `[data-tab="mine"]`, pulsar `ArrowRight` y verificar que el foco y `aria-selected="true"` pasan a la siguiente pestaña (`tabindex="0"` en la nueva y `tabindex="-1"` en las demás).
   - Verificar que cuando una propuesta guarda una variante con retrato SHA verificado, `.srow__to img` carga `/assets/portraits/<sha>.webp`, y cuando guarda una variante con `portrait: null`, muestra `Sin retrato`.
4. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/visual.spec.js`:
   - Actualizar la captura de `#/cambios` sembrando una propuesta propia (`Gian`) y una de `Alan` para capturar la barra de pestañas `Mías · 1` / `Alan · 1` y el botón `Deshacer` a un toque.

- [ ] **Step 2: Ejecutar validación completa del repositorio**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && python3 -m unittest discover -s tests/unit -p 'test_*.py'
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/*.mjs tests/unit/*.js
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run build && python3 tools/make_site.py
cd /Users/gian/Desktop/ssbu/ssbu-skins && (cd tests && npx playwright test e2e/local.spec.js --config=playwright.local.config.js)
cd /Users/gian/Desktop/ssbu/ssbu-skins && bash tests/run.sh --sin-webkit
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
```
Expected: `typecheck` limpio, `unittest` en verde, `node --test` en verde, `local.spec.js` en verde, `tests/run.sh --sin-webkit` con `0 fallos` y `Self-check TS: 0 pendientes`.

> **Nota sobre capturas de referencia en CI (`tests/e2e/visual.spec.js-snapshots`):**
> Regenera la captura actualizada de `cambios` en la imagen Linux oficial antes de fusionar:
> ```bash
> cd /Users/gian/Desktop/ssbu/ssbu-skins && docker run --rm -v "$PWD":/work -v /work/tests/node_modules -w /work/tests -e CI=1 mcr.microsoft.com/playwright:v1.63.0-jammy bash -lc 'npm ci --no-audit --no-fund && npx playwright test e2e/visual.spec.js --update-snapshots'
> ```
> (o ejecuta `.github/workflows/snapshots.yml` sobre la rama `feat/fase5-cambios-por-persona`).

- [ ] **Step 3: Commit de cierre de Fase 5**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tests/
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "test(summary): verify person tabs, read-only friend views, and row navigation"
```
