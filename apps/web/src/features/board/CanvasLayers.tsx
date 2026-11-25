import { ReactionsLayer } from '@/features/collaboration/ReactionsLayer'
import { VoteLayer } from '@/features/modules/vote/VoteLayer'

/** Couches affichées dans l'espace de la page (au-dessus des shapes). */
export function CanvasLayers() {
  return (
    <>
      <VoteLayer />
      <ReactionsLayer />
    </>
  )
}
