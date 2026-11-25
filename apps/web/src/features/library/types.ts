import type { Editor } from 'tldraw'

export type LibraryCategory = 'Modules' | 'Modèles' | 'Jeux' | 'Fichier'

export interface LibraryContext {
  readonly editor: Editor
  readonly boardId: string
}

/** Élément insérable depuis la Bibliothèque / la command palette. */
export interface LibraryItem {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly emoji: string
  readonly category: LibraryCategory
  readonly keywords?: readonly string[]
  run(ctx: LibraryContext): void | Promise<void>
}
