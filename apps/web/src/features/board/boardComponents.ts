import type { TLComponents } from 'tldraw'
import { CanvasLayers } from './CanvasLayers'
import { BoardOverlay, BoardSharePanel, BoardTitleBar } from './BoardChrome'

/** Surcharges des emplacements de l'UI tldraw (API publique `components`). */
export const boardComponents: TLComponents = {
  TopPanel: BoardTitleBar,
  SharePanel: BoardSharePanel,
  InFrontOfTheCanvas: BoardOverlay,
  OnTheCanvas: CanvasLayers,
}
