import { describe, expect, it } from 'vitest'
import { libraryFilter, rankItems } from './libraryFilter'

describe('libraryFilter', () => {
  it('privilégie le libellé et ignore les accents', () => {
    expect(libraryFilter('Dé', 'de')).toBe(1)
    expect(libraryFilter('Matrice d’Eisenhower', 'eisen')).toBe(0.9)
    expect(libraryFilter('Kanban', 'tâches', ['taches', 'todo'])).toBe(0.5)
  })
  it('ne fait pas de correspondance floue par sous-séquence', () => {
    expect(
      libraryFilter('Mind map (radiale)', 'morpion', ['étoile autour de l’idée centrale']),
    ).toBe(0)
  })
  it('combine plusieurs termes', () => {
    expect(libraryFilter('Mind map (arbre)', 'mind map arbre')).toBe(1)
    expect(libraryFilter('Mind map (radiale)', 'mind radial', ['radial'])).toBe(0.5)
  })
})

describe('rankItems', () => {
  it('place la correspondance de libellé en premier', () => {
    const items = [
      { label: 'Mind map (arbre)', description: 'Organise tes idées' },
      { label: 'Dé', description: 'Un lancer animé' },
    ]
    expect(rankItems(items, 'dé').map((i) => i.label)).toEqual(['Dé', 'Mind map (arbre)'])
  })
})
