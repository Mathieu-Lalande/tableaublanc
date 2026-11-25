import { useMemo } from 'react'
import { useSync } from '@tldraw/sync'
import {
  defaultBindingUtils,
  defaultShapeUtils,
  Tldraw,
  type TLComponents,
  type TLUserStore,
} from 'tldraw'
import { customShapeUtils } from '@/features/modules/registry'
import { createAssetStore } from './assetStore'
import { buildSyncUri } from './syncUri'
import { tldrawAssetUrls } from './tldrawAssets'

// useSync attend la liste complète (défaut + custom), contrairement au composant <Tldraw>.
const storeShapeUtils = [...defaultShapeUtils, ...customShapeUtils]

export interface BoardCanvasProps {
  readonly boardId: string
  readonly users?: TLUserStore
  readonly readOnly?: boolean
  readonly components?: TLComponents
  readonly onCustomMessage?: (data: unknown) => void
}

export function BoardCanvas({
  boardId,
  users,
  readOnly,
  components,
  onCustomMessage,
}: BoardCanvasProps) {
  const assets = useMemo(() => createAssetStore(boardId), [boardId])
  const store = useSync({
    uri: buildSyncUri(boardId, window.location),
    assets,
    shapeUtils: storeShapeUtils,
    bindingUtils: defaultBindingUtils,
    ...(users ? { users } : {}),
    ...(onCustomMessage ? { onCustomMessageReceived: onCustomMessage } : {}),
  })

  if (store.status === 'error') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground" role="alert">
        Connexion au board impossible.
      </div>
    )
  }

  return (
    <div className="fixed inset-0" data-testid="board-canvas">
      <Tldraw
        store={store}
        shapeUtils={customShapeUtils}
        assetUrls={tldrawAssetUrls}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
        {...(components ? { components } : {})}
        onMount={(editor) => {
          if (readOnly) editor.updateInstanceState({ isReadonly: true })
          if (import.meta.env.DEV) Object.assign(window, { editor })
        }}
      />
    </div>
  )
}
