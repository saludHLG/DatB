const loaded = new Set()
const LEGACY_ASSET_BUILD = '20261007-04'

export async function loadLegacyScripts(paths) {
  const base = new URL(import.meta.env.BASE_URL, window.location.href)
  for (const path of paths) {
    if (loaded.has(path)) continue
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      const assetUrl = new URL(path.replace(/^\/+/, ''), base)
      assetUrl.searchParams.set('v', LEGACY_ASSET_BUILD)
      s.src = assetUrl.href
      s.async = false
      s.onload = resolve
      s.onerror = () => reject(new Error('No se pudo cargar ' + path))
      document.head.appendChild(s)
    })
    loaded.add(path)
  }
}
