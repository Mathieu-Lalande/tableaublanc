import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'

/** Polices, icônes et traductions servies par notre build (pas de CDN externe → CSP stricte). */
export const tldrawAssetUrls = getAssetUrlsByImport()
