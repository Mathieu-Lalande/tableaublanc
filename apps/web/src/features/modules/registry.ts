import type { Editor, TLAnyShapeUtilConstructor, TLShape, TLStateNodeConstructor } from 'tldraw'
import { MindmapNodeShapeUtil } from './mindmap/MindmapNodeShapeUtil'
import { mindmapShapeVisibility, registerMindmap } from './mindmap/registerMindmap'

/** ShapeUtils custom enregistrées auprès de l'éditeur. */
export const customShapeUtils: TLAnyShapeUtilConstructor[] = [MindmapNodeShapeUtil]

/** Outils custom (StateNode) enregistrés auprès de l'éditeur. */
export const customTools: TLStateNodeConstructor[] = []

/** Visibilité calculée des shapes (replis de mind map…). */
export function getShapeVisibility(shape: TLShape, editor: Editor): 'hidden' | 'inherit' {
  return mindmapShapeVisibility(shape, editor)
}

/** Installe les comportements des modules ; renvoie la fonction de nettoyage. */
export function registerModules(editor: Editor): () => void {
  const cleanups = [registerMindmap(editor)]
  return () => cleanups.forEach((c) => c())
}
