# Contrato de auditoría (`data/catalog.json`)

El bot auditor (Grok) **solo edita `data/catalog.json`**. No toca `index.html` ni la base de datos: la Action lo hace al hacer push.
Después de editar, ejecutar `python3 tools/validate_catalog.py`: si falla, no se hace commit.

## Qué completa el auditor en cada entrada de `entries[]`

Una entrada pasa de «Por auditar» a «Auditada» cuando `audit_status == "verified"`. Entonces debe rellenar:

| Campo | Valor permitido |
|---|---|
| `audit_status` | `"verified"` |
| `wifi_state` | Uno de `wifi_states` del catálogo: «Declaración explícita del autor sin condiciones conocidas», «Declaración condicionada del autor», «Afirmación de terceros sin confirmación del autor», «Sin evidencia localizada», «Incompatible según la fuente» |
| `wifi_quote`, `wifi_source`, `wifi_evidence_url` | Cita literal, dónde está y enlace. Obligatorios salvo en «Sin evidencia localizada» |
| `conditions` | Lista de condiciones (puede ser `[]`) |
| `proposed_destination` | Entero 0–7 (slot `cNN`) o `null` si no hay destino |
| `primary_slot_status` | Estado de la asignación (p. ej. «slot nativo libre») |
| `dependencies`, `conflicts` | Listas (pueden ser `[]`) |
| `file_inspection`, `compatibility_13_0_5`, `console_test` | Texto; si no se hizo, dejar el valor «no inspeccionado / no verificada / pendiente» |
| `notes` | Instrucciones que el instalador necesita (archivo concreto del zip, slot, plugins) |

Reglas: el estado Wi-Fi es evidencia registrada, **no** prueba en consola. No inventar citas; si no hay evidencia, usar «Sin evidencia localizada». No borrar entradas: las retiradas van a `withdrawn[]`.

## Quién usa qué

```
Grok (audita)  ──▶  data/catalog.json  ──▶  Action: validate_catalog + npm run build + db.py seed --only catalog  ──▶  dist/  +  Firestore (catalog/*)
                                                                                         │ (cualquiera propone en el móvil: changes/*)
Agente instalador (Switch)  ◀──  tools/db.py plan  ◀──  Firestore (changes/*, history/*)  ◀┘
```

Grok **solo edita `data/catalog.json`** y hace push: la Action valida, regenera la página y copia el catálogo a Firestore (si existe el secreto `FIREBASE_SERVICE_ACCOUNT`).

## Campos que el generador conserva

Además de los campos clásicos: `role` (`propuesta principal` | `alternativa`), `look_id` (identificador estable de la apariencia, se usa como `vid`), `alt_index`, `variant`, `audit_scope`, `downloads_scope`, `images_scope`, `downloads`, `rank_in_category_most_downloaded`, `shared_download_counter`, `dependency_kind`, `wifi_state_code`, `design_kind` y `native_slots` (lista). Los textos de alcance se guardan una sola vez en `meta.scopes`. Las alternativas llevan `proposed_destination: null`: el destino lo elige quien usa la web.

## Identificadores persistentes y variantes (coordinación con Grok)

- La identidad de una apariencia es su **`look_id`** (`<roster_no>:<mod_id>`, o `<roster_no>:<mod_id>:<variante>` con un sufijo `[a-z0-9-]` para una variante concreta de un mismo mod). Es el id con el que se guardan las propuestas del plan, así que **nunca puede cambiar ni desaparecer**: no depende del orden de las entradas ni del nombre (`look_name`).
- `tools/validate_catalog.py` lo exige: formato válido, coherente con `roster_no`/`mod_id`, único, y presente en `data/ids.lock.json` (la lista de ids ya publicados). Si una apariencia se descarta, va a `withdrawn[]` con el **mismo** id; un id publicado que falta es un error. Los ids nuevos se aceptan y se registran con `python3 tools/validate_catalog.py --update-lock` (lo hace quien integra el catálogo).
- **Variantes:** para listar varias variantes de un mismo mod basta con una entrada por variante con su propio `look_id` con sufijo (p. ej. `02:595992:rare-dk`). El campo `variant_id` propuesto en la PR #3 se acepta como alternativa a `look_id` (`look_id` manda si están los dos), así que no hace falta cambiar el validador ni la web cuando llegue. Lo que sí hay que acordar es que **ambos** sean inmutables.
- La web y Firestore conservan por apariencia: `role`, `look_id`, `variant`, `audit_scope`, `downloads_scope`, `images_scope` (más descargas, dependencias, slots nativos…). `tests/unit/test_catalog.py` lo comprueba para las 1225 entradas.
- La PR #3 (lote 1 de calidad, 1224 apariencias) está apilada sobre la #2 y todavía no está integrada aquí: cuando se fusione, `look_id` de las entradas retiradas deben conservarse en `withdrawn[]`.
