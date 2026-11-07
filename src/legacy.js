const loaded = new Set()
const LEGACY_ASSET_BUILD = '20261007-04'

/**
 * Base de la aplicación, garantizando que termina en "/".
 *
 * `import.meta.env.BASE_URL` vale '/DatB/' en producción, y el bug
 * original resolvía las rutas contra `window.location.href` (que en el
 * shell es '.../DatB/' pero tras una navegación o con un `src` relativo
 * podía no serlo, dejando URLs como '.../DatB/index.html/assets/...').
 * Aquí se ancla siempre al mismo origen + BASE_URL, de forma estable
 * ante recargas (F5) y cambios de ruta.
 */
function appBase() {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return new URL(base, `${window.location.origin}/`)
}

export async function loadLegacyScripts(paths) {
  const base = appBase()

  for (const path of paths) {
    if (loaded.has(path)) continue

    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      const assetUrl = new URL(path.replace(/^\/+/, ''), base)
      assetUrl.searchParams.set('v', LEGACY_ASSET_BUILD)
      s.src = assetUrl.href
      s.async = false
      s.onload = () => {
        loaded.add(path)
        resolve()
      }
      s.onerror = () =>
        reject(
          new Error(
            `No se pudo cargar ${path} (${assetUrl.href}). ` +
              'Compruebe que el archivo existe en dist/.',
          ),
        )
      document.head.appendChild(s)
    })
  }
}

/** Expuesto para depuración: permite ver qué scripts ya cargaron. */
export function loadedLegacyScripts() {
  return [...loaded]
}
