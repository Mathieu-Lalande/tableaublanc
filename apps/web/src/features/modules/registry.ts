import type { Editor, TLAnyShapeUtilConstructor, TLShape, TLStateNodeConstructor } from 'tldraw'
import { DiceShapeUtil } from './games/DiceShapeUtil'
import { Connect4ShapeUtil, TicTacToeShapeUtil } from './games/GridGameShapeUtils'
import { PictionaryShapeUtil } from './games/PictionaryShapeUtil'
import { ScoreboardShapeUtil } from './games/ScoreboardShapeUtil'
import { TimerShapeUtil } from './games/TimerShapeUtil'
import { MindmapNodeShapeUtil } from './mindmap/MindmapNodeShapeUtil'
import { syncServerClock } from './shared/serverClock'
import { mindmapShapeVisibility, registerMindmap } from './mindmap/registerMindmap'

/** ShapeUtils custom enregistrées auprès de l'éditeur. */
export const customShapeUtils: TLAnyShapeUtilConstructor[] = [
  MindmapNodeShapeUtil,
  DiceShapeUtil,
  TimerShapeUtil,
  ScoreboardShapeUtil,
  PictionaryShapeUtil,
  TicTacToeShapeUtil,
  Connect4ShapeUtil,
]

/** Outils custom (StateNode) enregistrés auprès de l'éditeur. */
export const customTools: TLStateNodeConstructor[] = []

/** Visibilité calculée des shapes (replis de mind map…). */
export function getShapeVisibility(shape: TLShape, editor: Editor): 'hidden' | 'inherit' {
  return mindmapShapeVisibility(shape, editor)
}

/** Installe les comportements des modules ; renvoie la fonction de nettoyage. */
export function registerModules(editor: Editor): () => void {
  void syncServerClock()
  const cleanups = [registerMindmap(editor)]
  return () => cleanups.forEach((c) => c())
}
