import { moduleItems } from '@/features/modules/items'
import { fileItems } from './fileItems'
import type { LibraryItem } from './types'

export const libraryItems: readonly LibraryItem[] = [...moduleItems, ...fileItems]
