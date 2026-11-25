/** Palette de couleurs de curseur lisibles en thème clair et sombre. */
export const USER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
] as const

export function pickUserColor(seed: string): string {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return USER_COLORS[Math.abs(h) % USER_COLORS.length] ?? '#6366f1'
}
