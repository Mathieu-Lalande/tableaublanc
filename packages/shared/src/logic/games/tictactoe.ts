import type { BoardGameRules } from './boardGame'
import { EMPTY } from './grid'

export type TicTacToeSymbol = 'X' | 'O'

export const ticTacToeRules: BoardGameRules<TicTacToeSymbol> = {
  game: { rows: 3, cols: 3, symbols: ['X', 'O'], toWin: 3 },
  resolveTarget(cells, target) {
    if (target.kind !== 'cell') return null
    const i = target.index
    return Number.isInteger(i) && i >= 0 && i < 9 && cells[i] === EMPTY ? i : null
  },
}
