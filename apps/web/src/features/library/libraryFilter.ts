function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Filtre de la Bibliothèque : correspondance par sous-chaîne (sans accents), le libellé
 * prime sur les mots-clés. Évite les faux positifs de la recherche floue par défaut.
 */
export function libraryFilter(
  value: string,
  search: string,
  keywords: readonly string[] = [],
): number {
  const q = normalize(search.trim())
  if (!q) return 1
  const label = normalize(value)
  if (label.startsWith(q)) return 1
  if (label.includes(q)) return 0.9
  const terms = q.split(/\s+/)
  const haystack = normalize([value, ...keywords].join(' '))
  return terms.every((t) => haystack.includes(t)) ? 0.5 : 0
}

/** Éléments correspondant à la recherche, du plus pertinent au moins pertinent (tri stable). */
export function rankItems<
  T extends { label: string; description: string; keywords?: readonly string[] },
>(items: readonly T[], search: string): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      score: libraryFilter(item.label, search, [...(item.keywords ?? []), item.description]),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item)
}
