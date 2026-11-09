# Fase 1 — Variantes (datos, retratos y contrato) Implementation Plan

> **For agentic workers:** Ejecutar tarea por tarea verificando cada comando real del repositorio antes de cada commit. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Incorporar sobre `master` la inspección local de variantes de mods del Drive, la publicación segura de sus retratos verificados en Cloudinary y el soporte de extremo a extremo del identificador `variant` (`<vid>:<md5_corto>:<cNN>`) en dominio, sincronización con Firestore, exportación, hoja de resumen y herramientas de revisión.

**Architecture:** Se rescata la capa de herramientas, manifiestos (`data/variants/*.json`) y contrato de sincronización de `feat/variant-inspector`, descartando su UI obsoleta (`BoardPage.vue`, `useBoard.ts`, `journeys.js`). Además se alinea la elección del retrato `.bntx` con `sd_board_portraits.py` (mayor resolución `BRTI`), se cruzan los hashes publicados contra la unión de `data/sd_portraits.json` y `data/variant_portraits.json` (devolviendo `null` cuando aún no está subido, nunca una imagen ajena) y se adapta la visualización de variante al composable actual `useSummarySheet.ts`.

**Tech Stack:** Python 3.9+ (stdlib + `unittest`), TypeScript 5.9, Vue 3.5 + Quasar 2, Firebase Firestore Security Rules, Node `node:test`, Playwright (`tests/run.sh`).

---

## Mapa de archivos

- **Crear:**
  - `tools/inspect_variants.py` — Inspecciona archivos originales del Drive en copia local, detecta apariencias distintas con modelo (`has_model`) y elige el `.bntx` de mayor resolución.
  - `data/variants/*.json` — 79 manifiestos inspeccionados rescatados de `feat/variant-inspector`.
  - `tests/unit/test_inspect_variants.py` — Pruebas unitarias de `inspect_variants.py` (tokens de color, duplicados, `.bntx` de mayor tamaño, archivos partidos, Zip Slip y fallback `7zz` → `unar`).
  - `src/shared/helpers/portraits.ts` — Helper `portraitUrl(sha)` e `isSha(value)` para retratos de Cloudinary (`ssbu/portraits/<sha256>`).
- **Modificar:**
  - `tools/board_public.py` — Añade `variants` por entrada en `public/drive-alts.json`, cruzando retratos contra `data/sd_portraits.json` ∪ `data/variant_portraits.json`.
  - `public/drive-alts.json` — Artefacto regenerado por `tools/board_public.py`.
  - `tests/unit/test_board_public.py` — Pruebas de filtrado de variantes y cruce de retratos publicados.
  - `firestore.rules` — Añade `okVariant` en `changes/{id}` y campos opcionales `from_variant` / `variant` en `history/{id}`.
  - `tools/db.py` — Incluye `variant` y `proposal.chosen_variant` en `draft(db)` e historial.
  - `tools/review_plan.py` — Reconoce `variant`, informa origen → destino y trata múltiples variantes distintas del mismo mod como `INFO` en lugar de `AVISO` de duplicado.
  - `tests/unit/test_review.py` — Verifica revisión de dos variantes distintas del mismo mod en un luchador.
  - `docs/SELECTION_CONTRACT.md` — Documenta `variant` y `proposal.chosen_variant`.
  - `src/shared/helpers/domain.ts` — Añade `sameLook` y soporte de `variant` / `expVariant` en `assignBlock`, `setOp` y `clearOp`.
  - `src/shared/helpers/ssbu.ts` — Extiende `PlanRow`, `Op` y `Domain` con `variant` y `expVariant`.
  - `tests/unit/test_domain.mjs` — Verifica asignación de variantes distintas vs. duplicadas y operaciones `setOp` / `clearOp`.
  - `src/features/plan/services/sync.ts` — Propaga `variant` en `confirmPlan`, `mergeChanges`, `planVariant`, `planEntries`, `flush`, `conflict`, `changes` e `history`.
  - `tests/unit/sync_ordering.js` — Verifica reemplazo de variante en el mismo traje y detección de conflicto remoto de variante.
  - `src/features/roster/driveAlts.ts` — Añade `DriveVariant` y campo `variants?: DriveVariant[]` en `DriveAlt`.
  - `src/features/plan/composables/usePlan.ts` — Añade parámetro `variant` en `proposeAt`, restaura `prevVariant` al deshacer en `clearAt`, exporta `chosen_variant` en `exportPlan` y expone `window.planVariant`.
  - `src/features/fighters/composables/useSummarySheet.ts` — Muestra sufijo ` · Color N` cuando una propuesta incluye `variant`.
- **No tocar:**
  - `AGENTS.md` (tiene cambios locales ajenos a esta tarea), `ultimate/`, `catalog/`, la SD ni `~/Documents/smash-mod-assets`.

## Sin datos todavía y texto de la referencia que no se publica

- **Sin datos todavía:**
  - `data/variant_portraits.json`: los retratos `.bntx` de variantes no instaladas en la SD aún no están subidos a Cloudinary; `tools/board_public.py` expone `portrait: null` para todo SHA ausente de `data/sd_portraits.json` y `data/variant_portraits.json`, de forma que la UI muestre «Sin retrato» sin sustituir nunca por imágenes ajenas.
  - Los mods de `data/drive.json` sin archivo aún en `data/variants/*.json` reciben `variants: []` hasta correr `tools/inspect_variants.py` sobre ellos.
- **Texto de la referencia que no se publica:**
  - Nombres internos del plan o de ramas («Fase 1», «PR previo», `feat/variant-inspector`, «gate perezoso») no se publican en ningún texto visible de la interfaz ni en contratos de usuario.

---

### Task 1: Crear rama y rescatar inspector de variantes y manifiestos

**Files:**
- Create: `tools/inspect_variants.py`
- Create: `data/variants/*.json` (copiados desde `feat/variant-inspector`)
- Create: `tests/unit/test_inspect_variants.py`

- [ ] **Step 1: Crear rama de trabajo desde `master` sin tocar `AGENTS.md`**

Run:
```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout -b feat/fase1-variantes-contrato master
git -C /Users/gian/Desktop/ssbu/ssbu-skins checkout feat/variant-inspector -- data/variants
```
Expected: nueva rama `feat/fase1-variantes-contrato` creada y 79 archivos bajo `data/variants/`.

- [ ] **Step 2: Crear `tools/inspect_variants.py` con selección del `.bntx` de mayor resolución (`BRTI`)**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/tools/inspect_variants.py`:

```python
# Inspecciona las variantes reales de un mod del Drive: descomprime una COPIA local del archivo y lista qué apariencias trae cada color.
# Uso: python3 tools/inspect_variants.py <SSBU_mods> <mod_id>... [--work <dir>] [--out data/variants] [--portraits <dir>]
# Solo lee el Drive. No toca la SD, el catálogo ni Firestore. Escribe un manifiesto por mod en --out (<mod_id>.json).
import argparse, hashlib, json, os, re, shutil, struct, subprocess, sys, zipfile

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SKIP_DIRS = {'__MACOSX'}
SKIP_FILES = {'.DS_Store'}
DIR_TOKEN = re.compile(r'(?:^|/)c(\d\d)(?=/)')
FILE_TOKEN = re.compile(r'[_.]c(\d\d)(?=[_.])')
CHARA = re.compile(r'^chara_\d+_[a-z0-9_]+_(\d\d)\.bntx$')
ARCHIVE_EXT = ('.zip', '.rar', '.7z')
SPLIT = re.compile(r'\.(z\d\d|part\d+\.rar|r\d\d)$')
TRIM_MARGIN = 0.08


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def portrait_size(path):
    """Área en píxeles leída de la cabecera BRTI del BNTX (0 si no es BNTX válido)."""
    try:
        with open(path, 'rb') as stream:
            header = stream.read(4096)
    except OSError:
        return 0
    offset = header.find(b'BRTI')
    if header[:4] != b'BNTX' or offset < 0 or offset + 0x2C > len(header):
        return 0
    width, height = struct.unpack_from('<II', header, offset + 0x24)
    return width * height


def trim_to_figure(image, margin_ratio=TRIM_MARGIN):
    rgba = image.convert('RGBA')
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    x0, y0, x1, y1 = bbox
    pad = max(1, int(max(x1 - x0, y1 - y0) * margin_ratio))
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def color_of(rel):
    """(índice 0-7 o None, ruta normalizada sin el color). Un número fuera de 0-7 no es un color."""
    name = os.path.basename(rel)
    m = CHARA.match(name)
    if m and 'chara' in rel and int(m[1]) <= 7:
        return int(m[1]), rel[:-len(name)] + re.sub(r'_\d\d\.bntx$', '_XX.bntx', name)
    m = DIR_TOKEN.search(rel)
    if m and int(m[1]) <= 7:
        return int(m[1]), rel[:m.start(1)] + 'XX' + rel[m.end(1):]
    m = FILE_TOKEN.search(name)
    if m and int(m[1]) <= 7:
        return int(m[1]), rel[:-len(name)] + name[:m.start(1)] + 'XX' + name[m.end(1):]
    return None, rel


def real_files(root):
    for base, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith('._'))
        for name in sorted(files):
            if name in SKIP_FILES or name.startswith('._'):
                continue
            full = os.path.join(base, name)
            yield os.path.relpath(full, root).replace(os.sep, '/'), full


def best_portrait(items):
    candidates = [(idx, portrait_size(full), rel) for idx, (_, rel, full) in enumerate(items) if CHARA.match(os.path.basename(rel))]
    if not candidates:
        return None
    return max(candidates, key=lambda item: (item[1], -item[0]))[2]


def variants_in(root):
    """Variantes por color de un árbol ya extraído. Un color solo existe si tiene archivos reales."""
    colors, shared = {}, []
    for rel, full in real_files(root):
        n, norm = color_of(rel)
        if n is None:
            shared.append(rel)
        else:
            colors.setdefault(n, []).append((norm, rel, full))
    out, seen = [], {}
    for n in sorted(colors):
        items = sorted(colors[n])
        digest = hashlib.sha256()
        for norm, _, full in items:
            digest.update(norm.encode() + b'\0' + sha256(full).encode() + b'\0')
        content = digest.hexdigest()
        out.append({
            'color': n,
            'slot': f'c{n:02d}',
            'files_count': len(items),
            'content_sha256': content,
            'duplicate_of': seen.get(content),
            'portrait_source': best_portrait(items),
            'has_model': any('/model/' in '/' + rel for _, rel, _ in items),
        })
        seen.setdefault(content, f'c{n:02d}')
    return out, shared


def extract(archive, dest):
    """Devuelve None si extrajo, o el motivo si no pudo. Siempre trabaja sobre una copia en dest."""
    if os.path.isdir(dest) and os.listdir(dest):
        return None
    low = archive.lower()
    if SPLIT.search(low):
        return 'archivo partido'
    os.makedirs(dest, exist_ok=True)
    try:
        if low.endswith('.zip'):
            with zipfile.ZipFile(archive) as z:
                base = os.path.realpath(dest)
                for info in z.infolist():
                    target = os.path.realpath(os.path.join(dest, info.filename))
                    if target != base and not target.startswith(base + os.sep):
                        raise ValueError('ruta fuera del destino')
                z.extractall(dest)
            return None
        tools = [(name, cmd) for name, cmd in (
            ('7zz', ['7zz', 'x', '-y', '-bd', '-o' + dest, archive]),
            ('unar', ['unar', '-q', '-f', '-o', dest, archive]),
        ) if shutil.which(name)]
        if not tools:
            return 'sin 7zz ni unar'
        failures = []
        for name, cmd in tools:
            r = subprocess.run(cmd, capture_output=True, text=True)
            if not r.returncode:
                return None
            shutil.rmtree(dest, ignore_errors=True)
            os.makedirs(dest, exist_ok=True)
            failures.append(name + (' no soporta el método' if 'Unsupported' in r.stdout + r.stderr else ' falló'))
        shutil.rmtree(dest, ignore_errors=True)
        return '; '.join(failures)
    except (zipfile.BadZipFile, ValueError, OSError) as e:
        shutil.rmtree(dest, ignore_errors=True)
        return f'{type(e).__name__}: {e}'


def inspect_mod(mod, drive_root, work):
    mod_dir = os.path.join(drive_root, mod['folder'])
    archives = []
    for item in mod.get('files') or []:
        if not (item['path'].lower().endswith(ARCHIVE_EXT) or SPLIT.search(item['path'].lower())):
            continue
        full = os.path.join(mod_dir, item['path'])
        entry = {'path': item['path'], 'md5': item.get('md5'), 'kind': item.get('kind')}
        if not os.path.isfile(full):
            archives.append({**entry, 'inspected': False, 'reason': 'archivo ausente del Drive'})
            continue
        actual = md5(full)
        if item.get('md5') and actual != item['md5']:
            archives.append({**entry, 'inspected': False, 'reason': f'MD5 distinto del manifiesto ({actual})'})
            continue
        dest = os.path.join(work, str(mod['mod_id']), actual)
        reason = extract(full, dest)
        if reason:
            archives.append({**entry, 'md5': actual, 'inspected': False, 'reason': reason})
            continue
        found, shared = variants_in(dest)
        for v in found:
            v['variant_id'] = f"{mod['code']}:{mod['mod_id']}:{actual[:8]}:{v['slot']}"
        archives.append({**entry, 'md5': actual, 'inspected': True, 'variants': found, 'shared_files': len(shared), 'shared_sample': shared[:10], '_root': dest})
    return {'mod_id': mod['mod_id'], 'code': mod['code'], 'folder': mod['folder'], 'archives': archives}


def export_portraits(manifest, out_dir):
    """Retratos opcionales: decodifica con tools/bntx.py y Pillow, recortando igual que sd_board_portraits.py."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from bntx import decode
    os.makedirs(out_dir, exist_ok=True)
    for a in manifest['archives']:
        for v in a.get('variants') or []:
            v['portrait'] = None
            if not v['portrait_source']:
                continue
            src = os.path.join(a['_root'], v['portrait_source'])
            try:
                sha = sha256(src)
                dest = os.path.join(out_dir, sha + '.webp')
                if not os.path.isfile(dest):
                    image = trim_to_figure(decode(src))
                    image.thumbnail((512, 512))
                    image.save(dest, 'WEBP', quality=85, method=4)
                v['portrait'] = sha
            except Exception:
                v['portrait'] = None


def main():
    p = argparse.ArgumentParser(description='Inspecciona variantes de mods del Drive sobre una copia local.')
    p.add_argument('drive')
    p.add_argument('mod_ids', nargs='+')
    p.add_argument('--work', default=os.path.expanduser('~/Documents/smash-mod-assets/derived/variants'))
    p.add_argument('--out', default=os.path.join(R, 'data', 'variants'))
    p.add_argument('--portraits')
    a = p.parse_args()
    if not os.path.isdir(os.path.join(a.drive, 'mario')) and not any(os.path.isdir(os.path.join(a.drive, d)) for d in os.listdir(a.drive)):
        sys.exit('El Drive no tiene carpetas de luchadores: no escribo nada.')
    drive = json.load(open(os.path.join(R, 'data', 'drive.json'), encoding='utf-8'))
    mods = {str(m['mod_id']): m for m in drive['mods']}
    os.makedirs(a.out, exist_ok=True)
    rc = 0
    for mod_id in a.mod_ids:
        mod = mods.get(mod_id)
        if not mod or mod.get('kind') != 'skin':
            print(f'{mod_id}: no es una skin del manifiesto')
            rc = 1
            continue
        manifest = inspect_mod(mod, a.drive, a.work)
        if a.portraits:
            export_portraits(manifest, a.portraits)
        for ar in manifest['archives']:
            ar.pop('_root', None)
        with open(os.path.join(a.out, f'{mod_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')
        ok = sum(1 for x in manifest['archives'] if x['inspected'])
        print(f"{mod_id}: {ok}/{len(manifest['archives'])} archivos inspeccionados")
    return rc


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Crear `tests/unit/test_inspect_variants.py`**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_inspect_variants.py`:

```python
"""Inspector de variantes (tools/inspect_variants.py) sobre un Drive falso: colores reales, duplicados, BNTX mayor, ._*, archivos sin abrir y MD5 distinto."""
import hashlib, os, struct, sys, tempfile, unittest, zipfile

R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import inspect_variants as iv


def make_zip(path, files):
    with zipfile.ZipFile(path, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)


def fake_bntx(width, height):
    head = b'BNTX' + b'\x00' * 12 + b'BRTI' + b'\x00' * (0x24 - 4)
    return head + struct.pack('<II', width, height) + b'\x00' * 16


def md5_of(path):
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


class Tree(unittest.TestCase):
    def tree(self, files):
        root = tempfile.mkdtemp()
        for rel, data in files.items():
            full = os.path.join(root, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'wb') as f:
                f.write(data)
        return root

    def test_color_tokens(self):
        self.assertEqual(iv.color_of('fighter/mario/model/body/c03/a.nutexb'), (3, 'fighter/mario/model/body/cXX/a.nutexb'))
        self.assertEqual(iv.color_of('sound/bank/fighter/se_mario_c05.nus3audio')[0], 5)
        self.assertEqual(iv.color_of('ui/replace/chara/chara_0/chara_0_mario_02.bntx')[0], 2)
        self.assertEqual(iv.color_of('config.json')[0], None)
        self.assertEqual(iv.color_of('fighter/mario/model/body/c09/a.nutexb')[0], None)

    def test_variants_duplicates_shared_and_junk(self):
        root = self.tree({
            'fighter/mario/model/body/c00/a.nutexb': b'A',
            'fighter/mario/model/body/c01/a.nutexb': b'B',
            'fighter/mario/model/body/c02/a.nutexb': b'A',
            'fighter/mario/model/body/c03/._a.nutexb': b'junk',
            'ui/replace/chara/chara_0/chara_0_mario_01.bntx': b'P',
            'config.json': b'{}',
            '__MACOSX/fighter/mario/model/body/c06/a.nutexb': b'x',
        })
        found, shared = iv.variants_in(root)
        by = {v['slot']: v for v in found}
        self.assertEqual(sorted(by), ['c00', 'c01', 'c02'])
        self.assertIsNone(by['c00']['duplicate_of'])
        self.assertEqual(by['c02']['duplicate_of'], 'c00')
        self.assertIsNone(by['c01']['duplicate_of'])
        self.assertEqual(by['c01']['portrait_source'], 'ui/replace/chara/chara_0/chara_0_mario_01.bntx')
        self.assertIsNone(by['c00']['portrait_source'])
        self.assertEqual(shared, ['config.json'])
        self.assertTrue(by['c00']['has_model'])

    def test_prefers_largest_bntx_portrait(self):
        root = self.tree({
            'fighter/mario/model/body/c00/a.nutexb': b'A',
            'ui/replace/chara/chara_0/chara_0_mario_00.bntx': fake_bntx(128, 128),
            'ui/replace/chara/chara_3/chara_3_mario_00.bntx': fake_bntx(512, 512),
        })
        found, _ = iv.variants_in(root)
        self.assertEqual(found[0]['portrait_source'], 'ui/replace/chara/chara_3/chara_3_mario_00.bntx')


class Inspect(unittest.TestCase):
    def setUp(self):
        self.drive = tempfile.mkdtemp()
        self.work = tempfile.mkdtemp()
        d = os.path.join(self.drive, 'mario', '1_x', 'original')
        os.makedirs(d)
        make_zip(os.path.join(d, 'ok.zip'), {'fighter/mario/model/body/c01/a.nutexb': b'B', 'fighter/mario/model/body/c04/a.nutexb': b'C'})
        for name, data in (('partido.z01', b'x'), ('viejo.rar', b'not a rar')):
            with open(os.path.join(d, name), 'wb') as f:
                f.write(data)
        self.mod = {'mod_id': 1, 'code': '01', 'folder': 'mario/1_x', 'files': [
            {'path': 'original/ok.zip', 'md5': md5_of(os.path.join(d, 'ok.zip')), 'kind': 'original'},
            {'path': 'original/partido.z01', 'md5': None, 'kind': 'original'},
            {'path': 'original/viejo.rar', 'md5': None, 'kind': 'original'},
            {'path': 'original/falta.zip', 'md5': None, 'kind': 'original'},
        ]}

    def test_inspect(self):
        out = iv.inspect_mod(self.mod, self.drive, self.work)
        ok, parts, rar, missing = out['archives']
        self.assertTrue(ok['inspected'])
        self.assertEqual([v['slot'] for v in ok['variants']], ['c01', 'c04'])
        self.assertTrue(ok['variants'][0]['variant_id'].startswith('01:1:' + ok['md5'][:8]))
        self.assertEqual(parts['reason'], 'archivo partido')
        self.assertFalse(rar['inspected'])
        self.assertEqual(missing['reason'], 'archivo ausente del Drive')

    def test_md5_mismatch_is_not_inspected(self):
        self.mod['files'][0]['md5'] = '0' * 32
        a = iv.inspect_mod(self.mod, self.drive, self.work)['archives'][0]
        self.assertFalse(a['inspected'])
        self.assertIn('MD5 distinto', a['reason'])

    def test_zip_slip_rejected(self):
        d = os.path.join(self.drive, 'mario', '1_x', 'original')
        make_zip(os.path.join(d, 'mal.zip'), {'../../escape.txt': b'x'})
        self.mod['files'] = [{'path': 'original/mal.zip', 'md5': None, 'kind': 'original'}]
        a = iv.inspect_mod(self.mod, self.drive, self.work)['archives'][0]
        self.assertFalse(a['inspected'])


class Fallback(unittest.TestCase):
    def test_unar_runs_when_7zz_fails(self):
        from unittest import mock
        calls = []

        def run(cmd, **kw):
            calls.append(cmd[0])
            return mock.Mock(returncode=1 if cmd[0] == '7zz' else 0, stdout='Unsupported Method', stderr='')

        dest = os.path.join(tempfile.mkdtemp(), 'out')
        with mock.patch.object(iv.shutil, 'which', lambda n: '/bin/' + n), mock.patch.object(iv.subprocess, 'run', run):
            self.assertIsNone(iv.extract('x.rar', dest))
        self.assertEqual(calls, ['7zz', 'unar'])

    def test_reason_names_every_tool_that_failed(self):
        from unittest import mock
        dest = os.path.join(tempfile.mkdtemp(), 'out')
        run = lambda cmd, **kw: mock.Mock(returncode=1, stdout='', stderr='boom')
        with mock.patch.object(iv.shutil, 'which', lambda n: '/bin/' + n), mock.patch.object(iv.subprocess, 'run', run):
            self.assertEqual(iv.extract('x.rar', dest), '7zz falló; unar falló')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 4: Ejecutar pruebas del inspector y confirmar que pasan**

Run:
```bash
python3 -m unittest discover -s /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit -p 'test_inspect_variants.py' -v
```
Expected: `Ran 8 tests ... OK`

- [ ] **Step 5: Commit de Task 1**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tools/inspect_variants.py data/variants tests/unit/test_inspect_variants.py
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(tools): add Drive variant inspector and inspected manifests"
```

---

### Task 2: Publicar variantes y cruce seguro de retratos en `drive-alts.json`

**Files:**
- Modify: `tools/board_public.py`
- Modify: `tests/unit/test_board_public.py`
- Modify: `public/drive-alts.json`

- [ ] **Step 1: Actualizar `tools/board_public.py` para cargar variantes y cruzar retratos con `sd_portraits.json` ∪ `variant_portraits.json`**

Reemplazar las funciones desde `look_name` hasta el final en `/Users/gian/Desktop/ssbu/ssbu-skins/tools/board_public.py`:

```python
def look_name(mod):
    catalog = mod.get('catalog') or []
    if catalog and isinstance(catalog[0], dict) and catalog[0].get('look_name'):
        return catalog[0]['look_name']
    return mod.get('slug') or str(mod.get('mod_id') or '')


def load_variants():
    """Manifiestos de tools/inspect_variants.py por mod_id. Sin carpeta, la web ofrece el mod sin variantes."""
    folder = os.path.join(cd.R, 'data', 'variants')
    found = {}
    if os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if name.endswith('.json'):
                found[name[:-5]] = json.load(open(os.path.join(folder, name), encoding='utf-8'))
    return found


def published_portraits(sd_map=None, extra=None):
    """Unión de hashes SHA-256 ya publicados en Cloudinary (SD instalada + variantes subidas)."""
    found = {
        sha
        for slots in (sd_map or {}).values()
        if isinstance(slots, dict)
        for sha in slots.values()
        if isinstance(sha, str) and len(sha) == 64
    }
    for sha in extra or []:
        if isinstance(sha, str) and len(sha) == 64:
            found.add(sha)
    return found


def variants_of(manifest, published=frozenset()):
    """Apariencias distintas de un mod: solo archivos originales con modelo, sin colores repetidos ni packs parciales.

    Dos archivos con el mismo contenido de un color (pack completo y single_slot) son una sola apariencia: gana el que trae más colores.
    El retrato solo se ofrece si ya está publicado; nunca se sustituye por otra imagen."""
    archives = [a for a in (manifest or {}).get('archives') or [] if a.get('inspected') and a.get('kind') == 'original']
    archives.sort(key=lambda a: (-len(a.get('variants') or []), a['path']))
    seen, out = set(), []
    for archive in archives:
        for v in archive.get('variants') or []:
            if not v.get('has_model') or v.get('duplicate_of') or v['content_sha256'] in seen:
                continue
            seen.add(v['content_sha256'])
            sha = v.get('portrait')
            out.append({
                'id': v['variant_id'],
                'slot': v['color'] + 1,
                'source': archive['path'],
                'portrait': sha if sha in published else None,
            })
    out.sort(key=lambda row: (row['slot'], row['id']))
    return out


def drive_alts(drive, vids, unaudited=frozenset(), previews=None, variants=None, published=frozenset()):
    previews = previews or {}
    variants = variants or {}
    rows = []
    for mod in drive.get('mods') or []:
        if mod.get('kind') != 'skin' or mod.get('plugin'):
            continue
        code = mod.get('code')
        if not isinstance(code, str) or not code or len(code) > 4:
            continue
        mod_id = str(mod.get('mod_id') or '')
        slots, any_color = file_slots(mod)
        if not slots:
            continue
        rows.append({
            'code': code,
            'mod_id': mod_id,
            'name': look_name(mod),
            'slots': [n + 1 for n in slots],
            'any': any_color,
            'vid': vids.get((code, mod_id)),
            'unaudited': (code, mod_id) in unaudited,
            'img': previews.get(mod_id),
            'variants': variants_of(variants.get(mod_id), published),
        })
    rows.sort(key=lambda row: (row['code'], row['name'].lower()))
    return rows


def load_rows():
    catalog = cd._jload('catalog.json') or {}
    published = published_portraits(cd._jload('sd_portraits.json'), cd._jload('variant_portraits.json'))
    return drive_alts(
        cd._jload('drive.json') or {},
        vids_by_mod(catalog),
        unaudited_mods(catalog),
        cd._jload('drive_previews.json') or {},
        load_variants(),
        published,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows = load_rows()
    missing = sum(1 for row in rows if not row['vid'])
    dest = os.path.join(cd.R, 'public', 'drive-alts.json')
    if args.check:
        current = json.load(open(dest, encoding='utf-8')) if os.path.isfile(dest) else None
        if current != rows:
            print(f'drive-alts.json no cuadra ({missing} sin vid de {len(rows)})')
            return 1
    else:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        json.dump(rows, open(dest, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'ok · {dest} · {len(rows)} alternativas · {missing} sin vid')
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 2: Añadir pruebas unitarias en `tests/unit/test_board_public.py`**

Añadir la clase `Variants` en `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_board_public.py` antes de `if __name__ == '__main__':`:

```python
class Variants(unittest.TestCase):
    def manifest(self):
        def v(color, sha, model=True, dup=None, portrait=None):
            return {
                'color': color,
                'slot': f'c0{color}',
                'content_sha256': sha,
                'duplicate_of': dup,
                'has_model': model,
                'portrait': portrait,
                'variant_id': f'01:9:aaaaaaaa:c0{color}',
            }

        full = {'path': 'original/all.zip', 'kind': 'original', 'inspected': True, 'variants': [v(0, 'a'), v(1, 'b'), v(2, 'a', dup='c00'), v(3, 'x', model=False)]}
        single = {'path': 'original/single_c01.zip', 'kind': 'original', 'inspected': True, 'variants': [{**v(1, 'b'), 'variant_id': '01:9:bbbbbbbb:c01'}]}
        broken = {'path': 'original/x.rar', 'kind': 'original', 'inspected': False, 'reason': 'sin 7zz'}
        edited = {'path': 'modificado/m.zip', 'kind': 'modificado', 'inspected': True, 'variants': [v(5, 'z')]}
        return {'archives': [single, full, broken, edited]}

    def test_only_distinct_appearances_with_model(self):
        got = bp.variants_of(self.manifest())
        self.assertEqual([row['slot'] for row in got], [1, 2])
        self.assertEqual(got[1]['source'], 'original/all.zip')

    def test_portrait_only_when_published_in_sd_or_variants(self):
        sha_sd = 'a' * 64
        sha_var = 'b' * 64
        pub = bp.published_portraits({'01': {'0': sha_sd}}, [sha_var, 'corto'])
        self.assertEqual(pub, {sha_sd, sha_var})
        manifest = self.manifest()
        manifest['archives'][1]['variants'][0]['portrait'] = sha_sd
        self.assertIsNone(bp.variants_of(manifest)[0]['portrait'])
        self.assertEqual(bp.variants_of(manifest, pub)[0]['portrait'], sha_sd)

    def test_no_manifest_means_no_variants(self):
        self.assertEqual(bp.variants_of(None), [])
```

- [ ] **Step 3: Regenerar `public/drive-alts.json` y correr pruebas**

Run:
```bash
python3 /Users/gian/Desktop/ssbu/ssbu-skins/tools/board_public.py
python3 /Users/gian/Desktop/ssbu/ssbu-skins/tools/board_public.py --check
python3 -m unittest discover -s /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit -p 'test_board_public.py' -v
```
Expected: `ok · .../public/drive-alts.json`, `--check` sale `0` y todas las pruebas de `test_board_public.py` pasan.

- [ ] **Step 4: Commit de Task 2**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add tools/board_public.py public/drive-alts.json tests/unit/test_board_public.py
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(tools): publish Drive variants and verified portrait hashes"
```

---

### Task 3: Reglas de Firestore, exportación `db.py`, revisión `review_plan.py` y contrato

**Files:**
- Modify: `firestore.rules:16-66`
- Modify: `tools/db.py:118-138`
- Modify: `tools/review_plan.py:64-145`
- Modify: `tests/unit/test_review.py:36-45`
- Modify: `docs/SELECTION_CONTRACT.md:26-46`

- [ ] **Step 1: Actualizar `firestore.rules` con `okVariant` retrocompatible**

Modificar `/Users/gian/Desktop/ssbu/ssbu-skins/firestore.rules` (añadir `okVariant` tras `okRef`, permitir `variant` en `changes` y `from_variant`/`variant` en `history`):

```javascript
    function okRef(v) { return v == null || (v is string && v.size() <= 80); }
    // Variante opcional: apariencia concreta de un mod (<vid>:<md5 corto>:<cNN>). Debe pertenecer al mismo vid que se propone.
    function okVariant(d, vid) {
      return !('variant' in d) || (d.variant is string && d.variant.size() <= 120 && d.variant.matches(vid + ':[0-9a-f]{8}:c0[0-7]'));
    }
```

En `match /changes/{id}`:
```javascript
    match /changes/{id} {
      allow read: if true;
      allow create, update: if signedIn()
        && request.resource.data.keys().hasOnly(['code', 'slot', 'vid', 'variant', 'by', 'at'])
        && request.resource.data.code is string && request.resource.data.code.size() <= 4
        && okSlot(request.resource.data.slot)
        && id == request.resource.data.code + '_' + string(request.resource.data.slot)
        && okVid(request.resource.data.code, request.resource.data.vid)
        && okVariant(request.resource.data, request.resource.data.vid)
        && request.resource.data.by == request.auth.uid
        && request.resource.data.at == request.time;
      allow delete: if signedIn();
    }
```

En `match /history/{id}`:
```javascript
    match /history/{id} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.keys().hasOnly(['code', 'slot', 'from', 'to', 'from_variant', 'variant', 'kind', 'by', 'at'])
        && request.resource.data.code is string && request.resource.data.code.size() <= 4
        && okSlot(request.resource.data.slot)
        && okRef(request.resource.data.from) && okRef(request.resource.data.to)
        && (!('from_variant' in request.resource.data) || (request.resource.data.from_variant is string && request.resource.data.from_variant.size() <= 120))
        && (!('variant' in request.resource.data) || (request.resource.data.variant is string && request.resource.data.variant.size() <= 120))
        && request.resource.data.kind in ['set', 'clear', 'undo']
        && request.resource.data.by == request.auth.uid
        && request.resource.data.at == request.time;
      allow update, delete: if false;
    }
```

- [ ] **Step 2: Actualizar `tools/db.py`, `tools/review_plan.py` y `docs/SELECTION_CONTRACT.md`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/db.py` dentro de `draft(db)`:

```python
    for d in db.collection('changes').stream():
        c = d.to_dict(); f, p = by_vid.get(c.get('vid'), (None, None))
        code, n = c['code'], c['slot']; fi = next((x for x in fighters if x['code'] == code), None)
        cv = c.get('variant')
        chosen = {'id': cv, 'source_slot': cv[-3:], 'destination_slot': f'c{n:02d}'} if isinstance(cv, str) and len(cv) >= 3 else None
        st = status.get(c['vid']) or {}
        rows.append({'fighter': fi['name'] if fi else code, 'roster_no': code, 'traje': n + 1, 'slot': f'c{n:02d}',
                     'current': _current(inv, code, n),
                     'proposal': None if not p else {'vid': p['vid'], 'role': p['role'], 'variant': p['variant'], 'chosen_variant': chosen, 'mod_id': p['id'], 'name': p['name'], 'author': p['author'], 'url': p['url'],
                                                    'online': ONLINE.get(p['wifi_status'], 'Online: sin auditar'), 'conditions': p['conditions'] or None,
                                                    'dependencies': p['deps'] or None, 'conflicts': p['conflicts'] or None, 'native_slots': p['slots_orig'],
                                                    'dest_hint': p['dest'], 'pack': p['pack'], 'withdrawn': p['withdrawn']},
                     'missing_in_catalog': p is None, 'vid': c['vid'], 'variant': cv, 'proposed_at': c['at'].isoformat() if c.get('at') else None,
                     'status': st.get('status', 'wanted'), 'result': st.get('result')})
    rows.sort(key=lambda r: (r['roster_no'], r['traje']))
    hist = [{'at': h['at'].isoformat() if h.get('at') else None, 'roster_no': h['code'], 'traje': h['slot'] + 1, 'from': h.get('from'), 'to': h.get('to'),
             **({'from_variant': h['from_variant']} if h.get('from_variant') else {}), **({'variant': h['variant']} if h.get('variant') else {}), 'kind': h.get('kind')}
            for h in (d.to_dict() for d in db.collection('history').order_by('at', direction='DESCENDING').limit(50).stream())]
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/tools/review_plan.py`:
1. En `read_file(path)`:
```python
def read_file(path):
    d = json.load(open(path, encoding='utf-8'))
    ch = [{
        'code': c['roster_no'],
        'slot': c['traje'] - 1,
        'vid': c['vid'],
        'variant': c.get('variant') or ((c.get('proposal') or {}).get('chosen_variant') or {}).get('id'),
        'at': None,
        'by': None,
    } for c in d.get('changes', [])]
    return ch, d.get('history', []), d.get('inventory', {}).get('version')
```
2. En `review(...)`:
   - Leer `chosen_variant = c.get('variant')` e incluir `'chosen_variant': chosen_variant` en `it`.
   - Guardar `per_fighter[code].append((n, p, chosen_variant))`.
   - Tras `if p['variant']: add(N, 'INFO', ...)`, añadir:
     `if chosen_variant: add(N, 'INFO', f'variante elegida: {chosen_variant} (origen {chosen_variant[-3:]} → destino c0{n})')`
   - En el bloque `# globales` de `per_fighter`:
```python
    for code, lst in per_fighter.items():
        c = collections.Counter(p['id'] for _, p, _ in lst)
        for mid, k in c.items():
            if k <= 1:
                continue
            rows_m = [(n, cv) for n, p, cv in lst if p['id'] == mid]
            slots_str = ', '.join(f'c0{n}' for n, _ in rows_m)
            variants_m = [cv for _, cv in rows_m if cv]
            if len(variants_m) == k and len(set(variants_m)) == k:
                add(F, 'INFO', f'{by_code[code]["name"]}: {k} variantes distintas del mod {mid} en {slots_str}')
            else:
                add(F, 'AVISO', f'{by_code[code]["name"]}: el mismo mod ({mid}) está en {k} trajes ({slots_str}); si es un pack de varios diseños está bien, si no es un duplicado')
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/docs/SELECTION_CONTRACT.md`, documentar `chosen_variant` en el bloque JSON de ejemplo y añadir la viñeta explicativa de `<vid>:<md5_corto>:<cNN>`.

- [ ] **Step 3: Añadir prueba en `tests/unit/test_review.py` y ejecutarla**

Añadir en `Revision` (`/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_review.py`):

```python
    def test_dos_variantes_distintas_del_mismo_mod_es_info_no_aviso(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        rows = [
            {'code': '01', 'slot': 1, 'vid': p['vid'], 'variant': f"{p['vid']}:aaeedf35:c00"},
            {'code': '01', 'slot': 2, 'vid': p['vid'], 'variant': f"{p['vid']}:aaeedf35:c03"},
        ]
        it, g = rp.review(rows, [], F, INV)
        self.assertFalse(any('está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
        self.assertTrue(any('2 variantes distintas' in x for x in msgs(it, g, 'INFO')))
        self.assertTrue(any('variante elegida:' in x for x in msgs(it, g, 'INFO')))
```

Run:
```bash
python3 -m unittest discover -s /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit -p 'test_review.py' -v
```
Expected: todas las pruebas de `test_review.py` pasan (`OK`).

- [ ] **Step 4: Commit de Task 3**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add firestore.rules tools/db.py tools/review_plan.py tests/unit/test_review.py docs/SELECTION_CONTRACT.md
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(plan): validate and review chosen variant in Firestore contract"
```

---

### Task 4: Soporte de `variant` en dominio (`domain.ts`, `ssbu.ts`) y sincronización (`sync.ts`)

**Files:**
- Modify: `src/shared/helpers/domain.ts:212-238`
- Modify: `src/shared/helpers/ssbu.ts:25-86`
- Modify: `src/features/plan/services/sync.ts:41-61,128-191,239`
- Modify: `tests/unit/test_domain.mjs`
- Modify: `tests/unit/sync_ordering.js`

- [ ] **Step 1: Actualizar `src/shared/helpers/domain.ts` y `src/shared/helpers/ssbu.ts`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/domain.ts`, reemplazar `assignBlock`, `setOp` y `clearOp` por:

```javascript
  const sameLook = (e, vid, variant) =>
    e.vid === vid && (!variant || !e.variant || e.variant === variant);

  function assignBlock(entries, code, slot, vid, variant) {
    if (!validSlot(slot)) return { kind: 'bad-slot' };

    const dup = (entries || []).find(e => e.code === code && e.n !== slot && sameLook(e, vid, variant));

    if (dup) return { kind: 'duplicate', other: dup.n };

    const cur = (entries || []).find(e => e.code === code && e.n === slot);

    if (cur && cur.vid === vid && (cur.variant || null) === (variant || null)) return { kind: 'same' };
    if (cur) return { kind: 'replace', currentVid: cur.vid };
    return { kind: 'free' };
  }

  function setOp(code, n, vid, prev, variant, prevVariant) {
    if (!validSlot(n)) return null;
    if (prev === vid && (variant || null) === (prevVariant || null)) return null;

    const op = { code, slot: n, to: vid, exp: prev, kind: 'set' };

    if (variant) op.variant = variant;
    if (prevVariant) op.expVariant = prevVariant;
    return op;
  }

  function clearOp(code, n, prev, prevVariant) {
    if (!validSlot(n) || !prev) return null;

    const op = { code, slot: n, to: null, exp: prev, kind: 'clear' };

    if (prevVariant) op.expVariant = prevVariant;
    return op;
  }
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/ssbu.ts`, añadir `AssignBlockResult` y actualizar `PlanRow`, `Op` y `Domain`:

```typescript
export interface AssignBlockResult {
  kind: string
  other?: number
  currentVid?: string
}

export interface PlanRow {
  code: string
  n: number
  vid: string
  variant?: string | null
}
```

```typescript
interface Op {
  code: string
  slot: number
  to: string | null
  exp: string | null
  variant?: string | null
  expVariant?: string | null
  kind: string
}
```

```typescript
  assignBlock: (entries: PlanRow[], code: string, slot: number, vid: string, variant?: string | null) => AssignBlockResult
  setOp: (code: string, slot: number, vid: string, prev: string | null, variant?: string | null, prevVariant?: string | null) => Op | null
  clearOp: (code: string, slot: number, prev: string | null, prevVariant?: string | null) => Op | null
```

- [ ] **Step 2: Actualizar `src/features/plan/services/sync.ts` con `planVariant` y detección de conflicto de variante**

Aplicar en `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/services/sync.ts`:
- `confirmPlan(key, vid, after, variant = null)` guarda `{ vid, after, variant }` en `confirmedPlan[key]` y `{ vid, variant }` en `PLAN[key]`.
- En `mergeChanges`, la condición de limpieza comprueba `value.vid === a.vid && (value.variant || null) === (a.variant || null)` y, si sigue pendiente, escribe `m[key] = { vid: a.vid, variant: a.variant || null }`.
- Añadir `function planVariant(code, n) { let v = (PLAN[keyOf(code, n)] || {}).variant || null; for (const o of PEND) if (o.code === code && o.slot === n) v = o.to ? (o.variant || null) : null; return v }` y añadir `variant: planVariant(code, n)` en `planEntries()`.
- En `flush()`:
  - Sin `FBCFG`: `PLAN[k] = { vid: o.to, variant: o.variant || null }`.
  - En la transacción: leer `curVariant = s.exists() ? (s.data().variant || null) : null`; noop si `cur === op.to && curVariant === (op.variant || null)`; conflicto si `cur !== op.exp || ('expVariant' in op && curVariant !== (op.expVariant || null))`; escribir `...(op.variant ? { variant: op.variant } : {})` en `changes` y `...(curVariant ? { from_variant: curVariant } : {}), ...(op.variant ? { variant: op.variant } : {})` en `history`.
  - Pasar `variant` / `curVariant` a `confirmPlan` y `conflict`.
- En `startDb()`: incluir `variant: v.variant || null` al poblar `PLAN` desde `changes` y `from_variant: v.from_variant || null, variant: v.variant || null` al poblar `HIST` desde `history`.
- Exportar `planVariant` en `export { ... }`.

- [ ] **Step 3: Añadir pruebas en `tests/unit/test_domain.mjs` y `tests/unit/sync_ordering.js`**

Añadir en `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_domain.mjs`:

```javascript
test('variantes de un mismo mod: se pueden poner en trajes distintos, no repetir la misma', () => {
  const entries = [{ code: '01', n: 0, vid: '01:a', variant: '01:a:aaaaaaaa:c00' }];
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a', '01:a:aaaaaaaa:c03').kind, 'free');
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a', '01:a:aaaaaaaa:c00').kind, 'duplicate');
  assert.equal(SSBU.assignBlock(entries, '01', 0, '01:a', '01:a:aaaaaaaa:c00').kind, 'same');
  assert.equal(SSBU.assignBlock(entries, '01', 0, '01:a', '01:a:aaaaaaaa:c03').kind, 'replace');
  assert.equal(SSBU.setOp('01', 0, '01:a', '01:a', '01:a:aaaaaaaa:c00', '01:a:aaaaaaaa:c00'), null);
  const op = SSBU.setOp('01', 0, '01:a', '01:a', '01:a:aaaaaaaa:c03', '01:a:aaaaaaaa:c00');
  assert.equal(op.variant, '01:a:aaaaaaaa:c03');
  assert.equal(op.expVariant, '01:a:aaaaaaaa:c00');
  const cl = SSBU.clearOp('01', 0, '01:a', '01:a:aaaaaaaa:c03');
  assert.equal(cl.expVariant, '01:a:aaaaaaaa:c03');
  assert.equal('variant' in SSBU.setOp('01', 1, '01:b', null), false);
});
```

Añadir al final de `/Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/sync_ordering.js`:

```javascript
test('replacing one variant with another of the same mod preserves the chosen variant and detects remote variant conflicts', async () => {
  const h = harness({ current: 'A', readAt: 1, commitAt: 2 });
  h.resolveReadFrom({ code: '82', slot: 0, vid: 'A', variant: 'A:11111111:c00', by: 'fixture-user', at: timestamp(1) });
  h.state.PLAN[key] = { vid: 'A', variant: 'A:11111111:c00', at: 1, by: 'fixture-user' };
  h.state.PEND = [{ code: '82', slot: 0, to: 'A', exp: 'A', expVariant: 'A:11111111:c00', variant: 'A:11111111:c03', kind: 'set' }];
  await h.flush();
  acknowledged(h, 'A');
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c03');

  let conflicted = false;
  h.state.conflict = () => { conflicted = true; };
  h.resolveReadFrom({ code: '82', slot: 0, vid: 'A', variant: 'A:11111111:c05', by: 'other', at: timestamp(3) });
  h.state.PEND.push({ code: '82', slot: 0, to: 'A', exp: 'A', expVariant: 'A:11111111:c03', variant: 'A:11111111:c07', kind: 'set' });
  await h.flush();
  assert.equal(conflicted, true);
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c05');
});
```

- [ ] **Step 4: Ejecutar pruebas de dominio y orden de sincronización**

Run:
```bash
node --test /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/test_domain.mjs /Users/gian/Desktop/ssbu/ssbu-skins/tests/unit/sync_ordering.js
```
Expected: todas las pruebas de ambos archivos pasan (`0 fail`).

- [ ] **Step 5: Commit de Task 4**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts src/features/plan/services/sync.ts tests/unit/test_domain.mjs tests/unit/sync_ordering.js
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(plan): preserve chosen variant across domain ops and sync queue"
```

---

### Task 5: Helper de retratos Cloudinary, `driveAlts.ts`, `usePlan.ts` y `useSummarySheet.ts`

**Files:**
- Create: `src/shared/helpers/portraits.ts`
- Modify: `src/features/roster/driveAlts.ts`
- Modify: `src/features/plan/composables/usePlan.ts`
- Modify: `src/features/fighters/composables/useSummarySheet.ts`

- [ ] **Step 1: Crear `src/shared/helpers/portraits.ts` y extender `src/features/roster/driveAlts.ts` (siguiendo `gian-ts-style`)**

Crear `/Users/gian/Desktop/ssbu/ssbu-skins/src/shared/helpers/portraits.ts`:

```typescript
export const CLOUDINARY_CLOUD = 'gian-dev'

export const isSha = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)

export const portraitUrl = (sha: string) =>
  `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_auto,q_auto,w_512/ssbu/portraits/${sha}`
```

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/roster/driveAlts.ts`, añadir `DriveVariant` y `variants?: DriveVariant[]`:

```typescript
export interface DriveVariant {
  id: string
  slot: number
  source: string
  portrait: string | null
}

export interface DriveAlt {
  code: string
  mod_id: string
  name: string
  slots: number[]
  any: boolean
  vid: string | null
  unaudited: boolean
  img: string | null
  variants?: DriveVariant[]
}
```

- [ ] **Step 2: Actualizar `src/features/plan/composables/usePlan.ts` con interfaces nombradas y soporte de `variant`**

En `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/plan/composables/usePlan.ts`:
1. Importar `planVariant` desde `../services/sync`.
2. Declarar interfaces con nombre para evitar shapes inline en las unidades tocadas:

```typescript
export interface ChosenVariant {
  id: string
  source_slot: string
  destination_slot: string
}

interface InventorySnapshot {
  meta?: Record<string, unknown>
}

interface HistoryRecord {
  code: string
  slot: number
  from: string | null
  to: string | null
  from_variant?: string | null
  variant?: string | null
  kind: string
  t: number | null
}

interface StatusRecord {
  status?: string
  result?: string | null
}

interface SkinLookupEntry {
  p: Skin
}
```

3. Actualizar `proposeAt`, `clearAt`, `exportPlan` y `publish`:

```typescript
export const proposeAt = (code: string, slot: number, vid: string, variant: string | null = null) => {
  if (!SSBU.validSlot(slot)) return false

  const prev = planVid(code, slot) as string | null
  const prevVariant = planVariant(code, slot) as string | null
  const block = SSBU.assignBlock(planEntries(), code, slot, vid, variant)

  if (block.kind === 'duplicate' || block.kind === 'same' || block.kind === 'bad-slot') return false

  const op = SSBU.setOp(code, slot, vid, prev, variant, prevVariant)

  if (!op) return false

  touched[keyOf(code, slot)] = Date.now()
  enqueue(op)
  return true
}

export const clearAt = (code: string, slot: number) => {
  const prev = planVid(code, slot) as string | null
  const prevVariant = planVariant(code, slot) as string | null
  const op = SSBU.clearOp(code, slot, prev, prevVariant)

  if (!op) return false

  const skin = prev ? (state.idx as Record<string, SkinLookupEntry>)[prev]?.p : null
  const label = skin ? skin.name : 'Elección'

  touched[keyOf(code, slot)] = Date.now()
  enqueue(op)
  showNotice('Se quitó ' + label, {
    label: 'Deshacer',
    fn: () => {
      dismissNotice()
      proposeAt(code, slot, prev as string, prevVariant)
    },
  })
  return true
}
```

En `exportPlan`: usar `InventorySnapshot`, `HistoryRecord`, `StatusRecord` y `SkinLookupEntry`, añadir `chosen_variant: ChosenVariant | null` en `proposal` (`entry.variant ? { id: entry.variant, source_slot: entry.variant.slice(-3), destination_slot: 'c0' + entry.n } : null`), `variant: entry.variant || null` en cada fila de `changes`, e incluir `from_variant` y `variant` opcionales en `history`. En `publish`: añadir `host.planVariant = planVariant`.

- [ ] **Step 3: Mostrar el color de variante en `src/features/fighters/composables/useSummarySheet.ts`**

Añadir antes de `sectionsOf` en `/Users/gian/Desktop/ssbu/ssbu-skins/src/features/fighters/composables/useSummarySheet.ts`:

```typescript
const variantSuffix = (variant?: string | null) => {
  if (!variant) return ''

  const match = /:c0([0-7])$/.exec(variant)

  return match ? ' · Color ' + (Number(match[1]) + 1) : ''
}
```

Y dentro de `groups` actualizar `const to`:

```typescript
const to = (skin ? skin.name : 'Skin sin nombre') + variantSuffix(row.variant)
```

- [ ] **Step 4: Ejecutar `typecheck` y `self-check.mjs` de `gian-ts-style`**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && npm run typecheck && node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs
```
Expected: `vue-tsc --noEmit` sin errores y salida final `Self-check TS: 0 pendientes`.

- [ ] **Step 5: Commit de Task 5**

```bash
git -C /Users/gian/Desktop/ssbu/ssbu-skins add src/shared/helpers/portraits.ts src/features/roster/driveAlts.ts src/features/plan/composables/usePlan.ts src/features/fighters/composables/useSummarySheet.ts
git -C /Users/gian/Desktop/ssbu/ssbu-skins commit -m "feat(ui): wire variant contract into plan composable, summary, and portrait helper"
```

---

### Task 6: Verificación integral y compuerta previa al despliegue

**Files:**
- Verify only (no modificar `AGENTS.md`)

- [ ] **Step 1: Ejecutar todas las suites unitarias (Python + Node) y `build`**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins
python3 -m unittest discover -s tests/unit -p 'test_*.py'
node --test tests/unit/*.mjs tests/unit/*.js
npm run typecheck
npm run build
node /Users/gian/.agents/skills/gian-ts-style/assets/self-check.mjs src/shared/helpers/domain.ts src/shared/helpers/ssbu.ts src/shared/helpers/portraits.ts src/features/plan/services/sync.ts src/features/roster/driveAlts.ts src/features/plan/composables/usePlan.ts src/features/fighters/composables/useSummarySheet.ts
```
Expected: 100 % de tests unitarios en verde, `build` exitoso y `Self-check TS: 0 pendientes`.

- [ ] **Step 2: Ejecutar suite e2e con emuladores locales (`demo-ssbu`)**

Run:
```bash
cd /Users/gian/Desktop/ssbu/ssbu-skins && tests/run.sh --sin-webkit
```
Expected: suite e2e en verde sobre emuladores locales (si el entorno local bloquea Java/emuladores, subir la rama y verificar la Action «Pruebas» en el PR antes de fusionar).

- [ ] **Step 3: Compuerta de seguridad antes de fusionar el PR**

1. Confirmar con `git status -s` que `AGENTS.md` no entró en ningún commit de la rama.
2. Pedir autorización explícita de Gian antes de desplegar `firestore.rules` en `ssbu-441b1` (**debe desplegarse antes de fusionar el PR en `master`** para que Vercel nunca publique un cliente cuyo esquema las reglas rechacen).
