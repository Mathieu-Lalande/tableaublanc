import type { LibraryItem } from '@/features/library/types'
import { mindmapItems } from './mindmap/mindmapItems'

/** Modules, modèles et jeux insérables. */
export const moduleItems: readonly LibraryItem[] = [...mindmapItems]
