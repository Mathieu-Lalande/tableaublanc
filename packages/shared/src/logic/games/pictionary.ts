/** Mots du pictionary (français, faciles à dessiner). */
export const PICTIONARY_WORDS: readonly string[] = [
  'chat',
  'chien',
  'maison',
  'soleil',
  'vélo',
  'guitare',
  'pizza',
  'fusée',
  'arbre',
  'bateau',
  'parapluie',
  'lunettes',
  'montagne',
  'château',
  'dragon',
  'robot',
  'girafe',
  'éléphant',
  'téléphone',
  'avion',
  'escargot',
  'tortue',
  'pingouin',
  'baleine',
  'cactus',
  'volcan',
  'phare',
  'sirène',
  'licorne',
  'fantôme',
  'citrouille',
  'croissant',
  'baguette',
  'fromage',
  'tour eiffel',
  'trampoline',
  'skateboard',
  'piscine',
  'camping',
  'cerf-volant',
  'arc-en-ciel',
  'tornade',
  'pirate',
  'astronaute',
  'vampire',
  'sorcière',
  'moustache',
  'chaussette',
  'horloge',
  'ampoule',
  'clé',
  'cadenas',
  'parachute',
  'hélicoptère',
  'sous-marin',
  'igloo',
  'bonhomme de neige',
  'pyramide',
  'dinosaure',
  'abeille',
  'papillon',
  'araignée',
  'hamburger',
  'sushi',
  'glace',
]

export const PICTIONARY_ROUND_MS = 90_000

/** Normalisation des propositions : casse, accents, espaces et ponctuation ignorés. */
export function normalizeGuess(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isCorrectGuess(guess: string, word: string): boolean {
  const g = normalizeGuess(guess)
  return g.length > 0 && g === normalizeGuess(word)
}

/** Indice affiché aux devineurs : longueur et séparateurs, jamais les lettres. */
export function maskWord(word: string): string {
  return [...word].map((ch) => (/[\p{L}\p{N}]/u.test(ch) ? '_' : ch)).join(' ')
}
