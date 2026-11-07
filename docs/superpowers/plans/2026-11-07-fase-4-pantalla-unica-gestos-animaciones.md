# Fase 4 — Pantalla única, gestos y animaciones Implementation Plan

> **For agentic workers:** Ejecutar tarea por tarea verificando cada comando real del repositorio antes de cada commit. Trabajar en una rama dedicada desde `master` (`feat/fase4-pantalla-unica`), asumiendo las Fases 1, 2 y 3 ya fusionadas en `master`. Si al ejecutar encuentras una discrepancia menor de entorno o líneas vecinas, corrígela en el acto manteniendo intactos los contratos, las pruebas y `Self-check TS: 0 pendientes`. Nunca añadas `Co-Authored-By` ni atribución de IA en los commits; usa únicamente Conventional Commits. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Unificar la aplicación en una sola pantalla centrada en `#/luchador/<code>[/<n>][?skin=<vid>]` con `Traje 1` activo por defecto, barra superior con selector rápido de luchador y flechas `◀` / `▶`, tira fija de 8 trajes (`≥ 44 px` en `375 px` y `4×2` en `320 px` o zoom `170 %`) mostrando únicamente `Original` o `Mod`, cinta compacta de una línea con acción «Otro color», hoja inferior `vaul-vue` en móvil (`< 1024 px`) y panel lateral fijo en escritorio (`≥ 1024 px`) con selector de variante y destino restringido por familia de colores, swipe horizontal, View Transitions direccionales y micro-interacciones `motion-v`.

**Architecture:** `useApp.ts` redirige `#/`, `#/luchadores`, `#/catalogo`, `#/tarjeta` y `#/instaladas` con `location.replace` al último luchador visitado (`ssbu_last_fighter` en `localStorage`, o el primer luchador no Mii del plantel), conservando `#/cambios` y `#/notas`. `App.vue` envuelve el árbol en `<MotionConfig reduced-motion="user">`, mientras `viewTransition.ts` aplica `document.startViewTransition({ update, types: [direction] })` sobre `.fighter-stage` con degradación instantánea cuando el navegador no lo soporta o `prefers-reduced-motion: reduce` está activo. Todos los cajones móviles (`SkinSheet`, `FighterPickSheet` y `PersonSheet`) usan `vaul-vue` bajo `< 1024 px` y el primitivo de escritorio correspondiente (`QDialog` o `<aside>` fijo) en `≥ 1024 px`.

**Tech Stack:** Vue 3.5, `motion-v`, `vaul-vue`, `@vueuse/core` (`usePointerSwipe`, `onKeyStroke`, `useStorage`), View Transitions API nativa, PhotoSwipe 5, Quasar, TypeScript 5.9 (`gian-how-i-code` + `gian-ts-style`), Node `node:test`, Playwright (`tests/run.sh`).

---

## Mapa de archivos

- **Crear:**
  - `src/shared/enums/NavigationDirection.ts` — Conjunto cerrado `APP_OWNED`: `Forward = 'forward'`, `Backward = 'backward'`.
  - `src/shared/helpers/viewTransition.ts` — Helper progresivo de View Transitions direccionales con respeto a `prefers-reduced-motion: reduce` y foco accesible en `#ttl`.
  - `src/features/fighters/enums/CostumeBadgeKind.ts` — Conjunto cerrado `APP_OWNED`: `Original = 'original'`, `Mod = 'mod'`.
  - `src/features/fighters/enums/SkinActionKind.ts` — Conjunto cerrado `APP_OWNED`: `Replace = 'replace'`, `Clear = 'clear'`, `Jump = 'jump'`, `Blocked = 'blocked'`.
  - `src/features/fighters/helpers/costume.helper.ts` — Metadata `Record<CostumeBadgeKind, CostumeBadgeMeta>` (`Original` / `Mod`) sin exponer jamás términos internos.
  - `src/features/fighters/composables/useCostumeStrip.ts` y `src/features/fighters/components/CostumeStrip.vue` — Tira fija de 8 trajes (`padding-inline: 4px`, `gap: 2px`, `4×2` bajo `23.4rem`), precedencia de miniatura propia sobre punto morado de amigos, `MotionSpan` `layout-id="active-costume-frame"` y zoom PhotoSwipe al tocar el traje ya activo.
  - `src/features/fighters/composables/useActiveCostumeBar.ts` y `src/features/fighters/components/ActiveCostumeBar.vue` — Cinta compacta de 1 línea con nombre actual, propuesta propia con `Quitar` (`data-act="clear"`), botón de zoom y acción «Otro color».
  - `src/features/fighters/composables/useSkinSheet.ts` y `src/features/fighters/components/SkinSheet.vue` — Hoja inferior `vaul-vue` (`< 1024 px`) / panel lateral sticky de `400 px` (`≥ 1024 px`) con variantes verificadas (`portraitUrl` o `Sin retrato`), chips `Traje 1..8` gobernados por `SSBU.compatibleSlots` + `SSBU.sourceSlotsOf`, propuestas de amigos en el destino, botón `Reemplazar` conectado al gate perezoso y enlace externo cuando no está descargada.
- **Modificar:**
  - `package.json` y `package-lock.json` — Instala `motion-v` y `vaul-vue`.
  - `src/App.vue` — Envuelve `<AppShell>` en `<MotionConfig reduced-motion="user">` y monta únicamente `NotesPage` o `FighterPage` usando `useApp()`.
  - `src/composables/useApp.ts` — Redirige rutas antiguas a `#/luchador/<code>`, persiste `ssbu_last_fighter`, deja `Traje 1` (`slot 0`) siempre activo cuando falta `/<n>`, y expone `stepFighter`, `jumpToFighter` y `useApp`.
  - `src/layouts/composables/useAppShell.ts` y `src/layouts/AppShell.vue` — Barra fija sin auto-ocultamiento, con `◀`, botón selector `<h1 ...><button data-fighter-pick>` con retrato oficial `.app-header__face` + `#ttl` + chevron SVG, `▶`, menú `⋮`, botón `Cambios · N` animado y montaje condicional de `FighterPickSheet` y `PersonSheet`.
  - `src/features/plan/composables/usePersonSheet.ts` y `src/features/plan/components/PersonSheet.vue` — Migra el cajón móvil (`< 1024 px`) a `vaul-vue` conservando `QDialog` en escritorio (`≥ 1024 px`).
  - `src/features/explore/composables/useFighterPick.ts`, `src/features/explore/composables/useFighterPickSheet.ts` y `src/features/explore/components/FighterPickSheet.vue` — Selector global `vaul-vue` / `QDialog` con búsqueda unificada de luchadores y skins (`?skin=<vid>`), `CostumeMeter` y punto morado cuando hay propuestas.
  - `src/features/plan/composables/usePlan.ts` — Elimina la dependencia de `useReveal.ts`, añade `lastSavedPulse` y callback `onCommitted` en `proposeAt` para que tanto el guardado directo como el primer guardado tras `PersonSheet` pulsen el traje, cierren la hoja móvil y muestren el aviso con `Deshacer`.
  - `src/features/fighters/components/SkinGrid.vue`, `src/pages/composables/useFighterPage.ts` y `src/pages/FighterPage.vue` — Conecta `CostumeStrip`, `ActiveCostumeBar`, `SkinGrid` (`eager` en las primeras 4 tarjetas para proteger el LCP, `initial={false}`), `SkinSheet`, swipe horizontal con `usePointerSwipe` (`touch-action: pan-y`), atajos `ArrowLeft` / `ArrowRight` / `/` y botón flotante `Volver arriba` con `AnimatePresence`.
  - `src/app.css` — Keyframes y selectores `:active-view-transition-type(forward|backward)` sobre `::view-transition-old/new(fighter-stage)`, estilos de `CostumeStrip`, `ActiveCostumeBar`, `SkinSheet`, `vaul-vue` drawers y `FighterPickSheet`, conservando intactos todos los tokens `:root` validados por `tests/unit/test_contrast.mjs`.
  - `tests/e2e/lib.js`, `tests/e2e/perf.js`, `tests/e2e/identity.js`, `tests/e2e/recorridos.js`, `tests/e2e/ack-transition.js`, `tests/e2e/sync-errors.js`, `tests/e2e/local.spec.js`, `tests/e2e/visual.spec.js` — Adapta selectores y recorridos a la pantalla única, valida copy retirado, verifica `320 px`, `375 px`, `768 px`, `1440 px`, zoom de texto `170 %` y `LCP <= 2500 ms`.
- **Eliminar (código retirado por pantalla única):**
  - `src/pages/RosterPage.vue`
  - `src/pages/CatalogPage.vue`
  - `src/pages/composables/useRosterPage.ts`
  - `src/pages/composables/useCatalogPage.ts`
  - `src/features/explore/components/ExploreBar.vue`
  - `src/features/roster/components/RosterRow.vue`
  - `src/features/fighters/components/CostumeGrid.vue`
  - `src/features/fighters/components/Destinations.vue`
  - `src/features/fighters/components/CompareCards.vue`
  - `src/features/fighters/components/CompareBar.vue`
  - `src/features/fighters/components/PlacingBand.vue`
  - `src/composables/useReveal.ts`
  *(Nota: `src/composables/useFocusLoop.ts` se conserva hasta la Fase 5 porque `SummarySheet.vue` lo sigue importando hasta migrar esa hoja a `vaul-vue` en Fase 5.)*
- **No tocar:**
  - `/Volumes/SWITCH SD`, `Gian-Ultimate-Modpack-private`, `~/Documents/smash-mod-assets`, ni desplegar cambios sin autorización de Gian.

## Sin datos todavía y texto de la referencia que no se publica

- **Sin datos todavía:**
  - Cuando una variante en `public/drive-alts.json` tiene `portrait: null` (o un valor que no es SHA-256 verificado), `SkinSheet` pasa `src: null` a `AppImg` y muestra `Sin retrato` sin tomar prestada la imagen de otro color del pack.
- **Texto de la referencia que no se publica:**
  - Quedan prohibidos y retirados de toda la UI de luchador/traje los textos `Perfil`, `Pack base`, `Plan de Gian`, `Sin nombre`, `Traje N de 8`, `en tu perfil`, `Plan actualizado el`, `Elige un traje para compararlo`, `Sin guardar`, así como cualquier rótulo técnico del plan (`Fase 4`, `vaul-vue`, `motion-v`, `View Transition`).

---

### Task 1: `motion-v` + `vaul-vue`, View Transitions direccionales y enrutador de pantalla única (`useApp.ts`, `App.vue`)

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/shared/enums/NavigationDirection.ts`
- Create: `src/shared/helpers/viewTransition.ts`
- Modify: `src/composables/useApp.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Crear rama e instalar `motion-v` y `vaul-vue`**

Run:
```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout master
git -C /Users/gian/Desktop/ssbu/ssbu-skins pull --ff-only
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout -b feat/fase4-pantalla-unica
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm install motion-v vaul-vue
```
Expected: rama `feat/fase4-pantalla-unica` activa y `motion-v` + `vaul-vue` añadidos en `dependencies` de `package.json`.

- [ ] **Step 2: Crear `NavigationDirection.ts` y `viewTransition.ts`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/enums/NavigationDirection.ts`:

```ts
export enum NavigationDirection {
  Forward = 'forward',
  Backward = 'backward',
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/viewTransition.ts`:

```ts
import { NavigationDirection } from '../enums/NavigationDirection'

interface ViewTransitionHandle {
  finished: Promise<void>
}

interface ViewTransitionInput {
  update: () => void
  types?: string[]
}

interface ViewTransitionDocument {
  startViewTransition?: (arg: ViewTransitionInput | (() => void)) => ViewTransitionHandle
}

const focusHeading = () => {
  const heading = document.getElementById('ttl')

  heading?.focus({ preventScroll: true })
}

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const runDirectionalTransition = (
  direction: NavigationDirection,
  update: () => void,
  onFinished?: () => void,
) => {
  const doc = (typeof document !== 'undefined' ? document : null) as ViewTransitionDocument | null

  if (!doc?.startViewTransition || prefersReducedMotion()) {
    update()
    requestAnimationFrame(() => {
      focusHeading()
      onFinished?.()
    })

    return
  }

  let transition: ViewTransitionHandle

  try {
    transition = doc.startViewTransition({
      update,
      types: [direction],
    })
  } catch {
    transition = doc.startViewTransition(update)
  }

  void transition.finished.finally(() => {
    focusHeading()
    onFinished?.()
  })
}
```

- [ ] **Step 3: Actualizar `src/composables/useApp.ts` para la pantalla única y `ssbu_last_fighter`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/composables/useApp.ts`:

1. Importar `computed` desde `'vue'`, `NavigationDirection` desde `'../shared/enums/NavigationDirection'` y `runDirectionalTransition` desde `'../shared/helpers/viewTransition'`.
2. Añadir las funciones de plantel y persistencia del último luchador debajo de `skinEntry`:
   ```ts
   const LAST_FIGHTER_KEY = 'ssbu_last_fighter'

   export const playableFighters = (): Fighter[] =>
     (state.F as Fighter[]).filter((fighter) => !fighter.mii)

   export const isPlayableCode = (code: string): boolean => {
     const fighter = fighterOf(code)

     return Boolean(fighter && !fighter.mii)
   }

   export const defaultFighterCode = (): string => {
     try {
       const saved = localStorage.getItem(LAST_FIGHTER_KEY)

       if (saved && isPlayableCode(saved)) return saved
     } catch {
       // almacenamiento no disponible
     }

     return playableFighters()[0]?.code || '01'
   }

   const rememberLastFighter = (code: string) => {
     if (!isPlayableCode(code)) return

     try {
       localStorage.setItem(LAST_FIGHTER_KEY, code)
     } catch {
       // almacenamiento no disponible
     }
   }
   ```
3. Actualizar `blank`, `legacyTarget`, `parse`, `fallbackBase`, `hasSlot`, `titleOf`, `showBack` y `back`:
   - `legacyTarget(view, seg, q, key)`:
     - Si `['luchadores', 'catalogo', 'tarjeta', 'instaladas'].includes(view)`:
       - Si `q.pj && isPlayableCode(q.pj)`, devolver `redirect(fighterHash(q.pj), key)`.
       - Si no, devolver `redirect(fighterHash(defaultFighterCode()), key)`.
     - Si `view === 'apariencia'`:
       - Si `!para || !isPlayableCode(para.code)`, devolver `redirect(fighterHash(defaultFighterCode()), key)`.
       - Si es válido, devolver `redirect(fighterHash(para.code, q.de === 'catalogo' ? 0 : para.n, vid), key)`.
   - `parse(hash)`:
     - Cuando `hash` está vacío o es `'#'`, redirigir con `redirect(fighterHash(defaultFighterCode()), '#/luchador/' + defaultFighterCode())`.
     - Conservar `view === 'luchador' && seg[2]` (`v: 'traje'`, `code: seg[1]`, `n: Number(seg[2]) - 1`), `view === 'luchador' && seg[1]` (`v: 'luchador'`, `code: seg[1]`, `n: 0`), `view === 'cambios'` y `view === 'notas'`.
     - Cualquier otra vista desconocida devuelve `redirect(fighterHash(defaultFighterCode()), key)`.
   - En `applyHash`:
     - Si `isFighterView(next) && !isPlayableCode(next.code)`, hacer `location.replace(fighterHash(defaultFighterCode()))` y retornar.
     - Justo antes de `rememberBase(next)`, si `isFighterView(next)`, llamar a `rememberLastFighter(next.code)`.
   - `fallbackBase()`:
     ```ts
     const fallbackBase = (): AppRoute => {
       const code = defaultFighterCode()

       return blank({ v: 'luchador', code, n: 0, key: fighterHash(code) })
     }
     ```
   - `hasSlot()`: devolver `onFighter()` (cuando no viene `/<n>`, `slotOf()` ya devuelve `0`, así que `Traje 1` está siempre activo).
   - `showBack()`: devolver `route.value.v === 'notas'` (en la pantalla principal del luchador ya no existe una vista `Luchadores` por encima).
   - `selectSlot(slot, keepSkin = true)`: usar siempre `swap(target)` para cambiar entre los 8 trajes sin apilar entradas redundantes en el historial del navegador.
   - `back()`: si `S.nav > 0` llama a `history.back()`; si no, `swap(fighterHash(defaultFighterCode()))`.
4. Añadir navegación direccional entre luchadores y el composable `useApp`:
   ```ts
   export const jumpToFighter = (
     nextCode: string,
     slot: number | null = null,
     skin = '',
     explicitDirection?: NavigationDirection,
   ) => {
     if (!isPlayableCode(nextCode)) return

     const list = playableFighters()
     const currentCode = viewRoute().code
     const currentIndex = list.findIndex((fighter) => fighter.code === currentCode)
     const nextIndex = list.findIndex((fighter) => fighter.code === nextCode)
     const targetHash = fighterHash(nextCode, slot, skin)

     if (currentCode === nextCode) {
       swap(targetHash)

       return
     }

     const direction = explicitDirection
       ?? (nextIndex >= currentIndex ? NavigationDirection.Forward : NavigationDirection.Backward)

     runDirectionalTransition(direction, () => {
       go(targetHash)
     })
   }

   export const stepFighter = (delta: -1 | 1) => {
     const list = playableFighters()

     if (!list.length) return

     const currentCode = viewRoute().code
     const currentIndex = list.findIndex((fighter) => fighter.code === currentCode)
     const baseIndex = currentIndex >= 0 ? currentIndex : 0
     const nextIndex = (baseIndex + delta + list.length) % list.length
     const target = list[nextIndex]

     if (!target) return

     const direction = delta > 0 ? NavigationDirection.Forward : NavigationDirection.Backward

     jumpToFighter(target.code, null, '', direction)
   }

   export const useApp = () => {
     const view = computed(() => {
       tick.value

       return viewRoute().v
     })

     return { view }
   }
   ```

- [ ] **Step 4: Actualizar `src/App.vue` con `<MotionConfig reduced-motion="user">`**

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/App.vue` por:

```vue
<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { useApp } from './composables/useApp'
import AppShell from './layouts/AppShell.vue'
import FighterPage from './pages/FighterPage.vue'
import NotesPage from './pages/NotesPage.vue'

const { view } = useApp()
</script>

<template>
  <MotionConfig reduced-motion="user">
    <AppShell>
      <NotesPage v-if="view === 'notas'" />
      <FighterPage v-else />
    </AppShell>
  </MotionConfig>
</template>
```

- [ ] **Step 5: Verificar `self-check.mjs` sobre los archivos TS tocados y commitear Task 1**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs --all src/shared/enums/NavigationDirection.ts src/shared/helpers/viewTransition.ts src/composables/useApp.ts src/App.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins add package.json package-lock.json src/shared/enums/NavigationDirection.ts src/shared/helpers/viewTransition.ts src/composables/useApp.ts src/App.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(router): add single-screen fighter routing and directional transitions"
```
Expected: `Self-check TS: 0 pendientes`.

---

### Task 2: Cabecera fija (`AppShell`), `PersonSheet` con `vaul-vue` y selector global `FighterPickSheet`

**Files:**
- Modify: `src/features/plan/composables/usePlan.ts`
- Delete: `src/composables/useReveal.ts`
- Modify: `src/features/plan/composables/usePersonSheet.ts`
- Modify: `src/features/plan/components/PersonSheet.vue`
- Modify: `src/features/explore/composables/useFighterPick.ts`
- Modify: `src/features/explore/composables/useFighterPickSheet.ts`
- Modify: `src/features/explore/components/FighterPickSheet.vue`
- Modify: `src/layouts/composables/useAppShell.ts`
- Modify: `src/layouts/AppShell.vue`

- [ ] **Step 1: Retirar `useReveal.ts` y añadir `lastSavedPulse` + `onCommitted` en `src/features/plan/composables/usePlan.ts`**

1. Eliminar `/Users/gian/Desktop/ssbu/ssbu-skins/src/composables/useReveal.ts` (`rm src/composables/useReveal.ts`).
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePlan.ts`:
   - Quitar `import { hdrHidden } from '../../../composables/useReveal'` y la línea `hdrHidden.value = false` dentro de `showNotice`.
   - Declarar:
     ```ts
     export interface SavedPulse {
       code: string
       slot: number
       at: number
     }

     export const lastSavedPulse = ref<SavedPulse | null>(null)
     ```
   - En `commitProposal(person, code, slot, vid, variant, onCommitted)` y `proposeAt(code, slot, vid, variant = null, onCommitted?: () => void)`:
     - Cuando `commitProposal` encola `op` con éxito, actualizar `lastSavedPulse.value = { code, slot, at: Date.now() }` y ejecutar `onCommitted?.()` antes de `return true`.
     - De ese modo, cuando `activePerson` es `null` y el usuario elige su nombre en `PersonSheet`, `onCommitted()` corre en cuanto se completa el guardado perezoso.

- [ ] **Step 2: Migrar `PersonSheet.vue` a `vaul-vue` en móvil (`< 1024 px`) y `QDialog` en escritorio (`≥ 1024 px`)**

Actualizar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePersonSheet.ts`:

```ts
import { useDesktop } from '../../../composables/useDesktop'
import type { PersonName } from '../enums/PersonName'
import { choosePerson, usePerson } from './usePerson'

interface UsePersonSheetProps {
  isOpen: boolean
}

interface UsePersonSheetEmits {
  (event: 'close'): void
}

export const usePersonSheet = (props: UsePersonSheetProps, emit: UsePersonSheetEmits) => {
  const desktop = useDesktop()
  const { people, activePerson } = usePerson()

  const selectPerson = (person: PersonName) => {
    choosePerson(person)
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && props.isOpen) emit('close')
  }

  return {
    desktop,
    people,
    activePerson,
    selectPerson,
    onOpenChange,
  }
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/components/PersonSheet.vue` por:

```vue
<script setup lang="ts">
import { QBtn, QDialog } from 'quasar'
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'
import { usePersonSheet } from '../composables/usePersonSheet'

interface PersonSheetProps {
  isOpen: boolean
}

interface PersonSheetEmits {
  close: []
}

const props = defineProps<PersonSheetProps>()
const emit = defineEmits<PersonSheetEmits>()

const {
  desktop,
  people,
  activePerson,
  selectPerson,
  onOpenChange,
} = usePersonSheet(props, emit)
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="props.isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    class="sheet-dialog person-dialog"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--person" role="dialog" aria-labelledby="person-sheet-title" aria-describedby="person-sheet-desc">
      <div class="sheet__head">
        <h2 id="person-sheet-title" class="sheet__h">¿Quién propone?</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>

      <p id="person-sheet-desc" class="sheet__note person-note">
        Elige tu nombre para separar tus propuestas de las de tus amigos. Es una lista entre amigos, sin contraseña.
      </p>

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
  </q-dialog>

  <DrawerRoot v-else :open="props.isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay vaul-overlay--top" />
      <DrawerContent class="vaul-sheet vaul-sheet--top sheet sheet--person">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle class="sheet__h">¿Quién propone?</DrawerTitle>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <DrawerDescription class="sheet__note person-note">
          Elige tu nombre para separar tus propuestas de las de tus amigos. Es una lista entre amigos, sin contraseña.
        </DrawerDescription>

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
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
```

- [ ] **Step 3: Actualizar `useFighterPick.ts`, `useFighterPickSheet.ts` y `FighterPickSheet.vue` (búsqueda de luchador + skin)**

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/explore/composables/useFighterPick.ts` por un estado compartido para abrirlo tanto desde la cabecera como con la tecla `/`:

```ts
import { ref, watch } from 'vue'
import { closedOverlay, ovDone, ovPush } from '../../../composables/useApp'

export const isOpenFighterPick = ref(false)

const focusOpener = () => {
  document.querySelector<HTMLElement>('[data-fighter-pick]')?.focus()
}

export const openFighterPick = () => {
  if (isOpenFighterPick.value) return

  isOpenFighterPick.value = true
  ovPush('fighters')
}

export const closeFighterPick = (then?: () => void) => {
  if (!isOpenFighterPick.value) {
    if (then) then()

    return
  }

  isOpenFighterPick.value = false

  if (ovDone('fighters', then)) return

  if (then) then()

  focusOpener()
}

let bound = false

export const useFighterPick = () => {
  if (!bound) {
    bound = true
    watch(closedOverlay, (id) => {
      if (id !== 'fighters' || !isOpenFighterPick.value) return

      closedOverlay.value = ''
      isOpenFighterPick.value = false
      focusOpener()
    })
  }

  return {
    isOpenFighterPick,
    openFighterPick,
    closeFighterPick,
  }
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/explore/composables/useFighterPickSheet.ts` para buscar luchadores (86 con 8 trajes, retrato oficial `assets/fighters/<code>.webp`, `CostumeMeter` y punto morado si tienen propuestas) y también skins del catálogo (`state.all`, máx. 24 coincidencias al escribir consulta):

```ts
import { computed, nextTick, onMounted, ref } from 'vue'
import type { Fighter, Skin } from '../../../boot'
import { jumpToFighter, playableFighters, tick, viewRoute } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { thumbOf } from '../../../shared/helpers/skins'
import { norm } from '../../../shared/helpers/text'
import { changesOf } from '../../plan/composables/usePlan'
import { state } from '../../plan/services/sync'
import { meterOf, type MeterCostume } from '../../roster/costumes'

export interface PickerFighterRow {
  code: string
  name: string
  portrait: string | null
  costumes: MeterCostume[]
  proposalCount: number
  isCurrent: boolean
}

export interface PickerSkinHit {
  vid: string
  code: string
  fighterName: string
  name: string
  img: string | null
}

interface CatalogHitEntry {
  f: Fighter
  p: Skin
}

interface UseFighterPickSheetProps {
  isOpen: boolean
}

interface UseFighterPickSheetEmits {
  (event: 'close'): void
}

const wordsOf = (value: string) => norm(value).split(/\s+/).filter(Boolean)

export const useFighterPickSheet = (
  props: UseFighterPickSheetProps,
  emit: UseFighterPickSheetEmits,
) => {
  const desktop = useDesktop()
  const query = ref('')
  const searchInput = ref<HTMLInputElement | null>(null)

  const fighterRows = computed<PickerFighterRow[]>(() => {
    tick.value

    const currentCode = viewRoute().code
    const words = wordsOf(query.value)

    return playableFighters()
      .filter((fighter) => words.every((word) => norm(fighter.name).includes(word)))
      .map((fighter) => {
        const proposals = changesOf(fighter.code)

        return {
          code: fighter.code,
          name: fighter.name,
          portrait: fighter.portrait || null,
          costumes: meterOf(fighter.code),
          proposalCount: proposals.length,
          isCurrent: fighter.code === currentCode,
        }
      })
  })

  const skinHits = computed<PickerSkinHit[]>(() => {
    const words = wordsOf(query.value)

    if (!words.length) return []

    return (state.all as CatalogHitEntry[])
      .filter(
        (entry) =>
          !entry.f.mii
          && !entry.p.withdrawn
          && words.every((word) => norm(entry.p.name + ' ' + entry.f.name).includes(word)),
      )
      .slice(0, 24)
      .map((entry) => ({
        vid: entry.p.vid,
        code: entry.f.code,
        fighterName: entry.f.name,
        name: entry.p.name,
        img: thumbOf(entry.p),
      }))
  })

  const clearQuery = () => {
    query.value = ''
    searchInput.value?.focus()
  }

  const pickFighter = (code: string) => {
    emit('close')
    jumpToFighter(code)
  }

  const pickSkin = (hit: PickerSkinHit) => {
    emit('close')
    jumpToFighter(hit.code, null, hit.vid)
  }

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && props.isOpen) emit('close')
  }

  onMounted(() => {
    void nextTick(() => {
      searchInput.value?.focus()
    })
  })

  return {
    desktop,
    query,
    searchInput,
    fighterRows,
    skinHits,
    clearQuery,
    pickFighter,
    pickSkin,
    onOpenChange,
  }
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/explore/components/FighterPickSheet.vue` por:

```vue
<script setup lang="ts">
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
import CostumeMeter from '../../roster/components/CostumeMeter.vue'
import { useFighterPickSheet } from '../composables/useFighterPickSheet'

interface FighterPickSheetProps {
  isOpen: boolean
}

interface FighterPickSheetEmits {
  close: []
}

const props = defineProps<FighterPickSheetProps>()
const emit = defineEmits<FighterPickSheetEmits>()

const {
  desktop,
  query,
  searchInput,
  fighterRows,
  skinHits,
  clearQuery,
  pickFighter,
  pickSkin,
  onOpenChange,
} = useFighterPickSheet(props, emit)
</script>

<template>
  <q-dialog
    v-if="desktop"
    :model-value="props.isOpen"
    position="standard"
    transition-show="scale"
    transition-hide="scale"
    :transition-duration="220"
    class="sheet-dialog"
    @update:model-value="onOpenChange"
  >
    <div class="sheet sheet--pick" role="dialog" aria-labelledby="fighter-pick-title">
      <div class="sheet__head">
        <h2 id="fighter-pick-title" class="sheet__h">Elegir luchador</h2>
        <q-btn flat round padding="0" class="icon-btn" icon="close" aria-label="Cerrar" @click="emit('close')" />
      </div>

      <div class="pick-search">
        <label for="fighter-pick-input" class="sr-only">Buscar luchador o skin</label>
        <input
          id="fighter-pick-input"
          ref="searchInput"
          v-model="query"
          type="search"
          class="pick-search__input"
          placeholder="Buscar luchador o skin"
          autocomplete="off"
        >
        <button
          v-if="query"
          type="button"
          class="icon-btn pick-search__clear"
          aria-label="Borrar búsqueda"
          @click="clearQuery"
        >
          ✕
        </button>
      </div>

      <div class="sheet__scroll">
        <section v-if="fighterRows.length" aria-label="Luchadores" class="pick-grid">
          <button
            v-for="row in fighterRows"
            :key="row.code"
            type="button"
            class="pick-tile"
            :class="{ 'pick-tile--on': row.isCurrent }"
            :data-fighter-tile="row.code"
            @click="pickFighter(row.code)"
          >
            <span class="pick-tile__face">
              <img v-if="row.portrait" :src="row.portrait" alt="" width="40" height="40" loading="lazy" decoding="async">
              <span v-if="row.proposalCount > 0" class="pick-tile__dot" aria-hidden="true"></span>
            </span>
            <span class="pick-tile__body">
              <span class="pick-tile__name">{{ row.name }}</span>
              <CostumeMeter :costumes="row.costumes" :label="row.name + ': ' + row.proposalCount + ' propuestas'" />
            </span>
          </button>
        </section>

        <section v-if="skinHits.length" aria-label="Skins encontradas" class="pick-skins">
          <h3 class="pick-skins__h">Skins</h3>
          <button
            v-for="hit in skinHits"
            :key="hit.vid"
            type="button"
            class="pick-skin-row"
            :data-pick-skin="hit.vid"
            @click="pickSkin(hit)"
          >
            <span class="pick-skin-row__thumb">
              <AppImg :src="hit.img" :missing="hit.img ? '' : 'Sin retrato'" fit="cover" />
            </span>
            <span class="pick-skin-row__txt">
              <span class="pick-skin-row__name">{{ hit.name }}</span>
              <span class="pick-skin-row__sub">{{ hit.fighterName }}</span>
            </span>
          </button>
        </section>

        <div v-if="!fighterRows.length && !skinHits.length" class="empty" role="status">
          <q-icon name="search_off" size="36px" aria-hidden="true" />
          <b>Sin coincidencias</b>
        </div>
      </div>
    </div>
  </q-dialog>

  <DrawerRoot v-else :open="props.isOpen" @update:open="onOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent class="vaul-sheet sheet sheet--pick">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <DrawerTitle class="sheet__h">Elegir luchador</DrawerTitle>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <div class="pick-search">
          <label for="fighter-pick-input-m" class="sr-only">Buscar luchador o skin</label>
          <input
            id="fighter-pick-input-m"
            ref="searchInput"
            v-model="query"
            type="search"
            class="pick-search__input"
            placeholder="Buscar luchador o skin"
            autocomplete="off"
          >
          <button
            v-if="query"
            type="button"
            class="icon-btn pick-search__clear"
            aria-label="Borrar búsqueda"
            @click="clearQuery"
          >
            ✕
          </button>
        </div>

        <div class="sheet__scroll">
          <section v-if="fighterRows.length" aria-label="Luchadores" class="pick-grid">
            <button
              v-for="row in fighterRows"
              :key="row.code"
              type="button"
              class="pick-tile"
              :class="{ 'pick-tile--on': row.isCurrent }"
              :data-fighter-tile="row.code"
              @click="pickFighter(row.code)"
            >
              <span class="pick-tile__face">
                <img v-if="row.portrait" :src="row.portrait" alt="" width="40" height="40" loading="lazy" decoding="async">
                <span v-if="row.proposalCount > 0" class="pick-tile__dot" aria-hidden="true"></span>
              </span>
              <span class="pick-tile__body">
                <span class="pick-tile__name">{{ row.name }}</span>
                <CostumeMeter :costumes="row.costumes" :label="row.name + ': ' + row.proposalCount + ' propuestas'" />
              </span>
            </button>
          </section>

          <section v-if="skinHits.length" aria-label="Skins encontradas" class="pick-skins">
            <h3 class="pick-skins__h">Skins</h3>
            <button
              v-for="hit in skinHits"
              :key="hit.vid"
              type="button"
              class="pick-skin-row"
              :data-pick-skin="hit.vid"
              @click="pickSkin(hit)"
            >
              <span class="pick-skin-row__thumb">
                <AppImg :src="hit.img" :missing="hit.img ? '' : 'Sin retrato'" fit="cover" />
              </span>
              <span class="pick-skin-row__txt">
                <span class="pick-skin-row__name">{{ hit.name }}</span>
                <span class="pick-skin-row__sub">{{ hit.fighterName }}</span>
              </span>
            </button>
          </section>

          <div v-if="!fighterRows.length && !skinHits.length" class="empty" role="status">
            <q-icon name="search_off" size="36px" aria-hidden="true" />
            <b>Sin coincidencias</b>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
```

- [ ] **Step 4: Actualizar `src/layouts/composables/useAppShell.ts` y `src/layouts/AppShell.vue`**

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/layouts/composables/useAppShell.ts`:

```ts
import { computed, onMounted, ref, watch } from 'vue'
import {
  back,
  go,
  onFighter,
  portraitOf,
  showBack,
  start,
  stepFighter,
  tick,
  titleOf,
} from '../composables/useApp'
import { useFighterPick } from '../features/explore/composables/useFighterPick'
import { bootPlan, countChosen, dismissNotice, notice, retrySync } from '../features/plan/composables/usePlan'
import { usePerson } from '../features/plan/composables/usePerson'
import { useSaveStatus } from '../features/plan/saveStatus'
import { loadDriveAlts } from '../features/roster/driveAlts'

export const useAppShell = () => {
  const countPulse = ref(false)
  const { problem } = useSaveStatus()
  const { activePerson, isOpenPerson, openPersonSheet, closePersonSheet } = usePerson()
  const { isOpenFighterPick, openFighterPick, closeFighterPick } = useFighterPick()

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

  const isFighterHeader = computed(() => {
    tick.value

    return onFighter() && !showBack()
  })

  const chosen = computed(() => {
    tick.value

    return countChosen()
  })

  const personActionLabel = computed(() =>
    activePerson.value ? `Cambiar persona (${activePerson.value})` : 'Elegir persona',
  )

  const prevFighter = () => {
    stepFighter(-1)
  }

  const nextFighter = () => {
    stepFighter(1)
  }

  const closePicker = () => {
    closeFighterPick()
  }

  const runNotice = () => {
    const current = notice.value

    if (!current) return

    notice.value = null
    if (current.fn) current.fn()
  }

  watch(chosen, (next, prev) => {
    if (next === prev) return

    countPulse.value = true
    window.setTimeout(() => {
      countPulse.value = false
    }, 260)
  })

  onMounted(() => {
    start()
    bootPlan()
    void loadDriveAlts()
  })

  return {
    problem,
    notice,
    title,
    portrait,
    canBack,
    isFighterHeader,
    chosen,
    countPulse,
    isOpenPerson,
    isOpenFighterPick,
    personActionLabel,
    back,
    go,
    prevFighter,
    nextFighter,
    openFighterPick,
    closePicker,
    openPersonSheet,
    closePersonSheet,
    runNotice,
    dismissNotice,
    retrySync,
  }
}
```

Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/layouts/AppShell.vue` por:

```vue
<script setup lang="ts">
import { QBtn, QHeader, QItem, QItemSection, QLayout, QList, QMenu, QPageContainer, QToolbar } from 'quasar'
import FighterPickSheet from '../features/explore/components/FighterPickSheet.vue'
import SummarySheet from '../features/fighters/components/SummarySheet.vue'
import PersonSheet from '../features/plan/components/PersonSheet.vue'
import { useAppShell } from './composables/useAppShell'

const {
  problem,
  notice,
  title,
  portrait,
  canBack,
  isFighterHeader,
  chosen,
  countPulse,
  isOpenPerson,
  isOpenFighterPick,
  personActionLabel,
  back,
  go,
  prevFighter,
  nextFighter,
  openFighterPick,
  closePicker,
  openPersonSheet,
  closePersonSheet,
  runNotice,
  dismissNotice,
  retrySync,
} = useAppShell()
</script>

<template>
  <q-layout view="hHh lpR fFf" class="app">
    <q-header class="app-header top" height-hint="56">
      <div class="app-frame">
        <q-toolbar class="app-header__bar">
          <q-btn
            v-if="canBack"
            flat
            round
            padding="0"
            class="icon-btn"
            icon="arrow_back"
            aria-label="Volver"
            @click="back"
          />

          <template v-if="isFighterHeader">
            <q-btn
              flat
              round
              padding="0"
              class="icon-btn"
              icon="chevron_left"
              aria-label="Luchador anterior"
              data-prev-fighter
              @click="prevFighter"
            />
            <h1 class="app-header__title">
              <button
                type="button"
                class="fighter-trigger"
                data-fighter-pick
                :aria-label="'Cambiar luchador, actual ' + title"
                @click="openFighterPick"
              >
                <span v-if="portrait" class="app-header__face">
                  <img :src="portrait" alt="" width="32" height="32" decoding="async">
                </span>
                <span id="ttl" tabindex="-1" class="fighter-trigger__name">{{ title }}</span>
                <svg class="fighter-trigger__chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M7 10l5 5 5-5z" />
                </svg>
              </button>
            </h1>
            <q-btn
              flat
              round
              padding="0"
              class="icon-btn"
              icon="chevron_right"
              aria-label="Luchador siguiente"
              data-next-fighter
              @click="nextFighter"
            />
          </template>

          <h1 v-else id="ttl" class="app-header__title" tabindex="-1">{{ title }}</h1>

          <span id="sync" class="sync-word"></span>

          <q-btn flat round padding="0" class="icon-btn" icon="more_vert" aria-label="Más opciones">
            <q-menu anchor="bottom right" self="top right">
              <q-list>
                <q-item v-close-popup clickable data-open-person @click="openPersonSheet">
                  <q-item-section>{{ personActionLabel }}</q-item-section>
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
            :class="{ 'hdr-btn--on': chosen > 0, 'hdr-btn--pulse': countPulse }"
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

    <FighterPickSheet v-if="isOpenFighterPick" :is-open="isOpenFighterPick" @close="closePicker" />
    <PersonSheet v-if="isOpenPerson" :is-open="isOpenPerson" @close="closePersonSheet" />
    <SummarySheet />
  </q-layout>
</template>
```

> **Por qué el chevron usa `<svg aria-hidden="true">` y `#ttl` envuelve solo `{{ title }}`:**
> En Quasar, `<q-icon name="expand_more">` inserta la ligadura textual `expand_more` en el DOM; mantener `#ttl` exclusivamente sobre el `<span id="ttl" tabindex="-1">{{ title }}</span>` dentro de `<h1><button data-fighter-pick>` preserva la jerarquía `<h1>` accesible y garantiza que `locator('#ttl').textContent()` devuelva exactamente el nombre del luchador (`Mario`, `Link`, etc.) sin contaminación textual.

- [ ] **Step 5: Verificar `self-check.mjs` y commitear Task 2**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs --all src/features/plan/composables/usePlan.ts src/features/plan/composables/usePersonSheet.ts src/features/plan/components/PersonSheet.vue src/features/explore/composables/useFighterPick.ts src/features/explore/composables/useFighterPickSheet.ts src/features/explore/components/FighterPickSheet.vue src/layouts/composables/useAppShell.ts src/layouts/AppShell.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins add -A src/composables/useReveal.ts src/features/plan/composables/usePlan.ts src/features/plan/composables/usePersonSheet.ts src/features/plan/components/PersonSheet.vue src/features/explore/composables/useFighterPick.ts src/features/explore/composables/useFighterPickSheet.ts src/features/explore/components/FighterPickSheet.vue src/layouts/composables/useAppShell.ts src/layouts/AppShell.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(shell): unify header fighter picker and vaul mobile drawers"
```
Expected: `Self-check TS: 0 pendientes`.

---

### Task 3: Tira fija de 8 trajes (`CostumeStrip`) y cinta compacta de traje activo (`ActiveCostumeBar`)

**Files:**
- Create: `src/features/fighters/enums/CostumeBadgeKind.ts`
- Create: `src/features/fighters/helpers/costume.helper.ts`
- Create: `src/features/fighters/composables/useCostumeStrip.ts`
- Create: `src/features/fighters/components/CostumeStrip.vue`
- Create: `src/features/fighters/composables/useActiveCostumeBar.ts`
- Create: `src/features/fighters/components/ActiveCostumeBar.vue`

- [ ] **Step 1: Crear `CostumeBadgeKind.ts` y `costume.helper.ts` (solo `Original` o `Mod`)**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/enums/CostumeBadgeKind.ts`:

```ts
export enum CostumeBadgeKind {
  Original = 'original',
  Mod = 'mod',
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/helpers/costume.helper.ts`:

```ts
import type { CurrentSlot } from '../../../shared/helpers/ssbu'
import { isSha, portraitUrl } from '../../../shared/helpers/portraits'
import { thumbOf } from '../../../shared/helpers/skins'
import { skinOf } from '../../plan/helpers/lookup'
import { driveAlts } from '../../roster/driveAlts'
import { CostumeBadgeKind } from '../enums/CostumeBadgeKind'

interface CostumeBadgeMeta {
  label: string
}

export class CostumeHelper {
  static readonly badgeMeta: Record<CostumeBadgeKind, CostumeBadgeMeta> = {
    [CostumeBadgeKind.Original]: {
      get label() {
        return 'Original'
      },
    },
    [CostumeBadgeKind.Mod]: {
      get label() {
        return 'Mod'
      },
    },
  }

  static badgeKindOf(current: CurrentSlot | null | undefined): CostumeBadgeKind {
    if (!current || current.kind === 'original') return CostumeBadgeKind.Original

    return CostumeBadgeKind.Mod
  }

  static getBadgeMeta(kind: CostumeBadgeKind | null | undefined): CostumeBadgeMeta {
    if (kind == null) return this.badgeMeta[CostumeBadgeKind.Original]

    return this.badgeMeta[kind]
  }

  static proposalThumbOf(code: string, vid: string, variantId: string | null | undefined): string | null {
    const skin = skinOf(vid)

    if (!variantId) return thumbOf(skin)

    const alt = driveAlts.value.find(
      (item) => item.code === code && (item.vid === vid || (skin && item.mod_id === String(skin.id))),
    )
    const variant = alt?.variants?.find((entry) => entry.id === variantId)

    if (variant && isSha(variant.portrait)) return portraitUrl(variant.portrait)

    return null
  }
}
```

> **Invariante de honestidad visual (`AGENTS.md`):** Si la propuesta guarda un `variantId` concreto y su `DriveVariant.portrait` es `null`, `proposalThumbOf` devuelve `null` (`Sin retrato`) en vez de tomar prestado el arte general del pack o de otro color.

- [ ] **Step 2: Crear `useCostumeStrip.ts` y `CostumeStrip.vue`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useCostumeStrip.ts`:

```ts
import { computed, nextTick, shallowRef } from 'vue'
import { tick } from '../../../composables/useApp'
import type { ProposalRow } from '../../../shared/helpers/ssbu'
import { currentName } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { lastSavedPulse, zoomImage } from '../../plan/composables/usePlan'
import { usePerson } from '../../plan/composables/usePerson'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { proposalsAt } from '../../plan/services/sync'
import { CostumeBadgeKind } from '../enums/CostumeBadgeKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface StripCell {
  n: number
  number: number
  img: string | null
  badge: string
  isOriginal: boolean
  isActive: boolean
  hasOwnProposal: boolean
  ownThumb: string | null
  hasFriendProposal: boolean
  isPulsing: boolean
  ariaLabel: string
}

interface UseCostumeStripProps {
  fighterCode: string
  activeSlot: number
}

interface UseCostumeStripEmits {
  (event: 'selectSlot', slot: number): void
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

export const useCostumeStrip = (props: UseCostumeStripProps, emit: UseCostumeStripEmits) => {
  const buttonRefs = shallowRef<Array<HTMLButtonElement | null>>([])
  const { activePerson } = usePerson()

  const cells = computed<StripCell[]>(() => {
    tick.value

    const person = activePerson.value
    const pulse = lastSavedPulse.value

    return SLOTS.map((n) => {
      const current = curOf(props.fighterCode, n)
      const badgeKind = CostumeHelper.badgeKindOf(current)
      const badge = CostumeHelper.getBadgeMeta(badgeKind).label
      const proposals = proposalsAt(props.fighterCode, n) as ProposalRow[]
      const own = person ? proposals.find((row) => row.name === person) ?? null : null
      const friends = proposals.filter((row) => !person || row.name !== person)
      const ownSkin = own ? skinOf(own.vid) : null
      const installedLabel = badgeKind === CostumeBadgeKind.Original ? 'Original' : `Mod (${currentName(current)})`
      const parts = [trajeName(n), installedLabel]

      if (own) parts.push(`Tu propuesta: ${ownSkin ? ownSkin.name : own.vid}`)
      if (friends.length) {
        const names = friends.map((row) => PlanHelper.personLabel(row.name)).join(', ')

        parts.push(`Propuestas de ${names}`)
      }

      return {
        n,
        number: n + 1,
        img: current?.img || null,
        badge,
        isOriginal: badgeKind === CostumeBadgeKind.Original,
        isActive: props.activeSlot === n,
        hasOwnProposal: Boolean(own),
        ownThumb: own ? CostumeHelper.proposalThumbOf(props.fighterCode, own.vid, own.variant) : null,
        hasFriendProposal: friends.length > 0,
        isPulsing: Boolean(pulse && pulse.code === props.fighterCode && pulse.slot === n && Date.now() - pulse.at < 900),
        ariaLabel: parts.join(', '),
      }
    })
  })

  const setButtonRef = (slot: number, element: unknown) => {
    buttonRefs.value[slot] = element instanceof HTMLButtonElement ? element : null
  }

  const onCellClick = (cell: StripCell) => {
    if (cell.isActive) {
      if (cell.img) zoomImage(`${trajeName(cell.n)} · ${cell.badge}`, cell.img)

      return
    }

    emit('selectSlot', cell.n)
  }

  const onStripKeydown = (event: KeyboardEvent, slot: number) => {
    let next = -1

    if (event.key === 'ArrowRight') next = (slot + 1) % 8
    else if (event.key === 'ArrowLeft') next = (slot + 7) % 8
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 7

    if (next < 0) return

    event.preventDefault()
    emit('selectSlot', next)
    void nextTick(() => {
      buttonRefs.value[next]?.focus()
    })
  }

  return {
    cells,
    setButtonRef,
    onCellClick,
    onStripKeydown,
  }
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/components/CostumeStrip.vue`:

```vue
<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import AppImg from '../../../components/AppImg.vue'
import { useCostumeStrip } from '../composables/useCostumeStrip'

interface CostumeStripProps {
  fighterCode: string
  activeSlot: number
}

interface CostumeStripEmits {
  selectSlot: [slot: number]
}

const props = defineProps<CostumeStripProps>()
const emit = defineEmits<CostumeStripEmits>()

const MotionSpan = motion.span

const {
  cells,
  setButtonRef,
  onCellClick,
  onStripKeydown,
} = useCostumeStrip(props, emit)
</script>

<template>
  <LayoutGroup id="costume-strip">
    <div class="costume-strip" role="group" aria-label="Trajes del luchador">
      <button
        v-for="cell in cells"
        :key="cell.n"
        :ref="(el) => setButtonRef(cell.n, el)"
        type="button"
        class="costume-cell"
        :class="{
          'costume-cell--active': cell.isActive,
          'costume-cell--own': cell.hasOwnProposal,
          'costume-cell--pulse': cell.isPulsing,
        }"
        :aria-label="cell.ariaLabel"
        :aria-pressed="cell.isActive"
        :data-costume="cell.n"
        @click="onCellClick(cell)"
        @keydown="onStripKeydown($event, cell.n)"
      >
        <MotionSpan
          v-if="cell.isActive"
          layout-id="active-costume-frame"
          class="costume-cell__frame"
          aria-hidden="true"
        />

        <span class="costume-cell__art">
          <AppImg :src="cell.img" :eager="cell.isActive" :missing="cell.img ? '' : 'Sin retrato'" fit="contain" />
          <span class="costume-cell__num" aria-hidden="true">{{ cell.number }}</span>
          <span v-if="cell.hasOwnProposal" class="costume-cell__corner" aria-hidden="true">
            <AppImg :src="cell.ownThumb" :missing="cell.ownThumb ? '' : '★'" fit="cover" />
          </span>
          <span
            v-else-if="cell.hasFriendProposal"
            class="costume-cell__friend-dot"
            data-friend-dot
            aria-hidden="true"
          ></span>
        </span>

        <span
          class="costume-cell__badge"
          :class="{ 'costume-cell__badge--mod': !cell.isOriginal }"
          aria-hidden="true"
        >
          {{ cell.badge }}
        </span>
      </button>
    </div>
  </LayoutGroup>
</template>
```

- [ ] **Step 3: Crear `useActiveCostumeBar.ts` y `ActiveCostumeBar.vue` (1 línea + «Otro color» + `Quitar`)**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useActiveCostumeBar.ts`:

```ts
import { computed } from 'vue'
import { setSkin, tick } from '../../../composables/useApp'
import { currentName } from '../../../shared/helpers/skins'
import { norm, trajeName } from '../../../shared/helpers/text'
import { clearAt, zoomImage } from '../../plan/composables/usePlan'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { ownVariant, ownVid } from '../../plan/services/sync'
import { driveAlts } from '../../roster/driveAlts'

interface UseActiveCostumeBarProps {
  fighterCode: string
  activeSlot: number
}

const variantSuffix = (variantId: string | null) => {
  if (!variantId) return ''

  const match = /:c0([0-7])$/.exec(variantId)

  return match ? ` (Color ${Number(match[1]) + 1})` : ''
}

export const useActiveCostumeBar = (props: UseActiveCostumeBarProps) => {
  const current = computed(() => {
    tick.value

    return curOf(props.fighterCode, props.activeSlot)
  })

  const slotLabel = computed(() => trajeName(props.activeSlot))

  const installedName = computed(() => {
    const slot = current.value

    if (!slot || slot.kind === 'original') return 'Original'

    return currentName(slot) || 'Mod'
  })

  const installedImg = computed(() => current.value?.img || null)

  const ownProposalName = computed<string | null>(() => {
    tick.value

    const vid = ownVid(props.fighterCode, props.activeSlot) as string | null

    if (!vid) return null

    const variant = ownVariant(props.fighterCode, props.activeSlot) as string | null
    const skin = skinOf(vid)

    return (skin ? skin.name : vid) + variantSuffix(variant)
  })

  const moveCandidateVid = computed<string | null>(() => {
    tick.value

    const slot = current.value

    if (!slot || slot.kind === 'original') return null
    if (slot.vid && skinOf(slot.vid)) return slot.vid

    const targetName = norm(slot.name || '')

    if (!targetName) return null

    const matchedAlt = driveAlts.value.find(
      (alt) => alt.code === props.fighterCode && alt.vid && norm(alt.name) === targetName,
    )

    return matchedAlt?.vid && skinOf(matchedAlt.vid) ? matchedAlt.vid : null
  })

  const zoomCurrent = () => {
    if (!installedImg.value) return

    zoomImage(`${slotLabel.value} · ${installedName.value}`, installedImg.value)
  }

  const openMoveColor = () => {
    if (!moveCandidateVid.value) return

    setSkin(moveCandidateVid.value)
  }

  const clearOwn = () => {
    clearAt(props.fighterCode, props.activeSlot)
  }

  return {
    slotLabel,
    installedName,
    installedImg,
    ownProposalName,
    moveCandidateVid,
    zoomCurrent,
    openMoveColor,
    clearOwn,
  }
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/components/ActiveCostumeBar.vue`:

```vue
<script setup lang="ts">
import AppImg from '../../../components/AppImg.vue'
import { useActiveCostumeBar } from '../composables/useActiveCostumeBar'

interface ActiveCostumeBarProps {
  fighterCode: string
  activeSlot: number
}

const props = defineProps<ActiveCostumeBarProps>()

const {
  slotLabel,
  installedName,
  installedImg,
  ownProposalName,
  moveCandidateVid,
  zoomCurrent,
  openMoveColor,
  clearOwn,
} = useActiveCostumeBar(props)
</script>

<template>
  <div class="active-bar" data-active-costume>
    <button
      type="button"
      class="active-bar__preview"
      :aria-label="'Ampliar imagen de ' + slotLabel + ', ' + installedName"
      @click="zoomCurrent"
    >
      <span class="active-bar__thumb">
        <AppImg :src="installedImg" :eager="true" :missing="installedImg ? '' : 'Sin retrato'" fit="contain" />
      </span>
      <span class="active-bar__txt">
        <span class="active-bar__slot">{{ slotLabel }}</span>
        <span class="active-bar__sep" aria-hidden="true">·</span>
        <span class="active-bar__name">{{ installedName }}</span>
        <span v-if="ownProposalName" class="active-bar__own">→ {{ ownProposalName }}</span>
      </span>
    </button>

    <div class="active-bar__actions">
      <button
        v-if="moveCandidateVid"
        type="button"
        class="chip active-bar__btn"
        data-move-color
        @click="openMoveColor"
      >
        Otro color
      </button>
      <button
        v-if="ownProposalName"
        type="button"
        class="chip active-bar__btn active-bar__btn--clear"
        data-act="clear"
        :aria-label="'Quitar tu propuesta de ' + slotLabel"
        @click="clearOwn"
      >
        Quitar
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Verificar `self-check.mjs` y commitear Task 3**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs --all src/features/fighters/enums/CostumeBadgeKind.ts src/features/fighters/helpers/costume.helper.ts src/features/fighters/composables/useCostumeStrip.ts src/features/fighters/components/CostumeStrip.vue src/features/fighters/composables/useActiveCostumeBar.ts src/features/fighters/components/ActiveCostumeBar.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins add src/features/fighters/enums/CostumeBadgeKind.ts src/features/fighters/helpers/costume.helper.ts src/features/fighters/composables/useCostumeStrip.ts src/features/fighters/components/CostumeStrip.vue src/features/fighters/composables/useActiveCostumeBar.ts src/features/fighters/components/ActiveCostumeBar.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(fighters): add 8-costume sticky strip and active costume bar"
```
Expected: `Self-check TS: 0 pendientes`.

---

### Task 4: Vista previa, variantes, familias de color y propuesta (`SkinSheet.vue` + `useSkinSheet.ts`)

**Files:**
- Create: `src/features/fighters/enums/SkinActionKind.ts`
- Create: `src/features/fighters/composables/useSkinSheet.ts`
- Create: `src/features/fighters/components/SkinSheet.vue`

- [ ] **Step 1: Crear `SkinActionKind.ts` y `useSkinSheet.ts`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/enums/SkinActionKind.ts`:

```ts
export enum SkinActionKind {
  Replace = 'replace',
  Clear = 'clear',
  Jump = 'jump',
  Blocked = 'blocked',
}
```

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useSkinSheet.ts`:

```ts
import { computed, ref, watch } from 'vue'
import { selectSlot, setSkin, tick } from '../../../composables/useApp'
import { useDesktop } from '../../../composables/useDesktop'
import { isSha, portraitUrl } from '../../../shared/helpers/portraits'
import { SSBU, type PlanRow, type ProposalRow } from '../../../shared/helpers/ssbu'
import { currentName, thumbOf } from '../../../shared/helpers/skins'
import { trajeName } from '../../../shared/helpers/text'
import { clearAt, proposeAt, showNotice, zoomImage, zoomSkin } from '../../plan/composables/usePlan'
import { usePerson } from '../../plan/composables/usePerson'
import { PlanHelper } from '../../plan/helpers/plan.helper'
import { curOf, skinOf } from '../../plan/helpers/lookup'
import { ownEntries, ownVariant, ownVid, proposalsAt } from '../../plan/services/sync'
import { downloadedVids, driveAlts, type DriveVariant } from '../../roster/driveAlts'
import { SkinActionKind } from '../enums/SkinActionKind'
import { CostumeHelper } from '../helpers/costume.helper'

export interface VariantOption {
  id: string
  slotNumber: number
  label: string
  portrait: string | null
  isSelected: boolean
}

export interface DestinationChip {
  slot: number
  label: string
  isCompatible: boolean
  isSelected: boolean
  hasOwnProposal: boolean
  hasFriendProposal: boolean
}

export interface FriendSlotProposal {
  key: string
  person: string
  skinName: string
  thumb: string | null
}

interface UseSkinSheetProps {
  fighterCode: string
  activeSlot: number
  candidateVid: string
}

interface UseSkinSheetEmits {
  (event: 'close'): void
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

export const useSkinSheet = (props: UseSkinSheetProps, emit: UseSkinSheetEmits) => {
  const desktop = useDesktop()
  const { activePerson } = usePerson()
  const targetSlot = ref(props.activeSlot)
  const selectedVariantId = ref<string | null>(null)

  const skin = computed(() => {
    tick.value

    if (!props.candidateVid) return null

    return skinOf(props.candidateVid) || null
  })

  const isOpen = computed(() => Boolean(skin.value))

  const matchedAlt = computed(() => {
    const currentSkin = skin.value

    if (!currentSkin) return null

    return (
      driveAlts.value.find(
        (alt) =>
          alt.code === props.fighterCode
          && (alt.vid === currentSkin.vid || alt.mod_id === String(currentSkin.id)),
      ) ?? null
    )
  })

  const rawVariants = computed<DriveVariant[]>(() => matchedAlt.value?.variants ?? [])

  const selectedVariant = computed<DriveVariant | null>(() => {
    const list = rawVariants.value

    if (!list.length) return null

    if (selectedVariantId.value) {
      const hit = list.find((item) => item.id === selectedVariantId.value)

      if (hit) return hit
    }

    return list[0] ?? null
  })

  const variantOptions = computed<VariantOption[]>(() => {
    const list = rawVariants.value

    if (list.length <= 1) return []

    const activeId = selectedVariant.value?.id ?? null

    return list.map((variant) => ({
      id: variant.id,
      slotNumber: variant.slot,
      label: 'Color ' + variant.slot,
      portrait: isSha(variant.portrait) ? portraitUrl(variant.portrait) : null,
      isSelected: variant.id === activeId,
    }))
  })

  const candidateImage = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin) return null

    const activeVar = selectedVariant.value

    if (activeVar) {
      return isSha(activeVar.portrait) ? portraitUrl(activeVar.portrait) : null
    }

    return thumbOf(currentSkin)
  })

  const authorLabel = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin || !currentSkin.audited || !currentSkin.author || currentSkin.author === 'pending') {
      return null
    }

    return currentSkin.author
  })

  const isDownloaded = computed(() => {
    const currentSkin = skin.value

    if (!currentSkin) return false

    return downloadedVids().has(currentSkin.vid) || Boolean(matchedAlt.value)
  })

  const externalModUrl = computed<string | null>(() => {
    const currentSkin = skin.value

    if (!currentSkin || isDownloaded.value || !currentSkin.url) return null

    return currentSkin.url
  })

  const compatibleSlots = computed<number[]>(() => {
    const currentSkin = skin.value

    if (!currentSkin) return SLOTS

    const sourceSlots = SSBU.sourceSlotsOf({
      variant: selectedVariant.value?.id ?? null,
      alt: matchedAlt.value,
      skin: currentSkin,
    })

    return SSBU.compatibleSlots(props.fighterCode, sourceSlots)
  })

  const hasIncompatibleSlots = computed(() => compatibleSlots.value.length < 8)

  const destinationChips = computed<DestinationChip[]>(() => {
    tick.value

    const allowed = compatibleSlots.value
    const person = activePerson.value

    return SLOTS.map((slot) => {
      const list = proposalsAt(props.fighterCode, slot) as ProposalRow[]
      const hasOwn = Boolean(person && list.some((row) => row.name === person))
      const hasFriend = list.some((row) => !person || row.name !== person)

      return {
        slot,
        label: trajeName(slot),
        isCompatible: allowed.includes(slot),
        isSelected: targetSlot.value === slot,
        hasOwnProposal: hasOwn,
        hasFriendProposal: hasFriend,
      }
    })
  })

  const targetCurrent = computed(() => {
    tick.value

    return curOf(props.fighterCode, targetSlot.value)
  })

  const targetCurrentName = computed(() => {
    const slot = targetCurrent.value

    if (!slot || slot.kind === 'original') return 'Original'

    return currentName(slot) || 'Mod'
  })

  const targetCurrentImg = computed(() => targetCurrent.value?.img || null)

  const friendProposalsOnTarget = computed<FriendSlotProposal[]>(() => {
    tick.value

    const person = activePerson.value
    const rows = proposalsAt(props.fighterCode, targetSlot.value) as ProposalRow[]

    return rows
      .filter((row) => !person || row.name !== person)
      .map((row) => {
        const rowSkin = skinOf(row.vid)

        return {
          key: row.key,
          person: PlanHelper.personLabel(row.name),
          skinName: rowSkin ? rowSkin.name : row.vid,
          thumb: CostumeHelper.proposalThumbOf(props.fighterCode, row.vid, row.variant),
        }
      })
  })

  const effectiveVariantId = computed<string | null>(() => {
    if (!rawVariants.value.length) return null

    return selectedVariant.value?.id ?? null
  })

  const actionState = computed(() => {
    tick.value

    const currentSkin = skin.value

    if (!currentSkin) {
      return { kind: SkinActionKind.Blocked, label: 'Reemplazar', otherSlot: null as number | null }
    }

    if (!compatibleSlots.value.includes(targetSlot.value)) {
      return { kind: SkinActionKind.Blocked, label: 'Color no compatible', otherSlot: null as number | null }
    }

    const slot = targetSlot.value
    const variantId = effectiveVariantId.value
    const currentOwnVid = ownVid(props.fighterCode, slot) as string | null
    const currentOwnVar = ownVariant(props.fighterCode, slot) as string | null

    if (currentOwnVid === currentSkin.vid && (currentOwnVar || null) === variantId) {
      return {
        kind: SkinActionKind.Clear,
        label: 'Quitar propuesta',
        otherSlot: null as number | null,
      }
    }

    const block = SSBU.assignBlock(
      ownEntries() as PlanRow[],
      props.fighterCode,
      slot,
      currentSkin.vid,
      variantId,
    )

    if (block.kind === 'duplicate' && typeof block.otherSlot === 'number') {
      return {
        kind: SkinActionKind.Jump,
        label: 'Ir a ' + trajeName(block.otherSlot),
        otherSlot: block.otherSlot,
      }
    }

    return {
      kind: SkinActionKind.Replace,
      label: 'Reemplazar',
      otherSlot: null as number | null,
    }
  })

  const chooseVariant = (variantId: string) => {
    selectedVariantId.value = variantId
  }

  const chooseDestination = (chip: DestinationChip) => {
    if (!chip.isCompatible) return

    targetSlot.value = chip.slot
  }

  const zoomCandidate = () => {
    const currentSkin = skin.value

    if (!currentSkin) return

    if (selectedVariant.value && candidateImage.value) {
      zoomImage(`${currentSkin.name} · Color ${selectedVariant.value.slot}`, candidateImage.value)

      return
    }

    if (!selectedVariant.value) zoomSkin(currentSkin, 0)
  }

  const zoomTargetCurrent = () => {
    if (!targetCurrentImg.value) return

    zoomImage(`${trajeName(targetSlot.value)} · ${targetCurrentName.value}`, targetCurrentImg.value)
  }

  const runPrimaryAction = () => {
    const currentSkin = skin.value
    const stateNow = actionState.value

    if (!currentSkin || stateNow.kind === SkinActionKind.Blocked) return

    if (stateNow.kind === SkinActionKind.Jump && stateNow.otherSlot !== null) {
      selectSlot(stateNow.otherSlot, false)

      return
    }

    const destination = targetSlot.value

    if (stateNow.kind === SkinActionKind.Clear) {
      clearAt(props.fighterCode, destination)

      return
    }

    proposeAt(
      props.fighterCode,
      destination,
      currentSkin.vid,
      effectiveVariantId.value,
      () => {
        if (desktop.value) selectSlot(destination, true)
        else {
          selectSlot(destination, false)
          setSkin('')
        }

        showNotice(
          `Propuesta guardada · ${trajeName(destination)}`,
          {
            label: 'Deshacer',
            fn: () => {
              clearAt(props.fighterCode, destination)
            },
          },
          5000,
        )
      },
    )
  }

  const onDrawerOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen.value) emit('close')
  }

  watch(
    () => [props.fighterCode, props.candidateVid] as const,
    () => {
      const variants = rawVariants.value

      if (!variants.length) {
        selectedVariantId.value = null

        return
      }

      const matchingActive = variants.find((item) => item.slot === props.activeSlot + 1)

      selectedVariantId.value = (matchingActive ?? variants[0])?.id ?? null
    },
    { immediate: true },
  )

  watch(
    () => [props.fighterCode, props.activeSlot, props.candidateVid, compatibleSlots.value.join(',')] as const,
    () => {
      if (compatibleSlots.value.includes(props.activeSlot)) {
        targetSlot.value = props.activeSlot

        return
      }

      targetSlot.value = compatibleSlots.value[0] ?? props.activeSlot
    },
    { immediate: true },
  )

  return {
    desktop,
    skin,
    isOpen,
    candidateImage,
    authorLabel,
    variantOptions,
    destinationChips,
    hasIncompatibleSlots,
    targetSlot,
    targetCurrentName,
    targetCurrentImg,
    friendProposalsOnTarget,
    externalModUrl,
    actionState,
    chooseVariant,
    chooseDestination,
    zoomCandidate,
    zoomTargetCurrent,
    runPrimaryAction,
    onDrawerOpenChange,
  }
}
```

- [ ] **Step 2: Crear `SkinSheet.vue` (`vaul-vue` en móvil y `<aside>` sticky en escritorio)**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/components/SkinSheet.vue`:

```vue
<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import {
  DrawerClose,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
} from 'vaul-vue'
import AppImg from '../../../components/AppImg.vue'
import { trajeName } from '../../../shared/helpers/text'
import { SkinActionKind } from '../enums/SkinActionKind'
import { useSkinSheet } from '../composables/useSkinSheet'

interface SkinSheetProps {
  fighterCode: string
  activeSlot: number
  candidateVid: string
}

interface SkinSheetEmits {
  close: []
}

const props = defineProps<SkinSheetProps>()
const emit = defineEmits<SkinSheetEmits>()

const MotionSpan = motion.span

const {
  desktop,
  skin,
  isOpen,
  candidateImage,
  authorLabel,
  variantOptions,
  destinationChips,
  hasIncompatibleSlots,
  targetSlot,
  targetCurrentName,
  targetCurrentImg,
  friendProposalsOnTarget,
  externalModUrl,
  actionState,
  chooseVariant,
  chooseDestination,
  zoomCandidate,
  zoomTargetCurrent,
  runPrimaryAction,
  onDrawerOpenChange,
} = useSkinSheet(props, emit)
</script>

<template>
  <aside v-if="desktop" class="skin-panel" aria-label="Vista previa y propuesta">
    <div v-if="!skin" class="skin-panel__empty">
      <p class="skin-panel__hint">Toca una skin de la cuadrícula para previsualizarla y elegir en qué traje va.</p>
    </div>

    <div v-else class="skin-sheet-body">
      <div class="skin-sheet-body__head">
        <div>
          <h2 class="sheet__h">{{ skin.name }}</h2>
          <p v-if="authorLabel" class="skin-sheet-body__author">por {{ authorLabel }}</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Cerrar vista previa" @click="emit('close')">✕</button>
      </div>

      <div class="skin-compare">
        <button
          type="button"
          class="skin-compare__cand"
          :aria-label="'Ampliar ' + skin.name"
          @click="zoomCandidate"
        >
          <AppImg :src="candidateImage" :eager="true" :missing="candidateImage ? '' : 'Sin retrato'" fit="contain" />
        </button>

        <button
          type="button"
          class="skin-compare__cur"
          :aria-label="'Ampliar actual de ' + trajeName(targetSlot) + ', ' + targetCurrentName"
          @click="zoomTargetCurrent"
        >
          <span class="skin-compare__cur-img">
            <AppImg :src="targetCurrentImg" :missing="targetCurrentImg ? '' : 'Sin retrato'" fit="contain" />
          </span>
          <span class="skin-compare__cur-lbl">Actual: {{ targetCurrentName }}</span>
        </button>
      </div>

      <LayoutGroup v-if="variantOptions.length" id="skin-variants-desktop">
        <div class="skin-variants" role="group" aria-label="Color de origen del mod">
          <button
            v-for="option in variantOptions"
            :key="option.id"
            type="button"
            class="variant-chip"
            :class="{ 'variant-chip--on': option.isSelected }"
            :aria-pressed="option.isSelected"
            :data-variant="option.id"
            @click="chooseVariant(option.id)"
          >
            <MotionSpan v-if="option.isSelected" layout-id="active-variant-chip-desktop" class="variant-chip__bg" aria-hidden="true" />
            <span class="variant-chip__txt">{{ option.label }}</span>
          </button>
        </div>
      </LayoutGroup>

      <div class="skin-dest">
        <span class="skin-dest__title">¿En qué traje va?</span>
        <div class="skin-dest__grid" role="group" aria-label="Traje de destino">
          <button
            v-for="chip in destinationChips"
            :key="chip.slot"
            type="button"
            class="dest-chip"
            :class="{
              'dest-chip--on': chip.isSelected,
              'dest-chip--disabled': !chip.isCompatible,
              'dest-chip--own': chip.hasOwnProposal,
            }"
            :aria-pressed="chip.isSelected"
            :aria-disabled="!chip.isCompatible ? 'true' : undefined"
            :aria-describedby="!chip.isCompatible ? 'family-lock-reason-d' : undefined"
            :data-dest-slot="chip.slot"
            @click="chooseDestination(chip)"
          >
            <span>{{ chip.label }}</span>
            <span v-if="chip.hasFriendProposal" class="dest-chip__dot" aria-hidden="true"></span>
          </button>
        </div>
        <p v-if="hasIncompatibleSlots" id="family-lock-reason-d" class="skin-dest__note">
          Los trajes atenuados usan otro modelo base del luchador y no son compatibles con este color.
        </p>
      </div>

      <div v-if="friendProposalsOnTarget.length" class="skin-friends" aria-label="Propuestas de amigos en este traje">
        <div v-for="friend in friendProposalsOnTarget" :key="friend.key" class="skin-friends__row">
          <span class="skin-friends__thumb">
            <AppImg :src="friend.thumb" :missing="friend.thumb ? '' : '★'" fit="cover" />
          </span>
          <span class="skin-friends__txt">
            <b>{{ friend.person }}:</b> {{ friend.skinName }}
          </span>
        </div>
      </div>

      <div class="skin-sheet-body__foot">
        <button
          type="button"
          class="btn-main skin-sheet-body__cta"
          :aria-disabled="actionState.kind === SkinActionKind.Blocked ? 'true' : undefined"
          :data-act="actionState.kind"
          @click="runPrimaryAction"
        >
          {{ actionState.label }}
        </button>

        <a
          v-if="externalModUrl"
          :href="externalModUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="skin-sheet-body__ext"
        >
          Ver página del mod ↗
        </a>
      </div>
    </div>
  </aside>

  <DrawerRoot v-else :open="isOpen" @update:open="onDrawerOpenChange">
    <DrawerPortal>
      <DrawerOverlay class="vaul-overlay" />
      <DrawerContent v-if="skin" class="vaul-sheet sheet sheet--skin">
        <div class="sheet__grab" aria-hidden="true"></div>
        <div class="sheet__head">
          <div>
            <DrawerTitle class="sheet__h">{{ skin.name }}</DrawerTitle>
            <p v-if="authorLabel" class="skin-sheet-body__author">por {{ authorLabel }}</p>
          </div>
          <DrawerClose as-child>
            <button type="button" class="icon-btn" aria-label="Cerrar">✕</button>
          </DrawerClose>
        </div>

        <div class="sheet__scroll skin-sheet-body">
          <div class="skin-compare">
            <button
              type="button"
              class="skin-compare__cand"
              :aria-label="'Ampliar ' + skin.name"
              @click="zoomCandidate"
            >
              <AppImg :src="candidateImage" :eager="true" :missing="candidateImage ? '' : 'Sin retrato'" fit="contain" />
            </button>

            <button
              type="button"
              class="skin-compare__cur"
              :aria-label="'Ampliar actual de ' + trajeName(targetSlot) + ', ' + targetCurrentName"
              @click="zoomTargetCurrent"
            >
              <span class="skin-compare__cur-img">
                <AppImg :src="targetCurrentImg" :missing="targetCurrentImg ? '' : 'Sin retrato'" fit="contain" />
              </span>
              <span class="skin-compare__cur-lbl">Actual: {{ targetCurrentName }}</span>
            </button>
          </div>

          <LayoutGroup v-if="variantOptions.length" id="skin-variants-mobile">
            <div class="skin-variants" role="group" aria-label="Color de origen del mod">
              <button
                v-for="option in variantOptions"
                :key="option.id"
                type="button"
                class="variant-chip"
                :class="{ 'variant-chip--on': option.isSelected }"
                :aria-pressed="option.isSelected"
                :data-variant="option.id"
                @click="chooseVariant(option.id)"
              >
                <MotionSpan v-if="option.isSelected" layout-id="active-variant-chip-mobile" class="variant-chip__bg" aria-hidden="true" />
                <span class="variant-chip__txt">{{ option.label }}</span>
              </button>
            </div>
          </LayoutGroup>

          <div class="skin-dest">
            <span class="skin-dest__title">¿En qué traje va?</span>
            <div class="skin-dest__grid" role="group" aria-label="Traje de destino">
              <button
                v-for="chip in destinationChips"
                :key="chip.slot"
                type="button"
                class="dest-chip"
                :class="{
                  'dest-chip--on': chip.isSelected,
                  'dest-chip--disabled': !chip.isCompatible,
                  'dest-chip--own': chip.hasOwnProposal,
                }"
                :aria-pressed="chip.isSelected"
                :aria-disabled="!chip.isCompatible ? 'true' : undefined"
                :aria-describedby="!chip.isCompatible ? 'family-lock-reason-m' : undefined"
                :data-dest-slot="chip.slot"
                @click="chooseDestination(chip)"
              >
                <span>{{ chip.label }}</span>
                <span v-if="chip.hasFriendProposal" class="dest-chip__dot" aria-hidden="true"></span>
              </button>
            </div>
            <p v-if="hasIncompatibleSlots" id="family-lock-reason-m" class="skin-dest__note">
              Los trajes atenuados usan otro modelo base del luchador y no son compatibles con este color.
            </p>
          </div>

          <div v-if="friendProposalsOnTarget.length" class="skin-friends" aria-label="Propuestas de amigos en este traje">
            <div v-for="friend in friendProposalsOnTarget" :key="friend.key" class="skin-friends__row">
              <span class="skin-friends__thumb">
                <AppImg :src="friend.thumb" :missing="friend.thumb ? '' : '★'" fit="cover" />
              </span>
              <span class="skin-friends__txt">
                <b>{{ friend.person }}:</b> {{ friend.skinName }}
              </span>
            </div>
          </div>

          <div class="skin-sheet-body__foot">
            <button
              type="button"
              class="btn-main skin-sheet-body__cta"
              :aria-disabled="actionState.kind === SkinActionKind.Blocked ? 'true' : undefined"
              :data-act="actionState.kind"
              @click="runPrimaryAction"
            >
              {{ actionState.label }}
            </button>

            <a
              v-if="externalModUrl"
              :href="externalModUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="skin-sheet-body__ext"
            >
              Ver página del mod ↗
            </a>
          </div>
        </div>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>
```

> **Por qué usamos `aria-disabled="true"` + `aria-describedby` en los destinos incompatibles:**
> De acuerdo con las guías de accesibilidad modernas, `disabled` expulsa el chip del orden de tabulación sin dejar que un usuario de teclado o lector de pantalla descubra por qué ese traje no puede elegirse; `aria-disabled="true"` mantiene el foco, anuncia la explicación visible (`family-lock-reason-*`) y bloquea la selección en `chooseDestination`.

- [ ] **Step 3: Verificar `self-check.mjs` y commitear Task 4**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs --all src/features/fighters/enums/SkinActionKind.ts src/features/fighters/composables/useSkinSheet.ts src/features/fighters/components/SkinSheet.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins add src/features/fighters/enums/SkinActionKind.ts src/features/fighters/composables/useSkinSheet.ts src/features/fighters/components/SkinSheet.vue
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(fighters): add SkinSheet with variant portraits and family slot lock"
```
Expected: `Self-check TS: 0 pendientes`.

---

### Task 5: `FighterPage`, gestos (`usePointerSwipe`, `onKeyStroke`), estilos View Transitions y limpieza de vistas retiradas

**Files:**
- Modify: `src/features/fighters/components/SkinGrid.vue`
- Modify: `src/pages/composables/useFighterPage.ts`
- Modify: `src/pages/FighterPage.vue`
- Modify: `src/app.css`
- Delete: `src/pages/RosterPage.vue`, `src/pages/CatalogPage.vue`, `src/pages/composables/useRosterPage.ts`, `src/pages/composables/useCatalogPage.ts`, `src/features/explore/components/ExploreBar.vue`, `src/features/roster/components/RosterRow.vue`, `src/features/fighters/components/CostumeGrid.vue`, `src/features/fighters/components/Destinations.vue`, `src/features/fighters/components/CompareCards.vue`, `src/features/fighters/components/CompareBar.vue`, `src/features/fighters/components/PlacingBand.vue`

- [ ] **Step 1: Proteger LCP en `SkinGrid.vue` y actualizar `useFighterPage.ts` + `FighterPage.vue`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/components/SkinGrid.vue`:
   - Extraer `src/features/fighters/composables/useSkinGrid.ts` si se modifica el script, o mantener el `<script setup lang="ts">` limpio solo con `interface SkinGridProps`, `interface SkinGridEmits`, `defineProps`, `defineEmits` y `useGridDensity()`.
   - Cambiar `v-for="row in props.rows"` a `v-for="(row, index) in props.rows"` y pasar `:eager="index < 4"` al `<AppImg>` de la tarjeta para que las primeras 4 skins visibles nunca se retrasen con `loading="lazy"` (preservando `LCP < 2.5 s`).
2. Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/pages/composables/useFighterPage.ts`:

```ts
import { computed, ref } from 'vue'
import { onKeyStroke, usePointerSwipe } from '@vueuse/core'
import type { Skin } from '../../boot'
import {
  fighterOf,
  route,
  S,
  selectSlot,
  setSkin,
  skinParam,
  slotOf,
  stepFighter,
  tick,
  viewRoute,
} from '../../composables/useApp'
import { useDesktop } from '../../composables/useDesktop'
import { useOutOfView } from '../../composables/useOutOfView'
import { isOpenFighterPick, openFighterPick } from '../../features/explore/composables/useFighterPick'
import { zoomSkin } from '../../features/plan/composables/usePlan'
import { isOpenPerson } from '../../features/plan/composables/usePerson'
import { skinOf } from '../../features/plan/helpers/lookup'
import { ownEntries, ownVid } from '../../features/plan/services/sync'
import { downloadedVids, unauditedVids } from '../../features/roster/driveAlts'
import type { PlanRow } from '../../shared/helpers/ssbu'
import { thumbOf } from '../../shared/helpers/skins'
import { norm, trajeName } from '../../shared/helpers/text'

export interface SkinGridRow {
  vid: string
  name: string
  img: string | null
  chosen: boolean
  other: number | null
  label: string
  detail: string
  tag: string
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}

export const useFighterPage = () => {
  const desktop = useDesktop()
  const onlyDownloaded = ref(false)
  const swipeZone = ref<HTMLElement | null>(null)
  const topSentinel = ref<HTMLElement | null>(null)

  const showScrollTop = useOutOfView(topSentinel)

  const fighter = computed(() => {
    tick.value

    return fighterOf(viewRoute().code) || null
  })

  const fighterCode = computed(() => fighter.value?.code || '01')

  const activeSlot = computed(() => {
    tick.value

    return slotOf()
  })

  const candidateVid = computed(() => {
    tick.value

    return skinParam()
  })

  const isOverlayOpen = computed(() => {
    tick.value

    const mobileSheetOpen = !desktop.value && Boolean(candidateVid.value)
    const galleryOpen = typeof window !== 'undefined' && Boolean(window.PSWP)

    return (
      isOpenPerson.value
      || isOpenFighterPick.value
      || route.value.v === 'cambios'
      || mobileSheetOpen
      || galleryOpen
    )
  })

  const allPicks = computed<Skin[]>(() => {
    tick.value

    const currentFighter = fighter.value

    if (!currentFighter) return []

    const unaudited = unauditedVids()

    return currentFighter.picks.filter(
      (skin) => !skin.withdrawn && (skin.audited || unaudited.has(skin.vid)),
    )
  })

  const skinRows = computed<SkinGridRow[]>(() => {
    tick.value

    const code = fighterCode.value
    const slot = activeSlot.value
    const activeCandidate = candidateVid.value
    const currentOwnVid = ownVid(code, slot) as string | null
    const mine = (ownEntries() as PlanRow[]).filter((entry) => entry.code === code)
    const downloaded = downloadedVids()
    const unaudited = unauditedVids()
    const queryWords = norm(S.tc.q || '').split(/\s+/).filter(Boolean)

    const filtered = allPicks.value.filter((skin) => {
      if (onlyDownloaded.value && !downloaded.has(skin.vid)) return false
      if (!queryWords.length) return true

      const haystack = norm(skin.name + ' ' + (skin.author || ''))

      return queryWords.every((word) => haystack.includes(word))
    })

    const ordered = [...filtered].sort((left, right) => {
      const leftDl = downloaded.has(left.vid) ? 1 : 0
      const rightDl = downloaded.has(right.vid) ? 1 : 0

      if (leftDl !== rightDl) return rightDl - leftDl

      return left.name.localeCompare(right.name, 'es')
    })

    return ordered.map((skin) => {
      const isSelected = activeCandidate
        ? activeCandidate === skin.vid
        : currentOwnVid === skin.vid
      const elsewhere = mine.find((entry) => entry.vid === skin.vid && entry.n !== slot) ?? null
      const dl = downloaded.has(skin.vid)
      const tag = dl ? (unaudited.has(skin.vid) ? 'En Drive' : 'Descargada') : ''
      const labelParts = [skin.name]

      if (tag) labelParts.push(tag)
      if (elsewhere) labelParts.push('en ' + trajeName(elsewhere.n))

      return {
        vid: skin.vid,
        name: skin.name,
        img: thumbOf(skin),
        chosen: isSelected,
        other: elsewhere ? elsewhere.n : null,
        label: labelParts.join(', '),
        detail: 'Ampliar imágenes de ' + skin.name,
        tag,
      }
    })
  })

  const onSelectSlot = (slot: number) => {
    selectSlot(slot, true)
  }

  const onPickSkin = (vid: string) => {
    if (candidateVid.value === vid) {
      setSkin('')

      return
    }

    setSkin(vid)
  }

  const onDetailSkin = (vid: string) => {
    const target = skinOf(vid)

    if (target) zoomSkin(target, 0)
  }

  const onToggleDownloaded = () => {
    onlyDownloaded.value = !onlyDownloaded.value
  }

  const onCloseSkinSheet = () => {
    setSkin('')
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { direction, distanceX, distanceY } = usePointerSwipe(swipeZone, {
    threshold: 56,
    onSwipeEnd: () => {
      if (isOverlayOpen.value) return
      if (!['left', 'right'].includes(direction.value)) return
      if (Math.abs(distanceX.value) < 56) return
      if (Math.abs(distanceX.value) <= Math.abs(distanceY.value) * 1.8) return

      stepFighter(direction.value === 'left' ? 1 : -1)
    },
  })

  onKeyStroke(['ArrowLeft', 'ArrowRight', '/'], (event) => {
    if (isOverlayOpen.value || isEditableTarget(event.target)) return

    if (event.key === '/') {
      event.preventDefault()
      openFighterPick()

      return
    }

    event.preventDefault()
    stepFighter(event.key === 'ArrowRight' ? 1 : -1)
  })

  return {
    desktop,
    fighter,
    fighterCode,
    activeSlot,
    candidateVid,
    onlyDownloaded,
    allPicks,
    skinRows,
    swipeZone,
    topSentinel,
    showScrollTop,
    onSelectSlot,
    onPickSkin,
    onDetailSkin,
    onToggleDownloaded,
    onCloseSkinSheet,
    scrollToTop,
  }
}
```

3. Reemplazar `/Users/gian/Desktop/ssbu/ssbu-skins/src/pages/FighterPage.vue` por:

```vue
<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import ActiveCostumeBar from '../features/fighters/components/ActiveCostumeBar.vue'
import CostumeStrip from '../features/fighters/components/CostumeStrip.vue'
import SkinGrid from '../features/fighters/components/SkinGrid.vue'
import SkinSheet from '../features/fighters/components/SkinSheet.vue'
import { useFighterPage } from './composables/useFighterPage'

const MotionButton = motion.button

const {
  desktop,
  fighter,
  fighterCode,
  activeSlot,
  candidateVid,
  onlyDownloaded,
  allPicks,
  skinRows,
  swipeZone,
  topSentinel,
  showScrollTop,
  onSelectSlot,
  onPickSkin,
  onDetailSkin,
  onToggleDownloaded,
  onCloseSkinSheet,
  scrollToTop,
} = useFighterPage()
</script>

<template>
  <main
    v-if="fighter"
    id="main"
    class="fighter-page"
    :data-view="'fighter:' + fighterCode"
  >
    <div ref="topSentinel" class="top-sentinel" aria-hidden="true"></div>

    <div class="fighter-sticky">
      <div class="app-frame">
        <CostumeStrip
          :fighter-code="fighterCode"
          :active-slot="activeSlot"
          @select-slot="onSelectSlot"
        />
        <ActiveCostumeBar
          :fighter-code="fighterCode"
          :active-slot="activeSlot"
        />
      </div>
    </div>

    <div ref="swipeZone" class="app-frame fighter-stage">
      <div class="fighter-workspace" :class="{ 'fighter-workspace--split': desktop }">
        <SkinGrid
          :rows="skinRows"
          :total="allPicks.length"
          :only-downloaded="onlyDownloaded"
          @pick="onPickSkin"
          @detail="onDetailSkin"
          @toggle-downloaded="onToggleDownloaded"
        />

        <SkinSheet
          v-if="desktop || candidateVid"
          :fighter-code="fighterCode"
          :active-slot="activeSlot"
          :candidate-vid="candidateVid"
          @close="onCloseSkinSheet"
        />
      </div>
    </div>

    <AnimatePresence>
      <MotionButton
        v-if="showScrollTop"
        type="button"
        class="back-top-fab"
        aria-label="Volver arriba"
        :initial="{ opacity: 0, scale: 0.9, y: 12 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :exit="{ opacity: 0, scale: 0.9, y: 12 }"
        @click="scrollToTop"
      >
        ↑ Arriba
      </MotionButton>
    </AnimatePresence>
  </main>
</template>
```

- [ ] **Step 2: Añadir estilos de View Transitions, `CostumeStrip`, `ActiveCostumeBar`, `SkinSheet` y `vaul-vue` en `src/app.css`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/app.css` (**conservando intactos todos los tokens `:root` `--color-*`** para que `tests/unit/test_contrast.mjs` siga pasando):

1. Añadir las reglas de View Transitions sobre `.fighter-stage` (solo `transform` y `opacity` en el compositor, y desactivadas con `prefers-reduced-motion: reduce`):
   ```css
   .fighter-stage {
     view-transition-name: fighter-stage;
     touch-action: pan-y;
   }

   @keyframes fighter-slide-out-left {
     to {
       opacity: 0;
       transform: translateX(-18%);
     }
   }

   @keyframes fighter-slide-in-right {
     from {
       opacity: 0;
       transform: translateX(18%);
     }
   }

   @keyframes fighter-slide-out-right {
     to {
       opacity: 0;
       transform: translateX(18%);
     }
   }

   @keyframes fighter-slide-in-left {
     from {
       opacity: 0;
       transform: translateX(-18%);
     }
   }

   ::view-transition-group(fighter-stage) {
     animation-duration: 210ms;
     animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
   }

   html:active-view-transition-type(forward)::view-transition-old(fighter-stage) {
     animation-name: fighter-slide-out-left;
   }

   html:active-view-transition-type(forward)::view-transition-new(fighter-stage) {
     animation-name: fighter-slide-in-right;
   }

   html:active-view-transition-type(backward)::view-transition-old(fighter-stage) {
     animation-name: fighter-slide-out-right;
   }

   html:active-view-transition-type(backward)::view-transition-new(fighter-stage) {
     animation-name: fighter-slide-in-left;
   }

   @media (prefers-reduced-motion: reduce) {
     ::view-transition-group(*),
     ::view-transition-old(*),
     ::view-transition-new(*) {
       animation: none !important;
     }
   }
   ```
2. Añadir la geometría exacta de `.costume-strip` validada en el diseño:
   ```css
   .fighter-sticky {
     position: sticky;
     top: 56px;
     z-index: 20;
     background: var(--color-fondo);
     border-bottom: 1px solid var(--color-borde);
   }

   .costume-strip {
     display: grid;
     grid-template-columns: repeat(8, minmax(0, 1fr));
     gap: 2px;
     padding: 6px 4px 4px;
   }

   /* En <= 374.4px (320px reales o 390px con zoom de fuente al 170%) pasa a 4x2 sin truncar Original */
   @media (max-width: 23.4rem) {
     .costume-strip {
       grid-template-columns: repeat(4, minmax(0, 1fr));
       gap: 4px;
     }
   }

   .costume-cell {
     position: relative;
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: space-between;
     min-width: 44px;
     min-height: 58px;
     padding: 3px 2px;
     border: 1px solid var(--color-borde);
     border-radius: 10px;
     background: var(--color-superficie);
     color: var(--color-texto);
     cursor: pointer;
   }

   .costume-cell--own {
     border-color: var(--color-propuesta);
     border-width: 2px;
   }

   .costume-cell__frame {
     position: absolute;
     inset: -2px;
     border: 2px solid var(--color-acento);
     border-radius: 11px;
     pointer-events: none;
   }

   .costume-cell__art {
     position: relative;
     width: 100%;
     aspect-ratio: 1;
   }

   .costume-cell__num {
     position: absolute;
     top: 1px;
     left: 2px;
     font-size: 0.68rem;
     font-weight: 700;
     line-height: 1;
   }

   .costume-cell__corner {
     position: absolute;
     right: 0;
     bottom: 0;
     width: 16px;
     height: 16px;
     border-radius: 4px;
     overflow: hidden;
     border: 1.5px solid var(--color-propuesta);
     background: var(--color-fondo);
   }

   .costume-cell__friend-dot {
     position: absolute;
     right: 2px;
     bottom: 2px;
     width: 8px;
     height: 8px;
     border-radius: 999px;
     background: var(--color-propuesta);
   }

   .costume-cell__badge {
     font-size: 0.65rem;
     line-height: 1.1;
     color: var(--color-texto-2);
     white-space: nowrap;
   }

   .costume-cell__badge--mod {
     color: var(--color-texto);
     font-weight: 600;
   }
   ```
3. Añadir estilos de `.fighter-trigger`, `.active-bar`, `.fighter-workspace--split` (`grid-template-columns: minmax(0, 1fr) 390px; gap: 20px; align-items: start`), `.skin-panel` (`position: sticky; top: 156px; max-height: calc(100dvh - 172px); overflow-y: auto`), `.vaul-overlay` (`position: fixed; inset: 0; background: rgba(0, 0, 0, 0.62); z-index: 2100`, y `.vaul-overlay--top` / `.vaul-sheet--top` / `.person-dialog` con `z-index: 2300` para que `PersonSheet` abra siempre por encima de `SkinSheet`), `.dest-chip--disabled` (`opacity: 0.42; cursor: not-allowed`) y `.back-top-fab`.

- [ ] **Step 3: Eliminar páginas y componentes retirados y verificar ausencia de importaciones huérfanas**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && rm -f \
  src/pages/RosterPage.vue \
  src/pages/CatalogPage.vue \
  src/pages/composables/useRosterPage.ts \
  src/pages/composables/useCatalogPage.ts \
  src/features/explore/components/ExploreBar.vue \
  src/features/roster/components/RosterRow.vue \
  src/features/fighters/components/CostumeGrid.vue \
  src/features/fighters/components/Destinations.vue \
  src/features/fighters/components/CompareCards.vue \
  src/features/fighters/components/CompareBar.vue \
  src/features/fighters/components/PlacingBand.vue
```

Comprobar que no queda ninguna referencia rota ni copy prohibido en `src/`:
```bash
rg -n "RosterPage|CatalogPage|useRosterPage|useCatalogPage|ExploreBar|RosterRow|CostumeGrid|Destinations|CompareCards|CompareBar|PlacingBand|useReveal" /Users/gian/Desktop/ssbu/ssbu-skins/src
rg -n "Pack base|Plan de Gian|Traje [0-9]+ de 8|en tu perfil|Plan actualizado el|Elige un traje para compararlo" /Users/gian/Desktop/ssbu/ssbu-skins/src
```
Expected: `0` coincidencias en ambos comandos (si quedase alguna constante muerta en `RosterHelper` o `skins.ts` con esas cadenas, limpiarla en el acto sin romper `test_domain.mjs`).

- [ ] **Step 4: Ejecutar `typecheck`, pruebas unitarias y `self-check.mjs`, y commitear Task 5**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck
cd /Users/gian/Desktop/ssbu/ssbu-skins && node --test tests/unit/test_domain.mjs tests/unit/sync_ordering.js tests/unit/test_contrast.mjs
cd /Users/gian/Desktop/ssbu/ssbu-skins && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins add -A src/
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(ui): wire single-screen FighterPage, gestures, and remove retired views"
```
Expected: `vue-tsc --noEmit` sin errores, pruebas unitarias Node en verde (incluyendo `test_contrast.mjs`) y `Self-check TS: 0 pendientes`.

---

### Task 6: Adaptación de suites E2E, rendimiento (`LCP < 2.5 s`), accesibilidad multi-viewport y capturas

**Files:**
- Modify: `tests/e2e/lib.js`
- Modify: `tests/e2e/perf.js`
- Modify: `tests/e2e/identity.js`
- Modify: `tests/e2e/recorridos.js`
- Modify: `tests/e2e/ack-transition.js`
- Modify: `tests/e2e/sync-errors.js`
- Modify: `tests/e2e/local.spec.js`
- Modify: `tests/e2e/visual.spec.js`

- [ ] **Step 1: Actualizar `tests/e2e/lib.js`, `perf.js`, `ack-transition.js` y `sync-errors.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/lib.js` (`pick(p, base, code, n, name)`):
   - Al elegir una skin automática para el slot `n`, filtrar además por compatibilidad de familia con `SSBU.compatibleSlots(RT.code, SSBU.sourceSlotsOf({ skin: idx[x.dataset.skin]?.p })).includes(n)` para que luchadores con familias separadas como Sora (`'82'`, `c00` aislado) elijan siempre una skin compatible con el traje `n`.
   - Esperar `[data-act="replace"]`, hacer click y esperar `[data-act="clear"]` (presente en `ActiveCostumeBar` tras guardar).
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/perf.js`:
   - Actualizar las rutas medidas a:
     `[['Entrada inicial (redirección)', '#/luchadores', '.costume-strip'], ['Luchador directo', '#/luchador/01/3', '.costume-strip']]`
   - Conservar intactos los umbrales `CLS <= 0.05` y `LCP <= 2500` con CPU 4×.
3. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/ack-transition.js` y `sync-errors.js`:
   - Reemplazar `waitForSelector('.rrow')` por `waitForSelector('.costume-strip')`.

- [ ] **Step 2: Actualizar `tests/e2e/identity.js`, `recorridos.js`, `local.spec.js` y `visual.spec.js`**

1. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/identity.js`:
   - Cambiar `waitForSelector('.rrow')` inicial por `waitForSelector('.costume-strip')`.
   - Para verificar los 86 retratos oficiales (`assets/fighters/<code>.webp`), pulsar `[data-fighter-pick]`, esperar `[data-fighter-tile]` y comprobar que los 86 botones tienen `img` con `^assets\/fighters\/[\w]+\.webp$` cargada (`naturalWidth > 0`) y que Link (`03`) muestra `assets/fighters/03.webp` tanto en el selector como en `.app-header__face img`.
   - Para el render oficial de trajes `Original` (`05` y `75`), comprobar `.costume-cell[data-costume="0"] img` y `.active-bar` mostrando `assets/costumes/05-1.webp` / `75-1.webp` y el texto `Original`.
   - Añadir una aserción explícita de copy limpio sobre `document.body.innerText` en `#/luchador/01` y con `SkinSheet` abierta: ninguna aparición de `Perfil`, `Pack base`, `Plan de Gian`, `Sin nombre`, `Traje 1 de 8`, `en tu perfil`, `Plan actualizado el` ni `Elige un traje para compararlo`.
2. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/recorridos.js` y `tests/e2e/local.spec.js`:
   - Actualizar pruebas que esperaban `#/luchadores` o `#/catalogo` para comprobar que redirigen a `#/luchador/<code>` recordando `ssbu_last_fighter` y dejando `Traje 1` activo (`[data-costume="0"][aria-pressed="true"]`).
   - Verificar en `local.spec.js`:
     - Tira de 8 trajes en `375×812`: cada `.costume-cell` mide `>= 44 px` de ancho (`boundingBox().width >= 44`) y no hay scroll horizontal (`documentElement.scrollWidth <= window.innerWidth`).
     - En `320×568` y con zoom de fuente al `170 %` (`document.documentElement.style.fontSize = '27.2px'` en `390×844`): `.costume-strip` refluye a 4 columnas (`4×2`) sin truncar `Original` ni desbordar el ancho.
     - En Cloud (`#/luchador/61/1`, par `c00`) o Sora (`#/luchador/82/1`, `c00`): al abrir una skin de familia par en `SkinSheet`, los chips impares tienen `aria-disabled="true"` y hacer click sobre ellos no cambia el destino seleccionado.
     - Acción «Otro color» (`[data-move-color]`): en un traje con mod instalado del catálogo, abre `SkinSheet` con esa skin precargada para moverla a otro traje compatible de su familia.
     - Búsqueda en `FighterPickSheet` (`[data-fighter-pick]` o tecla `/`): escribir el nombre de una skin muestra `[data-pick-skin]` y al pulsarlo navega a `#/luchador/<code>?skin=<vid>`.
     - En escritorio (`1440×900`): `.skin-panel` permanece visible a la derecha junto a `SkinGrid`.
3. En `/Users/gian/Desktop/ssbu/ssbu-skins/tests/e2e/visual.spec.js`:
   - Actualizar las vistas capturadas a la pantalla única (`luchador` móvil `390×844`, `luchador` escritorio `1280×800`, `skin-sheet` abierta en móvil y `cambios`).

- [ ] **Step 3: Ejecutar validación integral y regenerar línea base de capturas Linux si aplica**

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
Expected: todas las suites en verde (`0 fallos` en `tests/run.sh --sin-webkit`, `LCP <= 2500 ms`, `CLS <= 0.05` y `Self-check TS: 0 pendientes`).

> **Nota sobre capturas de referencia en CI (`tests/e2e/visual.spec.js-snapshots`):**
> La línea base visual corre en Ubuntu (`mcr.microsoft.com/playwright:v1.63.0-jammy`). Si Docker está activo localmente, regenera las capturas Linux antes de subir el PR con:
> ```bash
> cd /Users/gian/Desktop/ssbu/ssbu-skins && docker run --rm -v "$PWD":/work -v /work/tests/node_modules -w /work/tests -e CI=1 mcr.microsoft.com/playwright:v1.63.0-jammy bash -lc 'npm ci --no-audit --no-fund && npx playwright test e2e/visual.spec.js --update-snapshots'
> ```
> Si Docker no está disponible localmente, tras subir la rama pide confirmación o ejecuta el workflow `.github/workflows/snapshots.yml` (`gh workflow run snapshots.yml --ref feat/fase4-pantalla-unica`) antes de fusionar en `master`.

- [ ] **Step 4: Commit de cierre de Fase 4**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tests/
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "test(e2e): update e2e, perf, and responsive checks for single-screen UI"
```
