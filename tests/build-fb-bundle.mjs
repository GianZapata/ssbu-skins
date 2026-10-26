// Empaqueta el SDK de Firebase 10.14.1 (la misma versión que carga la web desde gstatic) en un solo módulo local.
// Las pruebas sirven este archivo en lugar del CDN, que no está disponible sin red.
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/fb-entry.js', "export * from 'firebase/app';\nexport * from 'firebase/auth';\nexport * from 'firebase/firestore';\n");
await build({ entryPoints: ['.cache/fb-entry.js'], bundle: true, format: 'esm', outfile: '.cache/fb-all.js', minify: true, logLevel: 'error' });
console.log('ok · .cache/fb-all.js');
