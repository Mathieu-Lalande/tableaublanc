import type { Editor, VecLike } from 'tldraw'

/** Point d'insertion : centre de la vue courante, décalé pour que le contenu soit centré. */
export function insertionPoint(
  editor: Editor,
  size: { w: number; h: number } = { w: 0, h: 0 },
): VecLike {
  const c = editor.getViewportPageBounds().center
  return { x: c.x - size.w / 2, y: c.y - size.h / 2 }
}
