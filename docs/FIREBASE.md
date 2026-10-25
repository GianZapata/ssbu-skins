# Firebase: la base de datos de la página

Proyecto: `ssbu-441b1`. Todo lo que muestra la página sale de Firestore (con la copia incrustada en `index.html` como respaldo si la base no responde):

| Colección | Qué guarda | Quién escribe | Quién lee |
|---|---|---|---|
| `catalog/{luchador}` + `meta/catalog` | El catálogo de skins | `tools/db.py seed` (cuenta de servicio) | todos |
| `installed/{luchador}` + `meta/installed` | Slots ocupados, retratos y nombres | `tools/db.py seed` | todos |
| `selection/main` | Lo que eligió el dueño (slots, orden, reemplazos, 8/7) | el dueño, desde la página | todos |
| `suggestions/{uid}` | Recomendaciones de cada visitante | el propio visitante | el dueño |
| `status/{clave}` | Resultado de cada instalación | el instalador (`tools/db.py status`) | todos |
| `config/owner` | Quién es el dueño | el primero que entra con Google | todos |

La configuración web de `data/firebase.json` es pública por diseño (identifica el proyecto, no da acceso): lo que protege los datos son las reglas de `firestore.rules`.

## Activarlo (una sola vez, en la consola de Firebase)

Mientras no se haga, la página lo detecta, usa la copia incrustada y guarda la selección en el dispositivo. La barra dice «● Sin conexión».

1. **Authentication** → *Comenzar* → *Sign-in method* → habilita **Google** y **Anónimo**. En *Settings → Authorized domains* añade `gianzapata.github.io`.
2. **Firestore Database** → *Crear base de datos* → modo **producción** (la región da igual).
3. **Firestore → Reglas** → pega el contenido de `firestore.rules` → *Publicar* (o `firebase deploy --only firestore:rules`).
4. **Reclama la propiedad: abre la página y toca 🔒 «Entrar» con tu cuenta de Google antes que nadie.** La primera cuenta de Google que entra queda como dueña y las reglas no dejan cambiarlo. Si otra persona lo hiciera antes, borra el documento `config/owner` en la consola y vuelve a entrar tú.
5. **Cuenta de servicio** (para la Action y el instalador): *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada*.
   - Guarda el JSON completo como secreto del repositorio `FIREBASE_SERVICE_ACCOUNT` (GitHub → Settings → Secrets → Actions). Desde el siguiente push, la Action copia el catálogo a Firestore.
   - Para sembrar ahora mismo: `GOOGLE_APPLICATION_CREDENTIALS=clave.json python3 tools/db.py seed`. **No subas la clave al repositorio.**
6. Recomendado: en Google Cloud Console → *Credenciales* → tu clave de API web → restringe a *Sitios web* `https://gianzapata.github.io/*`.

## Cómo funciona

- **Visitante** (cualquiera que abre la página): ve el catálogo, la selección del dueño en vivo («ya la tiene») y puede recomendar; la primera vez pide su nombre. No necesita cuenta (sesión anónima solo al recomendar).
- **Dueño** (entró con Google): su selección se guarda sola en `selection/main` y se sincroniza entre sus dispositivos (gana el cambio más reciente). Ve las recomendaciones de los visitantes en vivo y el estado «Instalada» que anota el instalador.
- **Catálogo**: Grok edita `data/catalog.json` → la Action regenera la página y lo copia a Firestore → la página lo actualiza en vivo, sin recargar.
- **Sin base de datos** (no activada, sin red): la página funciona con la copia incrustada y guarda en el dispositivo; al volver la conexión se sincroniza.
- `"embed": false` en `data/firebase.json` genera una página sin el catálogo incrustado (unos 50 KB): lee todo de Firestore. Úsalo cuando la base ya esté sembrada y quieras una página más ligera.

## Seguridad (reglas)

- Lo escrito por el backend (`catalog`, `installed`, `meta`, `status`) es de solo lectura desde la página.
- `config/owner` solo se puede crear una vez y con una cuenta de Google (no anónima); nunca se modifica.
- `selection/main` solo la escribe el dueño; un visitante solo escribe su `suggestions/{su uid}` (nombre ≤ 40 caracteres, ≤ 400 elecciones, sin campos extra).
- La selección del dueño es pública: cualquiera con la dirección de la página la ve.

## Probar en local (emuladores)

```bash
npm i -g firebase-tools
firebase emulators:start --only auth,firestore --project demo-ssbu   # usa firestore.rules
pip install google-cloud-firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=ssbu-441b1 python3 tools/db.py seed
python3 -m http.server 8765        # abre http://localhost:8765/index.html?fbemu  (fbemu solo funciona en localhost)
```
