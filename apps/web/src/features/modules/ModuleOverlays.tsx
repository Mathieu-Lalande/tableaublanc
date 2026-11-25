import { MindmapToolbar } from './mindmap/MindmapToolbar'
import { VoteToolbar } from './vote/VoteToolbar'

/** Éléments d'UI contextuels des modules, rendus au-dessus du canvas. */
export function ModuleOverlays() {
  return (
    <>
      <MindmapToolbar />
      <VoteToolbar />
    </>
  )
}
