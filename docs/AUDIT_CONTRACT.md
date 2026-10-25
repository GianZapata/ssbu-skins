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
Grok (audita)  ──▶  data/catalog.json  ──▶  Action: build_viewer.py + db.py seed  ──▶  index.html  +  Firestore (catalog/*)
                                                                                         │ (el dueño elige en el móvil)
Agente instalador (Switch)  ◀──  tools/db.py selection  ◀──  Firestore (selection/main)  ◀┘
```

Grok **solo edita `data/catalog.json`** y hace push: la Action valida, regenera la página y copia el catálogo a Firestore (si existe el secreto `FIREBASE_SERVICE_ACCOUNT`).
