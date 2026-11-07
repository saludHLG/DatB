import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Genera assets/js/core/config.js en dist/ con la URL y la anon key
 * reales, tomadas de VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 *
 * El archivo del repositorio lleva marcadores %%...%% en lugar de la
 * clave, así no vuelve a quedar una clave incorrecta hardcodeada y la
 * rotación de claves no requiere tocar el código.
 *
 * Se escribe DESPUÉS de copiar assets/ para no ser sobrescrito.
 */
function generateRuntimeConfig(env) {
  return {
    name: 'datb-runtime-config',
    closeBundle() {
      const src = resolve('assets/js/core/config.js')
      if (!existsSync(src)) return

      const url = env.VITE_SUPABASE_URL || 'https://arbdhyeycvyskjgpjlmn.supabase.co'
      const anon = env.VITE_SUPABASE_ANON_KEY || ''

      if (!anon) {
        this.warn(
          'VITE_SUPABASE_ANON_KEY no está definida: el runtime legacy ' +
            '(admin.html) no podrá autenticar. Defina el secret ' +
            'VITE_SUPABASE_ANON_KEY en GitHub Actions.',
        )
      }
      if (anon.startsWith('sb_publishable_')) {
        this.error(
          'VITE_SUPABASE_ANON_KEY es una clave sb_publishable_, que este ' +
            'proyecto rechaza con HTTP 401. Use la anon key en formato JWT.',
        )
      }

      const out = resolve('dist/assets/js/core/config.js')
      mkdirSync(resolve('dist/assets/js/core'), { recursive: true })
      const content = readFileSync(src, 'utf8')
        .replaceAll('%%VITE_SUPABASE_URL%%', url)
        .replaceAll('%%VITE_SUPABASE_ANON_KEY%%', anon)
      writeFileSync(out, content, 'utf8')
    },
  }
}

/**
 * Copia a dist/ lo que Vite no genera y el runtime legacy necesita:
 *  - assets/: CSS y JS cargados dinámicamente por loadLegacyScripts().
 *  - admin.html: entry HTML independiente que el shell abre con
 *    window.location.href. Sin esta copia devuelve 404 en producción.
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/DatB/',
    plugins: [react(), copyLegacyAssets(), generateRuntimeConfig(env)],
    server: { port: 5173, strictPort: true },
    build: { target: 'es2022', sourcemap: true },
  }
})
