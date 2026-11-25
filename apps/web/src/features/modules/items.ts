import type { LibraryItem } from '@/features/library/types'
import { gameItems } from './games/gameItems'
import { mindmapItems } from './mindmap/mindmapItems'
import { templateItems } from './templates/templateItems'

/** Modules, modèles et jeux insérables. */
export const moduleItems: readonly LibraryItem[] = [...mindmapItems, ...templateItems, ...gameItems]
