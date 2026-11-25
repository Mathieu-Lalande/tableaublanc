import { useEffect } from 'react'
import type { Editor } from 'tldraw'
import { boardsApi } from '@/features/boards/boardsApi'

const INTERVAL_MS = 45_000

/**
 * Génère périodiquement une miniature PNG du board (APIs d'export natives tldraw)
 * et l'envoie au serveur, uniquement si le document a changé depuis le dernier envoi.
 */
export function useBoardThumbnail(editor: Editor | null, boardId: string, enabled: boolean): void {
  useEffect(() => {
    if (!editor || !enabled) return
    let lastClock = -1
    let busy = false

    const capture = async () => {
      if (busy) return
      const clock = editor.store.history.get()
      const shapes = editor.getCurrentPageShapeIds()
      if (clock === lastClock || shapes.size === 0) return
      busy = true
      try {
        const { blob } = await editor.toImage([...shapes], {
          format: 'png',
          scale: 0.4,
          background: true,
          padding: 24,
        })
        await boardsApi.uploadThumbnail(boardId, blob)
        lastClock = clock
      } catch {
        // miniature best-effort : un échec n'impacte pas l'édition
      } finally {
        busy = false
      }
    }

    const id = window.setInterval(capture, INTERVAL_MS)
    const onHide = () => {
      if (document.visibilityState === 'hidden') void capture()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onHide)
      void capture()
    }
  }, [editor, boardId, enabled])
}
