import type { LibraryItem } from '@/features/library/types'
import { createMindmap } from './mindmapOps'

const zoomToNew = (editor: Parameters<LibraryItem['run']>[0]['editor']) =>
  editor.zoomToSelection({ animation: { duration: 400 } })

export const mindmapItems: readonly LibraryItem[] = [
  {
    id: 'mindmap-tree',
    label: 'Mind map (arbre)',
    description: 'Tab = enfant, Entrée = frère, double-clic pour éditer',
    emoji: '🧠',
    category: 'Modules',
    keywords: ['carte mentale', 'idées', 'arbre'],
    run: ({ editor }) => {
      const root = createMindmap(editor, editor.getViewportPageBounds().center, 'tree')
      editor.select(root)
      zoomToNew(editor)
    },
  },
  {
    id: 'mindmap-radial',
    label: 'Mind map (radiale)',
    description: 'Branches disposées en étoile autour de l’idée centrale',
    emoji: '🌟',
    category: 'Modules',
    keywords: ['carte mentale', 'radial', 'étoile'],
    run: ({ editor }) => {
      createMindmap(editor, editor.getViewportPageBounds().center, 'radial')
      zoomToNew(editor)
    },
  },
]
