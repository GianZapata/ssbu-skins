# Firebase: salas en vivo

Opcional. Sin Firebase la página funciona igual con enlaces (`#help` / `#sug`); con él, tus amigos entran a una **sala** y se ven los cambios al instante.

Proyecto: `ssbu-441b1`. La configuración web está en `data/firebase.json` y `tools/build_viewer.py` la incrusta en la página. Esa configuración es pública por diseño (identifica el proyecto, no da acceso): lo que protege los datos son las reglas de `firestore.rules`.

## Activarlo (una sola vez, en la consola de Firebase)

Mientras no se haga, la página lo detecta y avisa «Sin conexión en vivo: usa el enlace».

1. **Authentication** → *Comenzar* → pestaña *Sign-in method* → **Anónimo** → Habilitar.
2. **Firestore Database** → *Crear base de datos* → modo **producción** (la región da igual; elige una cercana).
3. **Firestore → Reglas** → pega el contenido de `firestore.rules` → *Publicar*.
   (Con la CLI: `firebase login` y luego `firebase deploy --only firestore:rules`.)
4. Recomendado: en Google Cloud Console → *APIs y servicios* → *Credenciales* → tu clave de API web → *Restricciones de aplicaciones* → *Sitios web* → `https://gianzapata.github.io/*`. Evita que otro sitio use tu clave.

## Cómo funciona

- El dueño crea la sala en **Información → Sala en vivo** y comparte `…/#room=<id>`.
- Cada visitante inicia sesión de forma anónima (sin cuenta ni datos personales) la primera vez que entra a una sala.
- Datos:
  - `rooms/{id}`: `ownerUid`, `ownerName`, `picks` (claves `roster:mod_id` de lo que eligió el dueño), `createdAt`, `updatedAt`.
  - `rooms/{id}/votes/{uid}`: `name`, `picks` (recomendaciones del amigo), `updatedAt`.
- El dueño escucha `votes`, así que sus recomendaciones aparecen en Mi selección en vivo, con las más votadas primero. Los amigos escuchan `rooms/{id}`, así que ven «ya la tiene» al instante.
- `selection.json` y la instalación **no** cambian: lo que se instala sigue siendo lo que tú envías al repositorio.

## Seguridad (reglas)

- El id son 12 caracteres al azar: quien lo conoce entra; nadie puede listar salas.
- Un amigo solo puede escribir **su** voto (su `uid`); solo el dueño puede leer todos los votos, cambiar la sala o borrarla.
- Nadie puede traspasar una sala, añadir campos, ni superar 40 caracteres de nombre o 400 elecciones.
- Cualquiera con el enlace ve lo que el dueño eligió. No pongas nada ahí que no quieras que vea esa persona.

Las salas no caducan solas: ciérrala desde Información cuando termines (borra la sala y los votos en vivo).

## Probar en local (emuladores)

```bash
npm i -g firebase-tools
firebase emulators:start --only auth,firestore --project demo-ssbu   # usa firestore.rules
python3 -m http.server 8765
# abre http://localhost:8765/index.html?fbemu  (el parámetro fbemu solo funciona en localhost)
```
