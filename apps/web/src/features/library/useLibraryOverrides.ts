import { useMemo } from 'react'
import type { TLUiOverrides } from 'tldraw'

/** Ajoute l'action « Bibliothèque » (Ctrl/Cmd+K) aux actions natives de tldraw. */
export function useLibraryOverrides(openLibrary: () => void, canEdit: boolean): TLUiOverrides {
  return useMemo<TLUiOverrides>(
    () => ({
      actions(_editor, actions) {
        if (!canEdit) return actions
        return {
          ...actions,
          'canvas-library': {
            id: 'canvas-library',
            label: 'Bibliothèque',
            kbd: 'cmd+k,ctrl+k',
            onSelect: () => openLibrary(),
          },
        }
      },
    }),
    [openLibrary, canEdit],
  )
}
