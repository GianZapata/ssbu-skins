# Regla: c00 100% vanilla — DESCARTADA

**Estado (2026-10-28, más tarde): descartada por Gian.** Que c00 sea vanilla no garantiza jugar online sin desync. El riesgo viene de mods que cambian gameplay (params, hitboxes, animaciones, esqueleto) y de archivos globales, en cualquier slot. Para online, la vía es un perfil aparte con solo mods wifi-safe y sin archivos globales, o los mods desactivados. Terra (Ike c00) y Aqua (Pyra/Mythra c00) se quedan donde están. Este documento y `C00_EXCLUIR_WUBOY.txt` quedan como referencia: sirven para saber qué toca c00, pero no se aplican.

Propuesta original: decidida por Gian el 2026-10-28. En Smash, `c00` es el traje 1 (el default al elegir luchador). `c01`–`c07` son los colores 2–8.

**En c00 no entra nada:** ni modelo, ni texturas, ni retratos (`chara_*_<luchador>_00`), ni voz (`vc_*_c00`), ni SFX (`se_*_c00`), ni efectos (`ef_*_c00`), ni animaciones o cámara de victoria (`motion/.../c00`, `camera/fighter/.../c00`), ni video del Final Smash (`movie/fighter/.../c00`), ni accesorios del luchador en `c00`.
**Fuera de la regla:** `item/` y `enemy/` (son objetos y enemigos, no trajes) y lo global sin slot (música, temas de victoria `bgm_*`, menús).

Fuentes: listado de los `.zip` del Drive (`unzip -Z1`), reportes `PENDIENTES_SLOTS.md updated` y `REPORT_DBZ.md` para `.rar`/`.7z` (no se pudieron abrir en esta Mac), árbol de `Gian-Ultimate-Modpack-private@main` y `data/inventory_profile.json` / `inventory_staged.json` de `ssbu-skins`.
Nada se instaló, se borró ni se movió.

## 1. Pack de WuBoy: 336 archivos de c00 a excluir

Lista exacta, con ruta de la SD: `C00_EXCLUIR_WUBOY.txt` (en esta misma carpeta).

| Qué cambia en c00 | Luchadores |
|---|---|
| Skin (modelo/texturas y retratos) | Luigi, Captain Falcon, Sheik, Lucina («Yu»), Snake, Squirtle, Sonic, Greninja, Ken, Cloud, Piranha Plant, Joker y Arsène, Byleth, Rex, Entrenador Pokémon |
| Solo retrato | Mega Man (`chara_5`) |
| Voz | Mario, Dr. Mario, Bowser, Pikachu, Ike, Shulk, Chrom, Bayonetta, Hero, Sephiroth, Captain Falcon, Cloud, Byleth, Entrenador Pokémon, Lucina |
| SFX | Peach, Daisy, Villager, Pac-Man, Hero, Kazuya, Sephiroth, Steve, Luigi, Lucina |
| Animación y cámara de victoria | Mario, Kazuya, Steve |
| Video del Final Smash | Hero, Sephiroth, Steve |
| Accesorio | Villager (bola de boliche), Pac-Man (punto artístico y fantasma), Robin (libro), Isabelle (señal), Min Min (brazo), Steve (valla, de Optionals), Mii Brawler (bola de hierro), Kirby (gorra de Terry) |

Notas:
- La voz de Mario, los SFX de Luigi y la voz y los SFX de Lucina vienen de la carpeta `Disable if running The WuBor Patch`.
- Los accesorios existen de c00 a c07: al quitar solo c00, ese traje queda vanilla y los otros conservan el cambio de WuBoy.
- En el Mii Brawler y en la gorra de Terry de Kirby, el archivo solo existe en c00. Quitarlo deja vanilla el accesorio entero.

## 2. Mods del Drive que traen c00

| Luchador | Mod | Archivo trae | Instalar así |
|---|---|---|---|
| Mario | 374147 Moogle | c00, c01, c02 | Solo c02 (c01 = Kellytoy; c02 es WuBoy y ya querías reemplazarlo) |
| Sheik | 367390 Larxene | c00, c01 | Solo c01 |
| Falco | 174558 N64 | c00–c02 + `vc_falco_c00`, `se_falco_c00` | c01 y c02; sin la voz ni los SFX de c00 (sin c00, el sonido N64 no entra) |
| Ken | 498005 Goku J-Stars | c00–c07 | c01–c07 (se pierde 1 de los 8 looks) |
| Chrom | 175495 Squall | c00–c07 (zip en 2 partes) | c01–c07, o solo los slots que elijas |
| Bayonetta | 501311 Morrigan | c00–c07 en los packs completos | Archivo de un solo slot: c02 (par) o c03 (impar; c03 = Harley) |
| Terry | 437327 Gogeta | c00–c07 | Ya resuelto: `modificado/` deja solo c01 |
| Terry | 446815 Gogeta SSJ4 | c00–c07 | Ya resuelto: archivo de solo c07 |
| Steve | 323894 Steviroth | c00 | Mover a c02 o c06 (slots pares, de Steve; los impares son de Alex) |
| Ganondorf | 406732 Pikadorf | c00 | Mover a c01, c02, c05 o c07 (WuBoy o slots libres que ya querías reemplazar) |
| ZSS | 724190 Bulma | c00 + `ef_szerosuit_c00.eff`, nave, paralizador, voz, narrador | Mover a c06 (libre); hay que renombrar el efecto (One Slot Effects), los retratos y `config.json` |

Sin c00 (no hay que hacer nada): Rayman, Kurama, Timeless River, Pirate Funky, Goblin Slayer, Jean Grey, ExDeath, Jinx, Spider-Gwen, Freddie, Garnet, Sigurd, Raiden, Chicken (c07, no c03 como dice el catálogo), Creeper (c05), Kid Buu, Trunks, Cell, Goku UI, Goku Ryu, Vegeta Wolf, Gohan Fox, Gohan Terry, Goku Black, Vegeta Terry.

## 3. Perfil `gian-prs` y PRs que hoy ocupan c00

| Luchador | Skin en c00 | Destino posible | Nota |
|---|---|---|---|
| Luigi | Swole Luigi (PR #10) | Ninguno libre: WuBoy ocupa c01–c07 (c07 = Mr. L) y Rayman usa c06–c07 | Hay que elegir qué traje de WuBoy se va |
| Ganondorf | Otis (PR #12) | c01, c02, c05 o c07 | Compite con Pikadorf y ExDeath por esos 4 slots |
| ZSS | Bulma | c06 | El mismo mod de la sección 2 |
| Steve | Red Steve (PR #11) | c02 o c06 | Compite con Steviroth por los 2 slots pares libres |
| Ike | Terra | Por definir (c02 = Terranort) | |
| Pyra y Mythra | Aqua (probado en consola en c00) | Por definir | Moverlo exige reslotear la pareja y a Rex: es el cambio más delicado |

En la rama del PR #1 también hay cambios en c00 de Bayonetta, Captain Falcon, DK (Bananza), Steve y ZSS.

## 4. Lo que queda por decidir

1. Luigi: qué traje de WuBoy se sacrifica para Swole Luigi.
2. Ganondorf: el reparto de c01/c02/c05/c07 entre Otis, Pikadorf y ExDeath.
3. Steve: Red Steve y Steviroth, ¿uno en c02 y el otro en c06?
4. Ike (Terra) y Pyra/Mythra (Aqua): a qué slot van, o si se dejan fuera.
