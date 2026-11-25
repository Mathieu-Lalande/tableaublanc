/** Utilitaires communs aux jeux de grille (morpion, puissance 4). */

export const EMPTY = '.'

export interface GridGame<S extends string> {
  readonly rows: number
  readonly cols: number
  readonly symbols: readonly [S, S]
  /** Nombre de pions alignés pour gagner. */
  readonly toWin: number
}

export interface WinResult {
  readonly winner: string
  readonly line: readonly number[]
}

export function emptyCells(rows: number, cols: number): string {
  return EMPTY.repeat(rows * cols)
}

export function otherSymbol<S extends string>(game: GridGame<S>, s: S): S {
  return s === game.symbols[0] ? game.symbols[1] : game.symbols[0]
}

/** Cherche un alignement gagnant (horizontal, vertical, diagonales). */
export function findWinner<S extends string>(game: GridGame<S>, cells: string): WinResult | null {
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const s = cells[r * game.cols + c]
      if (!s || s === EMPTY) continue
      for (const [dr, dc] of dirs) {
        const line: number[] = []
        for (let k = 0; k < game.toWin; k++) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= game.rows || cc < 0 || cc >= game.cols) break
          if (cells[rr * game.cols + cc] !== s) break
          line.push(rr * game.cols + cc)
        }
        if (line.length === game.toWin) return { winner: s, line }
      }
    }
  }
  return null
}

export function isFull(cells: string): boolean {
  return !cells.includes(EMPTY)
}

/** Résultat d'une grille : symbole gagnant, 'draw' ou '' (en cours). */
export function outcome<S extends string>(
  game: GridGame<S>,
  cells: string,
): { winner: S | 'draw' | ''; winLine: string } {
  const win = findWinner(game, cells)
  if (win) return { winner: win.winner as S, winLine: win.line.join(',') }
  return { winner: isFull(cells) ? 'draw' : '', winLine: '' }
}
