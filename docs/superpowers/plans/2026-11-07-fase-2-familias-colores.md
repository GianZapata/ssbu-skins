# Fase 2 — Familias de colores Implementation Plan

> **For agentic workers:** Ejecutar tarea por tarea verificando cada comando real del repositorio antes de cada commit. Trabajar en una rama dedicada desde `master` (`feat/fase2-familias-colores`). Si al ejecutar encuentras una discrepancia menor de entorno o líneas vecinas, corrígela en el acto manteniendo intactos los contratos, las pruebas y `Self-check TS: 0 pendientes`. Nunca añadas `Co-Authored-By` ni atribución de IA en los commits; usa únicamente Conventional Commits. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Derivar las familias de colores compatibles (`c00–c07`) de los 89 luchadores desde `dir_info_with_files_trimmed.json` del juego, exponerlas en `data/families.json` y `boot.js`, ofrecer los helpers `sameFamily`, `compatibleSlots` y `sourceSlotsOf` en `src/shared/helpers/ssbu.ts` para que la UI de Fase 4 nunca ofrezca cruces incompatibles, y marcar en `tools/review_plan.py` cualquier cruce de familia como `ERROR` (`⛔`), corrigiendo además el paso de `variant` en `review_plan.py` `main()` detectado al revisar la Fase 1.

**Architecture:** `tools/export_families.py` (stdlib) lee `file_array` de `dir_info_with_files_trimmed.json` (o un listado `.txt` de rutas vanilla en pruebas), cruza los nombres internos con `INTERNAL` de `tools/scan_installed.py` (uniendo `popo` + `nana` bajo Ice Climbers `15`), compara únicamente los conjuntos `fighter/<interno>/model/body/c0[0-7]/*.nutexb` ignorando accesorios numerados por slot (`def_(pikachu|pichu|purin)parts_`, `alp_(pikachu|pichu|purin)parts_`, `def_sonic_00[2-8]_`) y aplica las 3 normalizaciones documentadas del ModPack (`49` Little Mac, `80` Mythra y `81` Kazuya). El resultado versionado en `data/families.json` viaja embebido en `META.families` (`public/boot.js`), es consumido por la lógica pura de `domain.ts` / `ssbu.ts` (normalizando índices `0..7` de `Skin.native` y `:c0N` frente a índices `1..8` de `DriveAlt.slots`) y por `tools/review_plan.py`.

**Tech Stack:** Python 3.9+ (stdlib + `unittest`), TypeScript 5.9 (`gian-how-i-code` + `gian-ts-style`), Node `node:test`, Vite (`export_boot.py`), Playwright (`tests/run.sh`).

---

## Mapa de archivos

- **Crear:**
  - `tools/export_families.py` — Genera y verifica (`--check`) `data/families.json` a partir de `dir_info_with_files_trimmed.json`.
  - `data/families.json` — Mapa versionado `{ "<roster_no>": [[0, ...], ...] }` para los 89 luchadores del catálogo.
  - `tests/unit/test_families.py` — Pruebas unitarias sobre árboles sintéticos y sobre los 12 luchadores de referencia y los 89 códigos reales en `data/families.json`.
- **Modificar:**
  - `tools/export_boot.py:12-18` — Embebe `'families': cd._jload('families.json') or {}` dentro de `META` en `public/boot.js` (`public/boot.js` está en `.gitignore`; no se commitea).
  - `src/boot.d.ts:50-58` — Declara `FamilyGroups` y `families?: FamilyGroups` en `BootMeta`.
  - `src/shared/helpers/domain.ts:38-45,299-304` — Añade `ALL_SLOTS`, `familiesOf`, `sameFamily`, `compatibleSlots` y `sourceSlotsOf` en JavaScript puro compatible con `vm.runInNewContext`.
  - `src/shared/helpers/ssbu.ts:1-5,103-124` — Define interfaces con nombre (`SlotCarrier`, `NativeSkinCarrier`, `SourceSlotsInput` sin importar desde `features/`), extiende `Domain` y exporta `sameFamily`, `compatibleSlots` y `sourceSlotsOf`.
  - `tests/unit/test_domain.mjs:249-271` — Verifica familias pares/impares, Koopalings, normalización `1..8` vs `0..7` en `sourceSlotsOf`, unión de slots sin `variant` y fallback seguro a los 8 trajes cuando `native` está vacío.
  - `tools/review_plan.py:81-136,189-209` — Propaga `variant` en `main()` (`--source file|admin|changes`, cerrando el pendiente de Fase 1) y evalúa compatibilidad de familias (`ERROR` al cruzar de familia, `AVISO` al reubicar dentro de la misma familia, `INFO` sin origen conocido).
  - `tests/unit/test_review.py:39-93` — Verifica `ERROR` en cruce de familia (por `native` y por `chosen_variant`), `AVISO` en reubicación dentro de familia compatible, `INFO` sin slots nativos y propagación de `variant` por CLI (`--source file`).
- **No tocar:**
  - `ultimate/`, `catalog/` del ModPack, `/Volumes/SWITCH SD`, `~/Documents/smash-mod-assets` (solo lectura de `dir_info_with_files_trimmed.json`) ni `firestore.rules`.

## Sin datos todavía y texto de la referencia que no se publica

- **Sin datos todavía:**
  - Mods de `data/catalog.json` con `native: []` y alternativas de `public/drive-alts.json` sin `variants` inspeccionadas o con `any: true`: `sourceSlotsOf` devuelve `[]` (o `[0..7]` cuando `any: true`) y `compatibleSlots` habilita los 8 trajes sin bloqueo ciego; `tools/review_plan.py` mantiene `INFO` («el catálogo no indica sus slots originales») en lugar de emitir falsos `ERROR`.
- **Texto de la referencia que no se publica:**
  - Términos internos del plan o del juego (`dir_info_with_files_trimmed.json`, `nutexb`, `OVERRIDES`, «Fase 2», «bloqueo ciego») no aparecen en ningún texto visible de la interfaz web.

---

### Task 1: Generador `tools/export_families.py`, `data/families.json` y pruebas `test_families.py`

**Files:**
- Create: `tools/export_families.py`
- Create: `data/families.json`
- Create: `tests/unit/test_families.py`

- [ ] **Step 1: Crear rama de trabajo desde `master` actualizado**

Run:
```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout master
git -C /Users/gian/Desktop/ssbu/ssbu-skins pull --ff-only
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout -b feat/fase2-familias-colores
```
Expected: rama `feat/fase2-familias-colores` creada sobre `master` con árbol de trabajo limpio.

- [ ] **Step 2: Crear `tools/export_families.py`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/tools/export_families.py`:

```python
#!/usr/bin/env python3
"""Deriva las familias de colores (c00-c07) de cada luchador desde dir_info_with_files_trimmed.json.

Uso:
  python3 tools/export_families.py [--vanilla-files RUTA] [--out data/families.json]
  python3 tools/export_families.py --check [--vanilla-files RUTA] [--out data/families.json]

Compara únicamente fighter/<interno>/model/body/c0[0-7]/*.nutexb, excluyendo animaciones (.nuanmb),
adyacencia (.adjb), LOD (.xmb) y texturas de accesorios numerados por slot."""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd
from scan_installed import INTERNAL

DEFAULT_VANILLA = os.path.expanduser(
    '~/Documents/smash-mod-assets/tools-data/reslotter/a853c3d09181/dir_info_with_files_trimmed.json'
)
NUTEXB = re.compile(r'^fighter/([a-z0-9_]+)/model/body/c0([0-7])/([^/]+\.nutexb)$')
ACCESSORY = re.compile(r'^(?:(?:def|alp)_(?:pikachu|pichu|purin)parts_|def_sonic_00[2-8]_)')

# Normalizaciones documentadas del ModPack donde la malla real difiere o se comparte respecto a .nutexb sueltos:
# - 49 Little Mac: c00-c05 boxeador normal; c06-c07 wireframe / sudadera (malla distinta).
# - 80 Mythra: los 8 trajes comparten familia funcional en el ModPack (c07 solo añade media opaca).
# - 81 Kazuya: pares (traje) e impares (karategi).
OVERRIDES = {
    '49': [[0, 1, 2, 3, 4, 5], [6, 7]],
    '80': [[0, 1, 2, 3, 4, 5, 6, 7]],
    '81': [[0, 2, 4, 6], [1, 3, 5, 7]],
}


def load_vanilla_paths(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(f'no existe --vanilla-files: {path}')
    with open(path, encoding='utf-8') as f:
        if path.endswith('.json'):
            data = json.load(f)
            if not isinstance(data, dict) or not isinstance(data.get('file_array'), list):
                raise ValueError(f'{path}: falta la lista file_array')
            return [row for row in data['file_array'] if isinstance(row, str) and not row.startswith('0x')]
        return [line.strip() for line in f if line.strip() and not line.startswith('0x')]


def build_families(paths, codes, overrides=None):
    active_overrides = OVERRIDES if overrides is None else overrides
    by_code = {}
    for raw in paths:
        match = NUTEXB.match(raw)
        if not match:
            continue
        internal, slot_str, tex = match.group(1), match.group(2), match.group(3)
        code = INTERNAL.get(internal)
        if not code or ACCESSORY.match(tex):
            continue
        by_code.setdefault(code, {slot: set() for slot in range(8)})[int(slot_str)].add(f'{internal}:{tex}')

    out = {}
    for code in codes:
        if code in active_overrides:
            out[code] = [list(group) for group in active_overrides[code]]
            continue
        slots_map = by_code.get(code)
        if not slots_map or all(len(files) == 0 for files in slots_map.values()):
            out[code] = [list(range(8))]
            continue
        groups, seen = [], {}
        for slot in range(8):
            sig = tuple(sorted(slots_map[slot]))
            if sig not in seen:
                seen[sig] = []
                groups.append(seen[sig])
            seen[sig].append(slot)
        out[code] = groups
    return out


def format_json(families):
    lines = ['{']
    items = list(families.items())
    for idx, (code, groups) in enumerate(items):
        comma = ',' if idx + 1 < len(items) else ''
        lines.append(f'  {json.dumps(code, ensure_ascii=False)}: {json.dumps(groups)}{comma}')
    lines.append('}\n')
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--vanilla-files', default=DEFAULT_VANILLA, help='ruta a dir_info_with_files_trimmed.json')
    parser.add_argument('--out', default=os.path.join(cd.R, 'data', 'families.json'), help='JSON de salida')
    parser.add_argument('--check', action='store_true', help='verifica que el archivo coincide sin escribir')
    args = parser.parse_args()

    fighters, _ = cd.load()
    codes = [fighter['code'] for fighter in fighters]
    families = build_families(load_vanilla_paths(args.vanilla_files), codes)
    rendered = format_json(families)

    if args.check:
        if not os.path.isfile(args.out):
            print(f'falta {args.out}', file=sys.stderr)
            return 1
        with open(args.out, encoding='utf-8') as f:
            current = json.load(f)
        if current != families:
            print(f'{args.out} no coincide con {args.vanilla_files}', file=sys.stderr)
            return 1
        print(f'ok · {args.out} al día ({len(families)} luchadores)')
        return 0

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(rendered)
    multi = sum(1 for groups in families.values() if len(groups) > 1)
    print(f'ok · {args.out} · {len(families)} luchadores ({multi} con múltiples familias)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Generar `data/families.json` y verificar `--check`**

Run:
```bash
python3 /Users/gian/Desktop/ssbu/ssbu-skins/tools/export_families.py
python3 /Users/gian/Desktop/ssbu/ssbu-skins/tools/export_families.py --check
```
Expected: `ok · .../data/families.json · 89 luchadores` y `--check` sale con código `0`.

- [ ] **Step 4: Crear `tests/unit/test_families.py` y ejecutarlo**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_families.py`:

```python
"""Familias de colores por luchador (tools/export_families.py y data/families.json)."""
import json, os, sys, tempfile, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import catalog_data as cd, export_families as ef


class ExportFamiliesUnit(unittest.TestCase):
    def test_ignora_nuanmb_adjb_xmb_y_accesorios_por_slot(self):
        paths = []
        for slot in range(8):
            paths.append(f'fighter/sonic/model/body/c0{slot}/skin_sonic_001_col.nutexb')
            if slot >= 1:
                paths.append(f'fighter/sonic/model/body/c0{slot}/def_sonic_00{slot + 1}_col.nutexb')
            if slot % 2 == 0:
                paths.append(f'fighter/sonic/model/body/c0{slot}/model.adjb')
                paths.append(f'fighter/sonic/model/body/c0{slot}/model.nuanmb')
                paths.append(f'fighter/sonic/model/body/c0{slot}/lod.xmb')
        got = ef.build_families(paths, ['38'], overrides={})
        self.assertEqual(got['38'], [[0, 1, 2, 3, 4, 5, 6, 7]])

    def test_une_popo_y_nana_en_ice_climbers(self):
        paths = []
        for slot in range(8):
            paths.append(f'fighter/popo/model/body/c0{slot}/body_col.nutexb')
            nana_tex = 'parka_a.nutexb' if slot < 4 else 'parka_b.nutexb'
            paths.append(f'fighter/nana/model/body/c0{slot}/{nana_tex}')
        got = ef.build_families(paths, ['15'], overrides={})
        self.assertEqual(got['15'], [[0, 1, 2, 3], [4, 5, 6, 7]])

    def test_load_vanilla_paths_acepta_json_y_txt(self):
        with tempfile.TemporaryDirectory() as tmp:
            jpath = os.path.join(tmp, 'dir_info.json')
            tpath = os.path.join(tmp, 'paths.txt')
            with open(jpath, 'w', encoding='utf-8') as f:
                json.dump({'file_array': ['0xdeadbeef', 'fighter/mario/model/body/c00/a.nutexb'], 'dirs': {}}, f)
            with open(tpath, 'w', encoding='utf-8') as f:
                f.write('0xdeadbeef\nfighter/mario/model/body/c00/a.nutexb\n')
            self.assertEqual(ef.load_vanilla_paths(jpath), ['fighter/mario/model/body/c00/a.nutexb'])
            self.assertEqual(ef.load_vanilla_paths(tpath), ['fighter/mario/model/body/c00/a.nutexb'])


class FamiliesDataContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fighters, _ = cd.load()
        with open(os.path.join(R, 'data', 'families.json'), encoding='utf-8') as f:
            cls.families = json.load(f)

    def test_cubre_todos_los_luchadores_con_particion_exacta_0_a_7(self):
        codes = [f['code'] for f in self.fighters]
        self.assertEqual(sorted(self.families.keys()), sorted(codes))
        for code, groups in self.families.items():
            flat = [slot for group in groups for slot in group]
            self.assertEqual(sorted(flat), list(range(8)), f'{code} no particiona 0..7: {groups}')
            for group in groups:
                self.assertTrue(len(group) >= 1)
                self.assertEqual(group, sorted(group))

    def test_luchadores_de_referencia_del_modpack(self):
        expected = {
            '11': [[0, 1, 2, 3, 4, 5, 6, 7]],
            '15': [[0, 1, 2, 3], [4, 5, 6, 7]],
            '29': [[0, 1, 2, 3, 4, 5], [6], [7]],
            '32': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '38': [[0, 1, 2, 3, 4, 5, 6, 7]],
            '49': [[0, 1, 2, 3, 4, 5], [6, 7]],
            '58': [[0], [1], [2], [3], [4], [5], [6], [7]],
            '61': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '68': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '78': [[0, 1, 2, 3, 4, 5], [6, 7]],
            '81': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '82': [[0], [1, 5], [2, 6], [3, 7], [4]],
        }
        for code, groups in expected.items():
            self.assertEqual(self.families[code], groups, f'familia inesperada en {code}')


if __name__ == '__main__':
    unittest.main()
```

Run:
```bash
python3 -m unittest discover -s /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit -p 'test_families.py' -v
```
Expected: todas las pruebas de `test_families.py` pasan (`OK`).

- [ ] **Step 5: Commit de Task 1**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tools/export_families.py data/families.json tests/unit/test_families.py
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(tools): export fighter color families from vanilla dir_info"
```

---

### Task 2: Exposición en `boot.js` y helpers `sameFamily`, `compatibleSlots` y `sourceSlotsOf`

**Files:**
- Modify: `tools/export_boot.py:12-18`
- Modify: `src/boot.d.ts:50-58`
- Modify: `src/shared/helpers/domain.ts:38-45,299-304`
- Modify: `src/shared/helpers/ssbu.ts:1-5,103-124`
- Modify: `tests/unit/test_domain.mjs:249-271`

- [ ] **Step 1: Exponer `families` en `tools/export_boot.py` y tiparlo en `src/boot.d.ts`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/export_boot.py`, cargar `families.json` y añadirlo al diccionario `meta`:

```python
plan_path = os.path.join(cd.R, 'data', 'slot_plan.json')
plan_updated_at = None
if os.path.isfile(plan_path):
    plan_updated_at = json.load(open(plan_path, encoding='utf-8')).get('updated_at')
families = cd._jload('families.json') or {}
meta = {**meta0, 'inventory': inv if embed else None, 'firebase': cfg, 'embed': embed, 'plan_updated_at': plan_updated_at, 'families': families}
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/boot.d.ts`, declarar `FamilyGroups` y añadir `families?: FamilyGroups` en `BootMeta`:

```typescript
export type FamilyGroups = Record<string, number[][]>

export interface BootMeta {
  generated?: string
  plan_updated_at?: string | null
  base: string
  inventory: { meta?: Record<string, unknown>, fighters?: Record<string, { slots?: Record<string, Record<string, unknown>> }> } | null
  firebase: Record<string, string> | null
  embed?: boolean
  families?: FamilyGroups
}
```

- [ ] **Step 2: Añadir lógica pura de familias en `src/shared/helpers/domain.ts` y wrappers tipados en `src/shared/helpers/ssbu.ts`**

> **Nota crítica de arquitectura y estilo:**
> - `src/shared/helpers/domain.ts` se ejecuta dentro de `vm.runInNewContext` en `tests/unit/test_domain.mjs`, por lo que **debe mantenerse como JavaScript puro sin anotaciones de tipos TypeScript**, respetando `guard-glue` y `vertical-spacing` de `gian-ts-style`.
> - `src/shared/helpers/` nunca importa desde `src/features/` (`gian-how-i-code` `04-frontend-architecture.md`); `SlotCarrier` y `NativeSkinCarrier` se definen como interfaces estructurales con nombre en `ssbu.ts`.
> - En `public/drive-alts.json`, `DriveAlt.slots` usa numeración `1..8`, mientras que `Skin.native` y el sufijo `:c0N` de `variant` usan `0..7`. `sourceSlotsOf` centraliza esa conversión para que ningún consumidor mezcle índices.

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/domain.ts`, justo después de `validSlot(n)` (línea 41), insertar:

```javascript
  const ALL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];

  function familiesOf(code, families) {
    const map = families || (globalThis.META && globalThis.META.families) || {};
    const groups = map[code];

    return Array.isArray(groups) && groups.length ? groups : [ALL_SLOTS];
  }

  function sameFamily(code, from, to, families) {
    if (!validSlot(from) || !validSlot(to)) return false;

    return familiesOf(code, families).some((group) => group.includes(from) && group.includes(to));
  }

  function compatibleSlots(code, sourceSlots, families) {
    if (!Array.isArray(sourceSlots)) return ALL_SLOTS.slice();

    const valid = sourceSlots.filter(validSlot);

    if (!valid.length) return ALL_SLOTS.slice();

    const out = new Set();

    familiesOf(code, families).forEach((group) => {
      if (!valid.some((slot) => group.includes(slot))) return;

      group.forEach((slot) => {
        if (validSlot(slot)) out.add(slot);
      });
    });

    return Array.from(out).sort((a, b) => a - b);
  }

  function sourceSlotsOf(input) {
    const current = input || {};

    if (typeof current.variant === 'string') {
      const match = /:c0([0-7])$/.exec(current.variant);

      if (match) return [Number(match[1])];
    }

    if (current.alt) {
      if (current.alt.any) return ALL_SLOTS.slice();
      if (Array.isArray(current.alt.slots) && current.alt.slots.length) {
        return current.alt.slots.map((slot) => Number(slot) - 1).filter(validSlot);
      }
    }

    if (current.skin && Array.isArray(current.skin.native) && current.skin.native.length) {
      return current.skin.native.filter(validSlot);
    }

    return [];
  }
```

Y actualizar el `return { ... }` al final de `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/domain.ts`:

```javascript
  return {
    keyOf, norm, ONLINE, WIFI_KEYS, FILTER_KEYS, emptyCat, migrateCat, validSlot,
    familiesOf, sameFamily, compatibleSlots, sourceSlotsOf,
    planVid, planVariant, planEntries, isAlt, onlineOf, catList, initials, originalArt, curOf,
    assignBlock, setOp, clearOp, withOp, stageChoice, seriesOf, seriesLabel, installFace,
  };
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/ssbu.ts`:
1. Actualizar el import de `../../boot`:
```typescript
import './domain'
import type { FamilyGroups, Fighter, Skin } from '../../boot'
import type { InstallFaceKind } from '../enums/InstallFaceKind'
```
2. Añadir las interfaces con nombre antes de `export interface Domain`:
```typescript
export interface SlotCarrier {
  any?: boolean
  slots?: number[]
}

export interface NativeSkinCarrier {
  native?: number[]
}

export interface SourceSlotsInput {
  variant?: string | null
  alt?: SlotCarrier | null
  skin?: NativeSkinCarrier | null
}
```
3. Añadir los métodos a `export interface Domain` y exportar los helpers directos al final de `src/shared/helpers/ssbu.ts`:
```typescript
export interface Domain {
  keyOf: (code: string, slot: number) => string
  validSlot: (slot: number) => boolean
  familiesOf: (code: string, families?: FamilyGroups) => number[][]
  sameFamily: (code: string, from: number, to: number, families?: FamilyGroups) => boolean
  compatibleSlots: (code: string, sourceSlots?: number[] | null, families?: FamilyGroups) => number[]
  sourceSlotsOf: (input?: SourceSlotsInput | null) => number[]
  emptyCat: () => CatState
  migrateCat: (saved: unknown) => CatState
  assignBlock: (entries: PlanRow[], code: string, slot: number, vid: string, variant?: string | null) => AssignBlockResult
  setOp: (code: string, slot: number, vid: string, prev: string | null, variant?: string | null, prevVariant?: string | null) => Op | null
  clearOp: (code: string, slot: number, prev: string | null, prevVariant?: string | null) => Op | null
  curOf: (code: string, slot: number, ctx: unknown) => Current | null
  catList: (rows: unknown[], ctx: CatListContext | null, st: CatState) => CatEntry[]
  stageChoice: (input: StageChoiceInput) => StageChoice
  seriesOf: (code: string) => string
  seriesLabel: (id: string) => string
  isAlt: (skin: Skin) => boolean
  onlineOf: (skin: Skin) => [string, string]
  FILTER_KEYS: string[]
  initials: (name: string) => string
  installFace: (ready: boolean, slot: InstallDecision | null, current: Current | null) => InstallFace
}

const host = globalThis as typeof globalThis & { SSBU: Domain }
export const SSBU = host.SSBU

export const sameFamily = (code: string, from: number, to: number, families?: FamilyGroups) =>
  SSBU.sameFamily(code, from, to, families)

export const compatibleSlots = (code: string, sourceSlots?: number[] | null, families?: FamilyGroups) =>
  SSBU.compatibleSlots(code, sourceSlots, families)

export const sourceSlotsOf = (input?: SourceSlotsInput | null) =>
  SSBU.sourceSlotsOf(input)
```

- [ ] **Step 3: Añadir pruebas de dominio en `tests/unit/test_domain.mjs`**

Añadir al final de `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_domain.mjs`:

```javascript
test('sameFamily y compatibleSlots respetan familias reales y habilitan los 8 cuando no hay datos', () => {
  const families = JSON.parse(fs.readFileSync(new URL('../../data/families.json', import.meta.url), 'utf8'));
  sandbox.META = { families };

  assert.equal(SSBU.sameFamily('61', 0, 2), true);
  assert.equal(SSBU.sameFamily('61', 0, 1), false);
  assert.equal(SSBU.sameFamily('61', -1, 0), false);
  assert.equal(SSBU.sameFamily('58', 0, 1), false);
  assert.equal(SSBU.sameFamily('11', 0, 7), true);

  assert.deepEqual(SSBU.compatibleSlots('61', [1]), [1, 3, 5, 7]);
  assert.deepEqual(SSBU.compatibleSlots('61', [0, 1]), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(SSBU.compatibleSlots('78', [6]), [6, 7]);
  assert.deepEqual(SSBU.compatibleSlots('58', [3]), [3]);
  assert.deepEqual(SSBU.compatibleSlots('82', [1]), [1, 5]);
  assert.deepEqual(SSBU.compatibleSlots('61', []), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(SSBU.compatibleSlots('61', null), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('sourceSlotsOf prioriza variant sobre DriveAlt (1..8) y Skin.native (0..7)', () => {
  const families = JSON.parse(fs.readFileSync(new URL('../../data/families.json', import.meta.url), 'utf8'));
  sandbox.META = { families };

  const fromVariant = SSBU.sourceSlotsOf({
    variant: '61:123456:aaeedf35:c03',
    alt: { any: true, slots: [1, 2, 3, 4, 5, 6, 7, 8] },
    skin: { native: [0, 2, 4, 6] },
  });
  assert.deepEqual(fromVariant, [3]);
  assert.deepEqual(SSBU.compatibleSlots('61', fromVariant), [1, 3, 5, 7]);

  const fromDriveSlots = SSBU.sourceSlotsOf({
    variant: null,
    alt: { any: false, slots: [2, 4] },
    skin: { native: [] },
  });
  assert.deepEqual(fromDriveSlots, [1, 3]);
  assert.deepEqual(SSBU.compatibleSlots('61', fromDriveSlots), [1, 3, 5, 7]);

  const fromDriveAny = SSBU.sourceSlotsOf({
    alt: { any: true, slots: [1] },
  });
  assert.deepEqual(fromDriveAny, [0, 1, 2, 3, 4, 5, 6, 7]);

  const fromNative = SSBU.sourceSlotsOf({
    skin: { native: [6] },
  });
  assert.deepEqual(SSBU.compatibleSlots('49', fromNative), [6, 7]);

  assert.deepEqual(SSBU.sourceSlotsOf({ skin: { native: [] } }), []);
  assert.deepEqual(SSBU.compatibleSlots('58', SSBU.sourceSlotsOf({ skin: { native: [] } })), [0, 1, 2, 3, 4, 5, 6, 7]);
});
```

- [ ] **Step 4: Regenerar `boot.js`, correr pruebas Node, `typecheck` y `self-check.mjs`**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins
npm run boot
node --test tests/unit/*.mjs tests/unit/*.js
npm run typecheck
node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts
```
Expected: `ok boot ...`, todos los tests de Node en verde, `vue-tsc --noEmit` sin errores y `Self-check TS: 0 pendientes`.

- [ ] **Step 5: Commit de Task 2**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tools/export_boot.py src/boot.d.ts src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts tests/unit/test_domain.mjs
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(domain): add color family compatibility helpers and boot metadata"
```

---

### Task 3: Validación de familias y propagación CLI de `variant` en `tools/review_plan.py`

**Files:**
- Modify: `tools/review_plan.py:81-136,189-209`
- Modify: `tests/unit/test_review.py:39-93`

- [ ] **Step 1: Actualizar `tools/review_plan.py` (`compatible_slots`, `review` y `main`)**

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/review_plan.py`:
1. Añadir `compatible_slots` justo encima de `review(...)` y aceptar `families=None` en `review(changes, history, fighters, inv, plan_inv_version=None, families=None)`:

```python
def compatible_slots(code, origin_slots, families):
    groups = (families or {}).get(code) or [list(range(8))]
    if not origin_slots:
        return list(range(8))
    return sorted({slot for group in groups if any(orig in group for orig in origin_slots) for slot in group})

def review(changes, history, fighters, inv, plan_inv_version=None, families=None):
    if families is None:
        families = cd._jload('families.json') or {}
```

2. Dentro del bucle `for c in rows:` de `review(...)`, validar primero `chosen_variant` para determinar `origin_slots` (`[int(chosen_variant[-2:])]` cuando `chosen_variant` es válida; en caso contrario `p['native'] or []`) y evaluar el cruce de familia antes de la nota de reubicación:

```python
        valid_variant = False
        if chosen_variant:
            if not chosen_variant.startswith(vid + ':') or not re.search(r':[0-9a-f]{8}:c0[0-7]$', chosen_variant):
                add(N, 'ERROR', f'la variante elegida no corresponde a esta apariencia: {chosen_variant}')
            else:
                valid_variant = True
        origin_slots = [int(chosen_variant[-2:])] if valid_variant else list(p['native'] or [])
        # reubicación y familia de colores
        if origin_slots:
            compat = compatible_slots(code, origin_slots, families)
            if 0 <= n <= 7 and n not in compat:
                orig_txt = ', '.join(f'c{k:02d}' for k in origin_slots)
                compat_txt = ', '.join(f'c{k:02d}' for k in compat)
                add(N, 'ERROR', f'cruza de familia de colores: origen {orig_txt} solo es compatible con {compat_txt}, no con c{n:02d}')
            elif n not in origin_slots:
                if valid_variant:
                    add(N, 'AVISO', f'la variante viene de c{origin_slots[0]:02d}; ponerla en c{n:02d} exige moverlo de slot dentro de su familia')
                else:
                    add(N, 'AVISO', f'el mod trae trajes para {", ".join("c0%d" % k for k in p["native"])}; ponerlo en c0{n} exige moverlo de slot (nadie ha comprobado que se pueda)')
        elif p['slots_orig'] in (None, '', 'sin especificar'):
            add(N, 'INFO', 'el catálogo no indica sus slots originales')
        if p['dest'] and p['dest'] != f'c0{n}' and not isinstance(p['dest'], int):
            add(N, 'INFO', f'el auditor sugería {p["dest"]}; tu elección (c0{n}) manda')
        # online / condiciones / dependencias
        st = p['wifi_status']
        if st in ('autor_condicionado',): add(N, 'AVISO', f'online {ONLINE[st]}: ' + (p['conditions'] or 'revisa las condiciones')[:200])
        elif st in ('tercero', 'sin_evidencia', 'incompatible'): add(N, 'AVISO' if st != 'incompatible' else 'ERROR', f'online {ONLINE.get(st, st)}')
        elif st == 'autor_explicito' and p['conditions']: add(N, 'AVISO', 'declarado por el autor pero con condiciones: ' + p['conditions'][:200])
        if p['deps'] and NRO.search(p['deps']): add(N, 'AVISO', 'necesita: ' + p['deps'][:200])
        conf = [x for x in (p['conflicts'] or '').split(' · ') if x and not x.startswith('choca con propuestas principales')]
        for x in conf: add(N, 'AVISO', 'conflicto anotado: ' + x[:200])
        if p['pack']: add(N, 'INFO', f'es un paquete compartido con {", ".join(p["pack"]["with"])}: las fotos muestran todo el paquete')
        if p['variant']: add(N, 'INFO', f'variante concreta: {p["variant"]}')
        if valid_variant:
            add(N, 'INFO', f'apariencia elegida: {chosen_variant} (color de origen {chosen_variant[-3:]}, destino c{n:02d})')
```

3. En `main()` (líneas 196–208 de `tools/review_plan.py`), conservar `'variant'` en `--source file`, `--source admin` y `--source changes` (cerrando el pendiente detectado en la revisión de Fase 1):

```python
    def _rows(ch):
        return [
            {'code': c['code'], 'slot': int(c['slot']), 'vid': c['vid'], **({'variant': c['variant']} if c.get('variant') else {})}
            for c in ch if c.get('vid')
        ]
    if a.source == 'file':
        if not a.file: ap.error('indica el archivo de la exportación')
        ch, hi, ver = read_file(a.file)
        changes = _rows(ch)
    elif a.source == 'admin':
        ch, hi = read_admin()
        changes = _rows(ch)
    elif a.source == 'changes':
        pid = (cd.load_firebase() or {}).get('projectId'); ch, hi = read_rest(pid, a.rest_base)
        changes = _rows(ch)
    else:
        changes, missing = from_git(); hi = []
```

- [ ] **Step 2: Añadir pruebas de familias y CLI en `tests/unit/test_review.py`**

Añadir los siguientes métodos dentro de `class Revision(unittest.TestCase):` en `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_review.py`:

```python
    def test_cruzar_de_familia_es_error_por_native_y_por_variante(self):
        cloud_even = next(
            p for p in next(f for f in F if f['code'] == '61')['picks']
            if not p['withdrawn'] and p['native'] and set(p['native']) <= {0, 2, 4, 6} and len(p['native']) < 4
        )
        it_err, g_err = rp.review([{'code': '61', 'slot': 1, 'vid': cloud_even['vid']}], [], F, INV)
        self.assertTrue(any('cruza de familia de colores' in m for m in msgs(it_err, g_err, 'ERROR')))
        self.assertFalse(any('moverlo de slot' in m for m in msgs(it_err, g_err, 'AVISO')))

        target_same = next(s for s in (0, 2, 4, 6) if s not in cloud_even['native'])
        it_warn, g_warn = rp.review([{'code': '61', 'slot': target_same, 'vid': cloud_even['vid']}], [], F, INV)
        self.assertFalse(any('cruza de familia' in m for m in msgs(it_warn, g_warn, 'ERROR')))
        self.assertTrue(any('moverlo de slot' in m for m in msgs(it_warn, g_warn, 'AVISO')))

        any_cloud = next(
            p for p in next(f for f in F if f['code'] == '61')['picks']
            if not p['withdrawn'] and p['wifi_status'] != 'incompatible'
        )
        it_var, g_var = rp.review(
            [{'code': '61', 'slot': 2, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c01"}],
            [], F, INV,
        )
        self.assertTrue(any('cruza de familia de colores' in m for m in msgs(it_var, g_var, 'ERROR')))

    def test_sin_slots_nativos_es_info_y_no_bloquea_por_familia(self):
        f, p = next(
            (f, p) for f, p in PICKS
            if not p['withdrawn'] and not f['mii'] and not p['native'] and p['slots_orig'] in (None, '', 'sin especificar')
        )
        it, g = rp.review([{'code': f['code'], 'slot': 1, 'vid': p['vid']}], [], F, INV)
        self.assertFalse(any('cruza de familia' in m for m in msgs(it, g, 'ERROR')))
        self.assertTrue(any('no indica sus slots originales' in m for m in msgs(it, g, 'INFO')))

    def test_cli_source_file_conserva_variant_y_detecta_cruce_de_familia(self):
        any_cloud = next(
            p for p in next(f for f in F if f['code'] == '61')['picks']
            if not p['withdrawn'] and p['wifi_status'] != 'incompatible'
        )
        payload = {
            'inventory': {'version': INV['meta']['version']},
            'history': [],
            'changes': [
                {'roster_no': '61', 'traje': 2, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c01"},
                {'roster_no': '61', 'traje': 4, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c03"},
            ],
        }
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(payload, f)
        try:
            ok_run = subprocess.run(
                [sys.executable, os.path.join(R, 'tools', 'review_plan.py'), '--source', 'file', f.name, '--strict'],
                capture_output=True, text=True,
            )
            payload['changes'][0]['traje'] = 3  # c02 (par) con variante c01 (impar) -> ERROR
            with open(f.name, 'w', encoding='utf-8') as f2:
                json.dump(payload, f2)
            bad_run = subprocess.run(
                [sys.executable, os.path.join(R, 'tools', 'review_plan.py'), '--source', 'file', f.name, '--strict'],
                capture_output=True, text=True,
            )
        finally:
            os.unlink(f.name)
        self.assertEqual(ok_run.returncode, 0, ok_run.stdout + ok_run.stderr)
        self.assertIn('2 variantes distintas', ok_run.stdout)
        self.assertEqual(bad_run.returncode, 1)
        self.assertIn('cruza de familia de colores', bad_run.stdout)
```

- [ ] **Step 3: Ejecutar pruebas de `review_plan.py`**

Run:
```bash
python3 -m unittest discover -s /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit -p 'test_review.py' -v
```
Expected: todas las pruebas de `test_review.py` pasan (`OK`).

- [ ] **Step 4: Commit de Task 3**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tools/review_plan.py tests/unit/test_review.py
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(review): flag cross-family costume moves and preserve CLI variants"
```

---

### Task 4: Verificación integral de cierre de Fase 2

**Files:**
- Verify only

- [ ] **Step 1: Ejecutar todas las suites unitarias, validadores, `build` y `self-check.mjs`**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins
python3 tools/export_families.py --check
python3 tools/board_public.py --check
python3 tools/validate_catalog.py
python3 -m unittest discover -s tests/unit -p 'test_*.py'
node --test tests/unit/*.mjs tests/unit/*.js
npm run typecheck
npm run build
node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts
```
Expected: todos los comandos terminan con código `0`, `build` genera `dist/` sin errores y `Self-check TS: 0 pendientes`.

- [ ] **Step 2: Ejecutar suite e2e con emuladores (`tests/run.sh --sin-webkit`)**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && tests/run.sh --sin-webkit
```
Expected: suite completa en verde (si Java/emuladores no están activos localmente, verificar la Action «Pruebas» al abrir el PR antes de fusionar en `master`).

- [ ] **Step 3: Compuerta antes de fusionar**

1. Confirmar con `git status -s` que no quedaron artefactos temporales sin seguimiento (`public/boot.js` es ignorado por Git; `data/families.json` sí queda versionado).
2. Pedir confirmación explícita de Gian antes de fusionar el PR en `master` (esta fase no modifica `firestore.rules`).
