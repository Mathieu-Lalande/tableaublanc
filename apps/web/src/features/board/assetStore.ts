import type { TLAssetStore } from 'tldraw'

/**
 * Upload des images vers l'API (contrôle du type MIME réel et de la taille côté serveur).
 * Le serveur renvoie une URL relative servie uniquement aux membres du board.
 */
export function createAssetStore(boardId: string): TLAssetStore {
  return {
    async upload(_asset, file) {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/assets`, {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
        headers: { 'x-canvas-csrf': '1' },
      })
      if (!res.ok) throw new Error('Upload impossible')
      const body = (await res.json()) as { src: string }
      return { src: body.src }
    },
    resolve(asset) {
      return asset.props.src
    },
  }
}
