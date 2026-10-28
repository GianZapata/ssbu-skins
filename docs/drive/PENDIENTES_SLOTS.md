# Pendientes de slot (descargado 2026-10-25, MD5 verificados contra GameBanana)
Nada instalado ni agregado a PRs. Prueba en consola pendiente para todos.

| Mod | Luchador | Slot original del archivo | Wifi | Conflictos conocidos | Slot final |
|---|---|---|---|---|---|
| 323894 Steviroth | Steve (pickel) | c00 (body, trolley, wing; UI chara_0-7) | Declaración explícita del autor ("can be placed on any slot and is Wi-Fi Safe") | Red Steve c00 en PR #11 | PENDIENTE |
| 406732 Pikadorf | Ganondorf (ganon) | c00 (body, sword, voz, UI chara_0-4,6,7) | Declaración explícita del autor ("Wi-Fi Safe") | Otis c00 en PR #1 | PENDIENTE |
| 387553 Raiden (Metal Gear Rising) | Chrom (chrom) | c01 y c02 (body, sword, voz, BGM victoria, msg_name.xmsbt, ui_chara_db.prcxml) | Sin evidencia localizada (2 preguntas sin respuesta del autor) | Revisar slots de Chrom en el modpack | PENDIENTE |

Notas Raiden: usar el config.json de config_cc198.zip (corregido por el autor). Sin motion ni parametros de pelea en la lista de archivos; trae model.nusktb en sword.

## Zero Suit Samus (carpeta zss_gwen_bulma)
Los IDs del PR #1 (428104 y 391289) eran incorrectos; estos son los mods reales de ZSS.
| 174461 Spider-Gwen | ZSS (szerosuit) | c07 (el autor lo publica para c07; trae sus texturas) | Sin evidencia localizada (pregunta sin respuesta) | Jill c07 (color 8) | PENDIENTE |
| 724190 Bulma (Dragon Ball) | ZSS | c00 con ef_szerosuit_c00.eff, gunship, paralyzer, voz, narrador, msg_name.xmsbt, ui_chara_db.prcxml | Sin evidencia localizada | Requiere One Slot Effects | PENDIENTE |
| 549058 One Slot Effects 13.0.5 | plugin libone_slot_eff.nro | n/a | Autor: everything should be wi-fi safe | Requiere ARCropolis reciente | n/a |
Spider-Gwen salio negra porque se movio a otro slot sin sus texturas; reinstalarla en c07 con el archivo original.

| 175495 Kingdom Hearts Squall | Chrom | c00-c07 (los 8 slots, con voz japonesa por slot) | Sin evidencia localizada | Raiden 387553 en c01-c02 | PENDIENTE elegir slot(s) |

## Lote t43 (15 nuevos, 2026-10-28)
Descargados en box `/workspace/ssbu_t43`, MD5 OK vs GameBanana `_sMd5Checksum`, subidos a `My Drive/SSBU_mods/<fighter>/<modid>_<name>/{LINK.txt, original/}`. Nada instalado ni al catálogo. Inspección: lista de archivos de cada archivo (zip/7z/rar). Ningún archivo >100 MB (sin PARTES).

| Mod | Fighter | Slots nativos | Wifi label | Conflictos | Slot final |
|---|---|---|---|---|---|
| 374147 Moogle over Mario | mario | c00, c01, c02 [effects+motion+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 391570 Rayman (WiiU Trophy) | luigi | c06, c07 [config.json+effects+motion+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 386111 Kurama [Linked] & [Susano'o Armor] +JP Voice(New!) | bowser | c05, c06 [config.json+motion+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 384627 Timeless River Dr. Mario | dr_mario | c01, c07 [ui] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 357706 Pirate Funky Kong | dk | c03 [config.json] | Declaración explícita del autor sin condiciones conocidas | ninguno en c03 (c01=Funky, c02/c04/c06=WuBoy; c00/c03/c05/c07 originales libres) | PENDIENTE |
| 342215 Goblin Slayer over Link | link | c04 [ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 367390 Larxene over Sheik | sheik | c00, c01 [ui] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 346851 Jean Grey over Zelda | zelda | c01 [ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 174353 ExDeath | ganondorf | c05, c06, c07 [motion+param/prc+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | PR#1 Ganon c00/c02/c03/c06 — c06 choca; c05 y c07 libres vs PR#1 | PENDIENTE |
| 397431 Jinx | zero_suit_samus | c02 [motion+param/prc+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | Jill en c07; c02 sin ocupante conocido en brief (verificar Spider-Gwen) | PENDIENTE |
| 174558 (Falco) N64 Skin/Voice/SFX | falco | c00, c01, c02 [ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 443660 Freddie Freaker over Incineroar | incineroar | c04 [config.json+effects+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 466057 Garnet over Captain Falcon | captain_falcon | c02 [config.json+motion+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | PR#1 Cap Falcon propuesta c02=Dark Falcon; modpack actualmente default | PENDIENTE |
| 442940 Sigurd Marth | marth | c03 [config.json+ui] | Declaración explícita del autor sin condiciones conocidas | ninguno conocido | PENDIENTE |
| 501311 Morrigan (MVC3 Design) | bayonetta | c00, c01, c02, c03, c04, c05, c06, c07 [effects+motion+param/prc+ui+voice/sound] | Declaración explícita del autor sin condiciones conocidas | PR#1 Bayonetta c03=Harley Quinn — evitar c03 al elegir slot final | PENDIENTE |

Notas t43:
- Carpetas Drive creadas/reutilizadas bajo SSBU_mods root `1UizC4YCm0t56A9AaFthfidFtwmCAwys1`.
- OSE/extras: varios traen effects/motion/param/ui/voice; marcar One Slot Effects si se mueven de slot nativo.
- Total originals ~552 MB (28 archivos, todos MD5 OK).
