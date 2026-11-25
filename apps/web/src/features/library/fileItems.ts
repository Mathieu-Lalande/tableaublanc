import {
  exportAs,
  parseTldrawJsonFile,
  serializeTldrawJsonBlob,
  type Editor,
  type TLContent,
} from 'tldraw'
import type { LibraryItem } from './types'

function allShapeIds(editor: Editor) {
  return [...editor.getCurrentPageShapeIds()]
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

const MAX_IMPORT_BYTES = 20 * 1024 * 1024

/**
 * Importe un fichier .tldr en l'ajoutant à la page courante (sans écraser le board partagé).
 * Le fichier est validé par le parseur natif de tldraw contre le schéma du board.
 */
export async function importTldrFile(editor: Editor, file: File): Promise<void> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Fichier trop volumineux')
  const result = parseTldrawJsonFile({ json: await file.text(), schema: editor.store.schema })
  if (!result.ok) throw new Error('Fichier tldraw invalide')
  const source = result.value
  const records = source.allRecords()
  const page = records.find((r) => r.typeName === 'page')
  if (!page) return
  const shapes = records.filter((r) => r.typeName === 'shape')
  const content: TLContent = {
    shapes,
    rootShapeIds: shapes.filter((s) => s.parentId === page.id).map((s) => s.id),
    bindings: records.filter((r) => r.typeName === 'binding'),
    assets: records.filter((r) => r.typeName === 'asset'),
    schema: editor.store.schema.serialize(),
  }
  editor.markHistoryStoppingPoint('import json')
  editor.putContentOntoCurrentPage(content, { select: true })
  editor.zoomToSelection({ animation: { duration: 300 } })
}

export const fileItems: readonly LibraryItem[] = [
  {
    id: 'export-png',
    label: 'Exporter en PNG',
    description: 'Image de tout le contenu de la page',
    emoji: '🖼️',
    category: 'Fichier',
    keywords: ['image', 'export', 'télécharger'],
    run: ({ editor }) =>
      exportAs(editor, allShapeIds(editor), { format: 'png', name: 'canvas', background: true }),
  },
  {
    id: 'export-svg',
    label: 'Exporter en SVG',
    description: 'Vectoriel, idéal pour l’impression',
    emoji: '✒️',
    category: 'Fichier',
    keywords: ['vectoriel', 'export'],
    run: ({ editor }) => exportAs(editor, allShapeIds(editor), { format: 'svg', name: 'canvas' }),
  },
  {
    id: 'export-json',
    label: 'Exporter en JSON (.tldr)',
    description: 'Sauvegarde complète réimportable',
    emoji: '💾',
    category: 'Fichier',
    keywords: ['sauvegarde', 'backup', 'tldr'],
    run: async ({ editor }) => download(await serializeTldrawJsonBlob(editor), 'canvas.tldr'),
  },
  {
    id: 'import-json',
    label: 'Importer un JSON (.tldr)',
    description: 'Ajoute le contenu d’un fichier à cette page',
    emoji: '📥',
    category: 'Fichier',
    keywords: ['import', 'ouvrir', 'tldr'],
    run: async ({ editor }) => {
      const file = await pickFile('.tldr,application/json')
      if (file) await importTldrFile(editor, file)
    },
  },
  {
    id: 'help-shortcuts',
    label: 'Raccourcis clavier',
    description: 'Mind map, Bibliothèque, laser, chat au curseur…',
    emoji: '⌨️',
    category: 'Aide',
    keywords: ['aide', 'clavier', 'touches', 'help'],
    run: ({ openShortcuts }) => openShortcuts(),
  },
]
