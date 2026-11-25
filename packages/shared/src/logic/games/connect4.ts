import type { BoardGameRules } from './boardGame'
import { EMPTY } from './grid'

export type Connect4Symbol = 'R' | 'Y'

export const CONNECT4_ROWS = 6
export const CONNECT4_COLS = 7

/** Puissance 4 : le pion tombe dans la case libre la plus basse de la colonne. */
export const connect4Rules: BoardGameRules<Connect4Symbol> = {
  game: { rows: CONNECT4_ROWS, cols: CONNECT4_COLS, symbols: ['R', 'Y'], toWin: 4 },
  resolveTarget(cells, target) {
    if (target.kind !== 'column') return null
    const col = target.column
    if (!Number.isInteger(col) || col < 0 || col >= CONNECT4_COLS) return null
    for (let row = CONNECT4_ROWS - 1; row >= 0; row--) {
      const i = row * CONNECT4_COLS + col
      if (cells[i] === EMPTY) return i
    }
    return null
  },
}
