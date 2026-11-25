import { useMemo } from 'react'
import { useSync } from '@tldraw/sync'
import {
  defaultBindingUtils,
  defaultShapeUtils,
  Tldraw,
  type Editor,
  type TLComponents,
  type TLUiOverrides,
  type TLUserStore,
} from 'tldraw'
import { customRecordSchemas } from '@canvas/shared'
import { getUserPresence } from '@/features/collaboration/reactions'
import {
  customShapeUtils,
  customTools,
  getShapeVisibility,
  registerModules,
} from '@/features/modules/registry'
import { createAssetStore } from './assetStore'
import { buildSyncUri } from './syncUri'
import { tldrawAssetUrls } from './tldrawAssets'

// useSync attend la liste complète (défaut + custom), contrairement au composant <Tldraw>.
const storeShapeUtils = [...defaultShapeUtils, ...customShapeUtils]

export interface BoardCanvasProps {
  readonly boardId: string
  readonly users: TLUserStore
  readonly components: TLComponents
  readonly overrides?: TLUiOverrides
  readonly colorScheme: 'light' | 'dark'
  readonly onCustomMessage?: (data: unknown) => void
  readonly onEditor?: (editor: Editor) => void
}

export function BoardCanvas({
  boardId,
  users,
  components,
  overrides,
  colorScheme,
  onCustomMessage,
  onEditor,
}: BoardCanvasProps) {
  const assets = useMemo(() => createAssetStore(boardId), [boardId])
  const store = useSync({
    uri: buildSyncUri(boardId, window.location),
    assets,
    users,
    shapeUtils: storeShapeUtils,
    bindingUtils: defaultBindingUtils,
    records: customRecordSchemas,
    getUserPresence,
    ...(onCustomMessage ? { onCustomMessageReceived: onCustomMessage } : {}),
  })

  if (store.status === 'error') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground" role="alert">
        Connexion au board impossible. Vérifie que tu as toujours accès à ce board.
      </div>
    )
  }

  return (
    <div className="fixed inset-0" data-testid="board-canvas">
      <Tldraw
        store={store}
        shapeUtils={customShapeUtils}
        tools={customTools}
        assetUrls={tldrawAssetUrls}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
        components={components}
        getShapeVisibility={getShapeVisibility}
        {...(overrides ? { overrides } : {})}
        onMount={(editor) => {
          // UI tldraw en français (traductions servies avec les assets self-hostés).
          editor.user.updateUserPreferences({ colorScheme, locale: 'fr' })
          if (import.meta.env.DEV) Object.assign(window, { editor })
          onEditor?.(editor)
          return registerModules(editor)
        }}
      />
    </div>
  )
}
