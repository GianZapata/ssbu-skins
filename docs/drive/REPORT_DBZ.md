# Triage de mods Dragon Ball (SSBU): estado Wi-Fi y descargas

Fecha: 25 oct 2026, 22:40 (hora de Ciudad de México). Fuente: API pública de GameBanana (`apiv11/Mod/<id>/ProfilePage`, `/Posts` con sus respuestas y `/Updates`), consultada hoy. El resumen de ChatGPT **no** se usó como evidencia.

Reglas:
- Solo se descargó lo clasificado como **«Declaración explícita del autor sin condiciones conocidas»** que no fuera moveset.
- Los archivos están tal cual vienen: no se extrajeron ni se modificaron. Solo se listó su contenido con `7z l`, que es de solo lectura.
- No se instaló nada ni se tocó la consola, la microSD o los repositorios.
- Estado común a todos los mods: **prueba en consola pendiente**. Compatibilidad con 13.0.5 / ARCropolis 4.1.1 **no verificada**. Contenido **listado pero no inspeccionado a fondo**.

## Tabla de mods

| ID | Luchador real | Look | Slots | Autor (subidor) | Descargas | Estado Wi-Fi | Cita exacta y fuente | ¿Descargado? | Conflictos y notas |
|---|---|---|---|---|---|---|---|---|---|
| [487736](https://gamebanana.com/mods/487736) | Ryu | Goku SSJ / SSB / SSG (3 looks) | c05 SSJ, c06 SSB, c07 SSG | mokkori | 2230 | Declaración explícita del autor sin condiciones conocidas | Respuesta del autor en comentarios (1 ene 2024): «All my mods are WiFi-Safe as they are just reskins and don't change the gameplay». La descripción no menciona wifi. | Sí | Trae voz JP, UI y `ui_chara_db.prcxml`. **Global:** `stream;/sound/bgm/bgm_z81_f_ryu.nus3audio` es el tema de victoria de Ryu y afecta a todos sus slots. Requiere ARCropolis por los archivos añadidos. |
| [421286](https://gamebanana.com/mods/421286) | Wolf | Vegeta | c01 | YujiR0ckSt4r (modelo: BoiledSwift) | 5845 | Declaración explícita del autor sin condiciones conocidas | Descripción: «WIFI SAFE!» | Sí | Trae UI y SFX/voz (`sound/`). |
| [434439](https://gamebanana.com/mods/434439) | Terry | Gohan (Fortnite), con capa y sin capa | c07 (las dos variantes) | MulliganMayhem | 1217 | Declaración explícita del autor sin condiciones conocidas | Descripción: «is wifi-safe, and goes over c07 by default» | Sí (2 archivos) | Las dos variantes van en c07 y chocan entre sí: elige una. Incluye `fighter/dolly/motion/body/c07/swing.prc` (física de huesos, visual) ⚠️. El autor reporta clipping de la capa. |
| [324864](https://gamebanana.com/mods/324864) | Ganondorf | Broly (DBS) | c06 | Ghost1683759 | 5760 | Sin evidencia localizada | La descripción no dice nada de wifi. Un comentario de usuario dice «is wifi safe» sin signo, así que es ambiguo y sin respuesta del autor. | No | Requiere ARCropolis. Trae UI. |
| [437327](https://gamebanana.com/mods/437327) | Terry | Gogeta: DBZ base/SS, DBS base/SS/Blue, Xeno base/SS/SS Blue (8 looks) | c00–c07 | Tofu Yi | 4364 | Declaración explícita del autor sin condiciones conocidas | Descripción: «WI-FI SAFE» | Sí | Reemplaza los 8 slots de Terry, con voz EN, `config.json` y emisivos. Requiere ARCropolis. Física de cinturón y chaleco. |
| [460246](https://gamebanana.com/mods/460246) | Captain Falcon | Vegito V2 (24 looks en 3 packs de 8) | c00–c07 por pack | El_Tar0 | 5763 | Declaración condicionada del autor | Descripción: «Wi-Fi safe? Haven't tested but it should be.» El autor lo repite en comentarios (6 ago 2023): «I haven't tested it yet, but I think it should be wi-fi safe.» | No | **Muchos archivos globales:** anunciador, Blue Falcon cambiado por la nave Saiyan, ruta de modo clásico, créditos, tema de victoria, reemplazo de la canción «Firefield», efectos azules y sombrero de Kirby. Un usuario reporta crasheos. Son unos 320 MB en total. |
| [498005](https://gamebanana.com/mods/498005) | Ken | Goku J-Stars: base, SSJ, SSJ3, SSG, base azul, SSB, UI Omen, MUI (8 looks) | c00–c07 | Tofu Yi | 12592 | Declaración explícita del autor sin condiciones conocidas | Descripción: «Goku (J-Stars Victory Vs) over Ken WIFI-SAFE» | Sí (solo el principal) | No bajé los efectos (archivo aparte de 14.7 MB): son opcionales, requieren el plugin One-Slot y varios usuarios reportan crasheos o un modelo blanco al combinarlos. Trae `motion/body/c02/swing.prc` ⚠️, `config.json`, SFX y UI. Requiere ARCropolis. |
| [463039](https://gamebanana.com/mods/463039) | Kazuya | Goku Ultra Instinto | c06 | YujiR0ckSt4r (modelo: BoiledSwift) | 3628 | Declaración explícita del autor sin condiciones conocidas | Descripción: «INCLUDES: - UI - SFX - WIFI SAFE» | Sí | Trae `config.json`, UI y SFX. |
| [549329](https://gamebanana.com/mods/549329) | Ness | Goku Daima | Sin dato en la página | Vexzar | 1914 | Sin evidencia localizada | No hay mención de wifi ni en la descripción ni en los 4 comentarios. | No | Trae voz JP y UI. |
| [609500](https://gamebanana.com/mods/609500) | Terry | Vegeta SSJ y SSB (2 looks) | c02, c03 | kurisutian | 514 | Declaración explícita del autor sin condiciones conocidas | Etiqueta «Wifi Safe» de GameBanana, puesta por el subidor. El texto no lo menciona. | Sí | Única evidencia: la etiqueta. Trae **efectos** slotteados (`ef_dolly_c02/c03.eff`; probablemente requieren One-Slot Effects), voz, UI y `ui_chara_db.prcxml`. Tiene pocas descargas. |
| [382580](https://gamebanana.com/mods/382580) | Donkey Kong | Vegeta Ozaru | c02 | mastaklo | 6437 | Declaración condicionada del autor | Descripción: «Uses exo skeleton so should be wifi safe.» | No | Para moverlo de slot hay que editar `config.json`. |
| [175735](https://gamebanana.com/mods/175735) | Héroe | Trunks: Androides/Cell (c02) y Futuro (c06) (2 looks) | c02, c06 | Ilagu | 18479 | Declaración explícita del autor sin condiciones conocidas | Descripción: «This is wifisafe.» | Sí | Requiere ARCropolis. Trae UI. |
| [437812](https://gamebanana.com/mods/437812) | Kazuya | Gohan adolescente | c01, y cualquier slot impar | Miguel92398 | 1396 | Declaración condicionada del autor | Descripción: «would be not wifi-safe if moved to any even number slots (c00, c02, c04, c06)». En comentarios (23 abr 2023): «It won't be wifi-safe and also you need config.json in order to move it to even number.» | No | Solo es seguro en slots impares. Usa exoesqueleto. |
| [450327](https://gamebanana.com/mods/450327) | Fox | Gohan (Kakarot) | c03 | gamersmashbrosymode | 5879 | Declaración explícita del autor sin condiciones conocidas | Descripción: «uses magic exoskeleton by SSBUCARLOS so it's wifi safe» | Sí (solo el modelo actualizado) | Los otros 3 archivos son versiones viejas o actualizaciones previas y no los bajé. Trae voz/SFX (`nus3bank` editado) y UI. |
| [446815](https://gamebanana.com/mods/446815) | Terry | Gogeta SSJ4 (8 recolores) | c00–c07 (también hay un archivo de solo c07) | Tofu Yi | 3520 | Declaración explícita del autor sin condiciones conocidas | Descripción: «WI-FI SAFE.» | Sí (el reemplazo completo de c00–c07) | El autor avisa: «LAG/FPS LOSS IF MORE THAN 4-5 GOGETA SS4 SKINS ARE IN BATTLE». Requiere ARCropolis. El archivo de solo c07 (8.9 MB) no lo bajé porque repite un look del completo. |
| [333706](https://gamebanana.com/mods/333706) | Terry | Goku Black SSR | c06 | Eeivee | 5155 | Declaración explícita del autor sin condiciones conocidas | Respuesta del autor en comentarios (20 feb 2022) a «wifi safe?»: «Yes» | Sí (solo el zip original) | La variante cel-shaded se publicó en abril de 2025, **después** de esa respuesta, así que no la bajé: su estado queda pendiente. El 7z original repite el zip. Trae expresiones, UI y voz. |
| [541138](https://gamebanana.com/mods/541138) | Captain Falcon | Goku Black | c01, c02 | mokkori | 1740 | Declaración condicionada del autor | La página no habla de wifi. Hay una declaración general del autor en otras páginas: «All my mods are WiFi-Safe as they are just reskins and don't change the gameplay». | No | **Trae una animación Win1 personalizada**, así que no es solo un reskin y no cumple la condición del autor. Un usuario reporta «Crashes game». Otro preguntó por wifi (jun 2026) y nadie respondió. |
| [666794](https://gamebanana.com/mods/666794) | Kazuya | Piccolo | — | — | — | Sin evidencia localizada | **El mod está en la papelera de GameBanana** por la regla R.10 de copyright («No permission»). | No (no está disponible) | El enlace de ChatGPT apunta a un mod eliminado. |
| [522236](https://gamebanana.com/mods/522236) | Bowser Jr. | Freezer primera forma | c04 (slot de Iggy) | Human#3684958 | 3589 | Declaración condicionada del autor | Descripción: «Should be Wifi-Safe», con la etiqueta Wifi Safe. | No | Cambia el martillo, el Clown Car y al personaje del Final Smash (Shadow Mario). La versión anterior traía un «Trollface Up B». |
| [303197](https://gamebanana.com/mods/303197) | Kazuya | Cell perfecto | c03 | **Ilagu** | 15342 | Declaración explícita del autor sin condiciones conocidas | Descripción: «This is wifisafe.» | Sí | **No encontré reportes de desync** en sus 11 comentarios; algunos están borrados y no se pueden leer. Requiere ARCropolis. Trae UI. |
| [560241](https://gamebanana.com/mods/560241) | Ness | Kid Buu | c03 | mokkori | 2120 | Declaración explícita del autor sin condiciones conocidas | Descripción: «ALL MY MODS ARE WiFi-SAFE», con la etiqueta Wifi Safe. | Sí | **Global:** `stream;/sound/bgm/bgm_z11_f_ness.nus3audio` es el tema de victoria de Ness y afecta a todos sus slots. Trae `ui_chara_db.prcxml`, voz y expresiones. |
| [524337](https://gamebanana.com/mods/524337) | Terry | Buuhan (Buu con Gohan absorbido) | c01 | Human#3684958 | 773 | Declaración condicionada del autor | Descripción: «Should be Wifi-Safe», con la etiqueta Wifi Safe. | No | Trae voz y UI. |
| [421311](https://gamebanana.com/mods/421311) | Terry | Androide 18 (DBS) | c04 | mokkori | 972 | Declaración condicionada del autor | La página no habla de wifi. Solo existe la declaración general de mokkori en otras páginas, condicionada a que sea un reskin. | No | Parece un reskin puro (modelo, voz, UI): **es fácil de promover si aceptas la declaración general del autor**. |
| [175731](https://gamebanana.com/mods/175731) | Héroe | Androide 17 (**recolor**) | c04 | DusterBuster | 2417 | Sin evidencia localizada | Ni la descripción ni los 2 comentarios hablan de wifi. | No | Es un recolor (etiqueta «Texture: Recolor»), no un modelo nuevo. |
| [453683](https://gamebanana.com/mods/453683) | Mewtwo | Beerus (Fortnite) | c00 | wombokombo38 | 5159 | Sin evidencia localizada | No se menciona el wifi. | No | Trae UI, pero no voz; un tercero publicó una voz aparte. |
| [320899](https://gamebanana.com/mods/320899) | Ganondorf | Jiren | **c07** | Ghost1683759 | 3906 | Sin evidencia localizada | La descripción no habla de wifi. Un usuario preguntó «Is this mod wifi safe?» y nadie respondió. | No | Requiere ARCropolis. Trae UI. |

### Movesets excluidos (no se descargaron)

| ID | Mod | Autor | Descargas | Por qué se excluye |
|---|---|---|---|---|
| [493356](https://gamebanana.com/mods/493356) | Gogeta Moveset (Terry c103–c110) | Tofu Yi, mRama | 45489 | Moveset completo con movimientos, transformaciones, multiplicadores de daño y Final Smash propios. |
| [469216](https://gamebanana.com/mods/469216) | Vegeta Moveset – Slotted | mRama et al. | 25895 | Moveset personalizado que requiere smashline. |
| [545222](https://gamebanana.com/mods/545222) | Goku Black (Scythe) V2 | El_Tar0 | 6085 | Echo fighter o moveset parcial (veneno, parálisis, Kamehameha nuevo). Para la versión de un solo slot, el autor dice «should be Wi-Fi safe, however, I'm not able to test it», y aun así cambia efectos y clones. |

## Archivos descargados

Ubicación: `/workspace/ssbu_dbz/<luchador>/<id>_<slug>/`. Todos coinciden en tamaño (`_nFilesize`) y en MD5 (`_sMd5Checksum`).

| Archivo | Bytes | MD5 |
|---|---|---|
| ryu/487736_goku_transformation_pack/son_goku_ss1-ssg-ssb_ryu_c05-06-07_.rar | 29797295 | e5d1238c… ✅ |
| wolf/421286_vegeta/wolf_vegeta_c01_.rar | 26962801 | 6202fead… ✅ |
| terry/434439_gohan/74_terry_-_gohan_terry.rar | 10007628 | 1259977c… ✅ |
| terry/434439_gohan/74_terry_-_gohan_terry_cape.rar | 10327551 | 5b86fee9… ✅ |
| terry/437327_gogeta/gogeta_over_terry_c00-c07__ac24e.rar | 52779411 | bc09c861… ✅ |
| ken/498005_goku/goku_over_ken_c00-c07_.rar | 53510757 | f6f50302… ✅ |
| kazuya/463039_goku_ultra_instinct/goku_kazuya_c06_.rar | 4146849 | 45114c61… ✅ |
| terry/609500_vegeta_ssj_ssb/skin_terry_c02-c03_vegeta.rar | 21817339 | 6f4cbb6d… ✅ |
| hero/175735_trunks/trunks_brave.zip | 8810959 | 1c4540df… ✅ |
| fox/450327_gohan/fox03_-_gohan_updated_model.zip | 6763849 | 1d07d369… ✅ |
| terry/446815_gogeta_ss4/gogeta_ssj4_-_terry_c00-c07_v13.rar | 53947600 | 14ed315f… ✅ |
| terry/333706_goku_black_ssr/goku_black.zip | 7129973 | 63775759… ✅ |
| kazuya/303197_perfect_cell/cell_kazuya_c03_.zip | 6646592 | 03fbe7dd… ✅ |
| ness/560241_kid_buu/kid_buu_ness_c03_.zip | 2632071 | 4fc3842b… ✅ |

**Total: 14 archivos, 295,280,675 bytes (unos 281.6 MiB).** El detalle completo está en `downloads.json`.

## Choques de slot entre lo descargado

Los slots salen del listado de cada archivo.

- **Terry: choque fuerte.**
  - Gogeta 437327 ocupa c00–c07.
  - Gogeta SSJ4 446815 también ocupa c00–c07.
  - Vegeta SSJ/SSB 609500 va en c02–c03.
  - Goku Black 333706 va en c06.
  - Gohan 434439 va en c07, con dos variantes que chocan entre sí.

  No caben todos. Opciones:
  - Elegir un solo pack de Gogeta.
  - Usar el archivo de solo c07 del SSJ4.
  - Moverlos con un reslotter. Ojo: lo de wifi-safe que declara cada autor aplica a su slot por defecto. En Gohan sobre Terry el autor dice «Can be put over any slot».
- **Ken:** Goku 498005 ocupa c00–c07 y no hay otro mod de Ken descargado.
- **Kazuya:** Goku UI va en c06 y Cell perfecto en c03. No chocan.
- **Ness:** solo Kid Buu en c03. Daima Goku no se bajó y su slot no está documentado.
- **Ryu (c05–c07), Wolf (c01), Héroe (c02, c06) y Fox (c03):** sin choques.

## Archivos globales o compartidos que pueden chocar

- `bgm_z81_f_ryu.nus3audio` (487736) reemplaza el tema de victoria de Ryu en **todos** sus slots.
- `bgm_z11_f_ness.nus3audio` (560241) reemplaza el tema de victoria de Ness en **todos** sus slots.
- `ui/param/database/ui_chara_db.prcxml` viene en 487736, 609500 y 560241. Son parches de nombres o UI, y ARCropolis los combina, pero hay que revisarlo.
- `swing.prc`, la física de huesos (pelo, capa), viene en 434439 (c07) y en 498005 (c02). Es un parámetro visual, pero **es un `.prc` dentro de `motion/`**. Lo marco por si aplicas el criterio estricto de «no editar parámetros».
- Efectos slotteados en 609500 (`ef_dolly_c02/c03.eff`), que probablemente requieren el plugin One-Slot Effects.

## Lo que el resumen de ChatGPT dijo mal

- **Cell perfecto:** dijo que el creador era «Ballin», que lo consideraba «posiblemente seguro» y que había reportes de desync. **Las tres cosas son falsas.** El autor es Ilagu, dice sin condiciones «This is wifisafe.», y no encontré ningún reporte de desync en los comentarios que se pueden leer.
- **Piccolo (666794):** el enlace lleva a un mod **eliminado** por copyright.
- **Su «selección para jugar online»** incluye tres mods sin declaración wifi-safe incondicional:
  - Broly: sin evidencia.
  - Beerus: sin evidencia.
  - Ozaru Vegeta: solo dice «should be».
- **Gohan adolescente:** no menciona que solo es seguro en slots impares.
- **Vegito:** «sin pruebas online confirmadas» es correcto, pero no menciona que el autor dice «should be» ni la cantidad de archivos globales que cambia.
- **Freezer:** no menciona que cambia el personaje del Final Smash, el martillo y el Clown Car, ni que el autor solo dice «Should be».
- **Slots que faltaban o eran incompletos:**
  - Jiren va en c07.
  - Trunks va en c02 y c06.
  - Vegeta SSJ/SSB va en c02 y c03.
  - Goku sobre Ken ocupa c00–c07 (8 looks).
  - Goku Black sobre Captain Falcon va en c01 y c02.
- **Vegeta sobre Wolf, Gohan sobre Terry y Gogeta:** esto sí lo dijo bien, porque los autores los declaran wifi-safe.

## Sugerencias de las colecciones 219012 y 219732

Mods no descargados con declaración explícita del autor y más de 1000 descargas:

| ID | Mod | Luchador | Autor | Descargas | Cita |
|---|---|---|---|---|---|
| [175799](https://gamebanana.com/mods/175799) | Vegeta | Terry c07 | Ilagu | 12480 | «This is wifisafe.» |
| [421077](https://gamebanana.com/mods/421077) | Goku over Lucario | Lucario | YujiR0ckSt4r | 6634 | «He is wifi safe!» (no trae UI ni SFX) |
| [502537](https://gamebanana.com/mods/502537) | Goku (Mid) SSJ v2 | Terry | BeyondSmash | 6126 | Etiqueta Wi-Fi Safe del autor, más «Wi-Fi Safe Confirmed! by Moonside», que es la confirmación de un tercero. |
| [401063](https://gamebanana.com/mods/401063) | Goku Over Ryu WIFI Safe | Ryu | BGoku115 | 4086 | El título dice «WIFI Safe», y el texto: «None Of Them Were WIFI Safe So I Commissioned This». |
| [463041](https://gamebanana.com/mods/463041) | Super Saiyan Son Goku | Ken | YujiR0ckSt4r | 3320 | «WIFI SAFE» |
| [474790](https://gamebanana.com/mods/474790) | Great Ape Baby Vegeta | Bowser | mastaklo | 2410 | Solo la etiqueta «Wifi-Safe»; el texto no lo menciona. |

Para tener en cuenta:
- [175300](https://gamebanana.com/mods/175300) Goku (Ryu) de mastaklo, con 27,388 descargas, tiene la etiqueta **Wifi-Safe: No**, es decir, «Incompatible según la fuente».
- [525183](https://gamebanana.com/mods/525183) Drip Goku solo dice «Should be», así que es una declaración condicionada.
