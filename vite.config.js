import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Copia a dist/ todo lo que el runtime legacy necesita y que Vite no
 * genera por sí mismo:
 *  - assets/: CSS y JS cargados dinámicamente por loadLegacyScripts().
 *  - admin.html: entry HTML independiente que el shell abre con
 *    window.location.href. Vive en la raíz del repo pero no es un entry
 *    de Vite, así que sin esta copia devuelve 404 en producción.
 *
 * Nota: assets/pages/admin.html e index.html ya vienen dentro de assets/,
 * por lo que se copian con el árbol completo.
 */
function copyLegacyAssets() {
  return {
    name: 'copy-datb-legacy-assets',
    closeBundle() {
      const distDir = resolve('dist')
      mkdirSync(distDir, { recursive: true })

      if (existsSync(resolve('assets'))) {
        cpSync(resolve('assets'), resolve(distDir, 'assets'), { recursive: true })
      }

      for (const file of ['admin.html']) {
        if (existsSync(resolve(file))) {
          cpSync(resolve(file), resolve(distDir, file))
        }
      }
    },
  }
}

export default defineConfig({
  base: '/DatB/',
  plugins: [react(), copyLegacyAssets()],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
})
