# Plan de slots: cruza lo que hay hoy (WuBoy, perfil, mods del Drive) con lo que Gian decide, por luchador y en su orden de prioridad.
# Uso: python3 tools/slot_plan.py [--data data] [--out docs/SLOTS.md] [--check]
# Lee data/slot_plan.json (las decisiones, a mano), installed.json (slots de WuBoy), inventory_profile.json (perfil y exclusiones),
# drive.json (mods descargados) y catalog.json (nombres y estado wifi). Escribe un informe Markdown sin fechas (determinista).
# --check: errores (exit 1) si las decisiones no cuadran con los datos; avisos (exit 0) si hay algo que revisar. Nada de esto está instalado ni probado.
import argparse, json, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
WIFI = {'Declaración explícita': 'explícita', 'Declaración condicionada': 'condicionada', 'Afirmación de terceros': 'terceros',
        'Sin evidencia': 'sin evidencia', 'Incompatible': 'incompatible'}
ESTADO = {True: 'aprobado', False: 'propuesto'}
ORIGEN = {'enlace del usuario': 'usuario', 'búsqueda': 'búsqueda', 'búsqueda + enlace del usuario': 'búsqueda + usuario', 'desconocido': 'auditoría/previo'}
def origen(m): return ORIGEN.get(m.get('origin'), m.get('origin') or '—')
def del_usuario(m): return 'usuario' in origen(m)
def es_skin(m): return m.get('kind', 'plugin' if m.get('plugin') else 'skin') == 'skin'
def cell(t): return str(t).replace('|', '/')   # un | rompería la tabla

def load(data, name, dups=None):
    def hook(pairs):
        d = {}
        for k, v in pairs:
            if k in d and dups is not None: dups.append(k)
            d[k] = v
        return d
    with open(os.path.join(data, name), encoding='utf-8') as f: return json.load(f, object_pairs_hook=hook)

class Plan:
    def __init__(self, data):
        self.dups = []
        self.sp = load(data, 'slot_plan.json', self.dups); self.inst = load(data, 'installed.json')['fighters']
        prof = load(data, 'inventory_profile.json'); self.drive = load(data, 'drive.json'); cat = load(data, 'catalog.json')
        self.cov = cat['counts']['coverage']
        self.names = {c: v['fighter'] for c, v in self.cov.items()}
        self.excl_f = set(prof.get('excluded_base_fighters') or [])
        self.excl_s = {(e['fighter'], e['slot']) for e in prof.get('excluded_base_slots') or []}
        self.prof = {}
        for s in prof.get('slots') or []: self.prof.setdefault(s['fighter'], {})[s['slot']] = s['name']
        self.wifi = {}
        for e in cat.get('entries') or []: self.wifi.setdefault((e['roster_no'], e['mod_id']), e.get('wifi_state'))
        self.mods = {}   # código -> {mod_id: mod}; si el mod está repetido en carpetas, gana el que tiene más archivos
        for m in self.drive['mods']:
            if not es_skin(m) or not m['code'] or not m['mod_id']: continue
            cur = self.mods.setdefault(m['code'], {}).get(m['mod_id'])
            if cur is None or len(m['files']) > len(cur['files']): self.mods[m['code']][m['mod_id']] = m
        self.order = []   # [(posición, código)] con las posiciones de la lista de prioridad; «Otros» sin posición
        for i, p in enumerate(self.sp['priority'], 1):
            for c in (p if isinstance(p, list) else [p]): self.order.append((i, c))
        inpri = {c for _, c in self.order}
        extra = set(self.sp['fighters']) | set(self.mods)
        self.order += [(None, c) for c in self.cov if c in extra and c not in inpri]

    def wuboy(self, c):
        if c in self.excl_f: return set()
        return {s for s in (self.inst.get(c) or {}).get('slots', []) if (c, s) not in self.excl_s}

    def wuboy_name(self, c, s): return ((self.inst.get(c) or {}).get('info') or {}).get(str(s), {}).get('n')

    def hoy(self, c, s):
        p = self.prof.get(c, {}).get(s)
        if p: return f'perfil · {p}'
        if s in self.wuboy(c): n = self.wuboy_name(c, s); return 'WuBoy' + (f' «{n}»' if n else '')
        return 'original'

    def decision(self, c, s): return ((self.sp['fighters'].get(c) or {}).get('slots') or {}).get(str(s))

    def plan_cell(self, d):
        if d['state'] == 'vanilla': return 'original'
        if d['state'] == 'wuboy': return 'WuBoy' + (f" «{d['name']}»" if d.get('name') and d['name'] != 'WuBoy' else '')
        t = ('perfil · ' if d['source'] == 'profile' else '') + d['name'] + (f" (GB {d['mod_id']})" if d.get('mod_id') else '')
        if d.get('reslot_from') is not None: t += f" · reslot desde c{d['reslot_from']:02d}"
        return t + (f" · {d['nota']}" if d.get('nota') else '')

    def rows(self, c):
        out = []
        for s in range(8):
            d = self.decision(c, s); hoy = self.hoy(c, s)
            out.append({'slot': s, 'hoy': hoy, 'plan': self.plan_cell(d) if d else hoy, 'estado': ESTADO[bool(d.get('approved'))] if d else 'sin decidir', 'd': d})
        return out

    def unassigned(self, c):
        used = {d['mod_id'] for d in ((self.sp['fighters'].get(c) or {}).get('slots') or {}).values() if d.get('source') == 'drive' and d.get('mod_id')}
        return sorted((m for i, m in self.mods.get(c, {}).items() if i not in used), key=lambda m: (not del_usuario(m), m['mod_id']))   # primero los que mandó Gian

    def native(self, m):
        s = {x for f in m['files'] if f['listed'] for x in f['slots'] if x < 8}
        return sorted(s) if any(f['listed'] for f in m['files']) else None

    def c00(self, m):
        t = [f['touches_c00'] for f in m['files']]
        return 'sí' if any(x is True for x in t) else '?' if any(x is None for x in t) else 'no'

    def wifi_short(self, c, mod_id):
        w = self.wifi.get((c, mod_id))
        return next((v for k, v in WIFI.items() if w and w.startswith(k)), w or '—')

    def check(self):
        err, warn = [], []
        for k in self.dups: err.append(f'clave repetida en slot_plan.json: «{k}» (dos asignaciones al mismo slot o luchador)')
        pri = [c for _, c in self.order if _ is not None]
        for c in sorted({x for x in pri if pri.count(x) > 1}): err.append(f'{c}: repetido en priority')
        for _, c in self.order:
            if c not in self.cov: err.append(f'{c}: código que no existe en el catálogo')
        for c, fp in self.sp['fighters'].items():
            nm = f'{self.names.get(c, "?")} ({c})'
            if c not in self.cov: err.append(f'{c}: luchador que no existe en el catálogo')
            for k, d in (fp.get('slots') or {}).items():
                if k not in {str(i) for i in range(8)}: err.append(f'{nm}: slot «{k}» fuera de 0–7'); continue
                s = int(k); tag = f'{nm} c{s:02d} {d.get("name")}'
                if d['state'] == 'wuboy' and s not in self.wuboy(c): err.append(f'{tag}: no hay skin de WuBoy en ese slot (no existe o está excluida)')
                if d['state'] == 'vanilla' and s in self.wuboy(c): warn.append(f'{tag}: se queda original; hay que excluir la skin de WuBoy «{self.wuboy_name(c, s) or "sin nombre"}»')
                if d['source'] == 'profile' and s not in self.prof.get(c, {}): err.append(f'{tag}: source profile, pero no está en el perfil')
                if d['state'] == 'mod' and d['source'] != 'profile' and s in self.wuboy(c) and s not in self.prof.get(c, {}):
                    warn.append(f'{tag}: reemplaza la skin de WuBoy «{self.wuboy_name(c, s) or "sin nombre"}»')
                if d['source'] != 'drive': continue
                m = self.mods.get(c, {}).get(d.get('mod_id'))
                if not m: err.append(f'{tag}: el mod {d.get("mod_id")} no está en drive.json para este luchador'); continue
                f = next((f for x in self.drive['mods'] if x['mod_id'] == d['mod_id'] and x['code'] == c for f in x['files'] if d.get('file') == f'{x["folder"]}/{f["path"]}'), None)
                if d.get('file') and not f: err.append(f'{tag}: el archivo «{d["file"]}» no está en drive.json'); continue
                if not f: continue
                if not f['listed']: warn.append(f'{tag}: archivo sin listar ({f.get("unlisted_reason")}); no se pueden verificar sus slots'); continue
                rs = d.get('reslot_from')
                if rs is not None and rs not in f['slots']: err.append(f'{tag}: reslot_from c{rs:02d}, pero el archivo trae {self.slots_txt(f["slots"])}')
                if rs is None and f['slots'] and s not in f['slots']: err.append(f'{tag}: el archivo trae {self.slots_txt(f["slots"])}; falta reslot_from')
        for _, c in self.order:
            fs = (self.sp['fighters'].get(c) or {}).get('slots') or {}
            if any(d.get('approved') for d in fs.values()):
                for m in self.unassigned(c): warn.append(f'{self.names.get(c, c)} ({c}): mod {m["mod_id"]} {m["slug"]} del Drive sin asignar')
        return err, warn

    @staticmethod
    def slots_txt(sl): return ', '.join(f'c{x:02d}' for x in sl) or 'ningún slot'

    def origenes_txt(self):
        n = {}
        for m in self.drive['mods']: n[origen(m)] = n.get(origen(m), 0) + 1
        orden = [*ORIGEN.values(), '—']
        cuenta = ' · '.join(f'{k if k != "—" else "sin registro"} {n[k]}' for k in orden if k in n)
        return (f'Orígenes de los mods del Drive: {cuenta}. _usuario = lo mandó Gian por enlace; búsqueda = lo encontró el asistente en la investigación wifi-safe; '
                'auditoría/previo = ya estaba en el Drive (espejo de D:\\) sin registro de origen._')

    def render(self):
        stat = {}
        for _, c in self.order:
            r = self.rows(c); stat[c] = (sum(x['estado'] == 'aprobado' for x in r), sum(x['estado'] == 'propuesto' for x in r), sum(x['estado'] == 'sin decidir' for x in r))
        A, P, O = (sum(v[i] for v in stat.values()) for i in range(3))
        L = ['# Plan de slots', '', '_Generado por `tools/slot_plan.py` a partir de `data/slot_plan.json`, `installed.json`, `inventory_profile.json` y `drive.json`; no editar a mano. Nada de esto está instalado ni probado en consola._', '',
             f'**{len(self.order)} luchadores · {A} slots aprobados · {P} propuestos · {O} sin decidir (de {8 * len(self.order)})**', '',
             self.origenes_txt(), '',
             '«Hoy» es lo que hay en el perfil (WuBoy, componentes del perfil o la skin original); «Plan» es la decisión, si ya existe.', '',
             '| # | Luchador | Aprobados | Propuestos | Sin decidir | Drive sin asignar | Del usuario sin asignar |', '|---|---|---|---|---|---|---|']
        for pos, c in self.order:
            a, p, o = stat[c]; L.append(f'| {pos or "—"} | {self.names.get(c, c)} ({c}) | {a}/8 | {p} | {o} | {len(self.unassigned(c))} | {sum(map(del_usuario, self.unassigned(c)))} |')
        otros = False
        for pos, c in self.order:
            if pos is None and not otros: L += ['', '## Otros', '']; otros = True
            L += ['', f'{"###" if otros else "##"} {f"{pos}. " if pos else ""}{self.names.get(c, c)} ({c})', '']
            nota = (self.sp['fighters'].get(c) or {}).get('nota')
            if nota: L += [f'_{nota}_', '']
            L += ['| Slot | Hoy | Plan | Estado |', '|---|---|---|---|']
            for r in self.rows(c): L.append(f'| c{r["slot"]:02d} | {cell(r["hoy"])} | {cell(r["plan"])} | {r["estado"]} |')
            un = self.unassigned(c)
            if un:
                L += ['', 'Mods del Drive sin asignar:', '', '| Mod | Nombre | Origen | Slots nativos | Wifi | Toca c00 |', '|---|---|---|---|---|---|']
                for m in un:
                    n = self.native(m); L.append(f'| {m["mod_id"]} | {m["slug"]} | {origen(m)} | {self.slots_txt(n) if n else "sin listar"} | {self.wifi_short(c, m["mod_id"])} | {self.c00(m)} |')
        return '\n'.join(L) + '\n', (len(self.order), A, P, O)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Plan de slots por luchador (informe docs/SLOTS.md)')
    ap.add_argument('--data', default=os.path.join(R, 'data')); ap.add_argument('--out', default=os.path.join(R, 'docs', 'SLOTS.md'))
    ap.add_argument('--check', action='store_true', help='valida las decisiones: errores (exit 1) y avisos')
    a = ap.parse_args(); pl = Plan(a.data); md, (n, A, P, O) = pl.render()
    with open(a.out, 'w', encoding='utf-8') as f: f.write(md)
    print(f'ok · {a.out}: {n} luchadores, {A} slots aprobados, {P} propuestos, {O} sin decidir')
    if a.check:
        err, warn = pl.check()
        for w in warn: print('aviso:', w, file=sys.stderr)
        for e in err: print('error:', e, file=sys.stderr)
        print(f'check · {len(err)} errores, {len(warn)} avisos')
        sys.exit(1 if err else 0)
