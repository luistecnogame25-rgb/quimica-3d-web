// Empaqueta src/main.js (con Three.js) en assets/app.js como script clásico,
// para que index.html funcione incluso abriéndolo con doble clic (file://).
// Uso:  node build.mjs   (reutiliza Vite y Three.js instalados en ../laboratorio-3d)
import { build } from '../laboratorio-3d/node_modules/vite/dist/node/index.js';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
await build({
  root: here,
  configFile: false,
  logLevel: 'warn',
  resolve: { alias: { three: fileURLToPath(new URL('../laboratorio-3d/node_modules/three/build/three.module.js', import.meta.url)) } },
  build: {
    outDir: 'assets',
    emptyOutDir: false,
    target: 'es2020',
    minify: true,
    lib: { entry: 'src/main.js', formats: ['iife'], name: 'Quimica3DSitio', fileName: () => 'app.js' },
  },
});
console.log('assets/app.js listo');
