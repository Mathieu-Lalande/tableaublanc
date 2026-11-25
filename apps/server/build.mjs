// Bundle de production : le code serveur et @canvas/shared (TypeScript) sont regroupés,
// les dépendances npm restent externes (installées par `pnpm deploy --prod`).
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const external = Object.keys(pkg.dependencies ?? {}).filter((d) => d !== '@canvas/shared')

await build({
  entryPoints: { main: 'src/main.ts', admin: 'src/cli/admin.ts' },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  // Certaines dépendances CJS utilisent require() : on le fournit au bundle ESM.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
})
