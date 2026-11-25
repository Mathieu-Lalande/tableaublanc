import { emptyCells, EMPTY, otherSymbol, outcome, type GridGame } from './grid'

/** État commun (props de shape) d'un jeu à deux joueurs sur une grille. */
export interface BoardGameState<S extends string> {
  readonly cells: string
  readonly next: S
  readonly players: Readonly<Record<S, { id: string; name: string }>>
  readonly winner: S | 'draw' | ''
  readonly winLine: string
}

export type MoveTarget = { kind: 'cell'; index: number } | { kind: 'column'; column: number }

export interface BoardGameRules<S extends string> {
  readonly game: GridGame<S>
  /** Index de la case jouée pour une cible (puissance 4 : gravité), ou null si illégal. */
  resolveTarget(cells: string, target: MoveTarget): number | null
}

export function initialState<S extends string>(
  rules: BoardGameRules<S>,
  players?: BoardGameState<S>['players'],
): BoardGameState<S> {
  const [a, b] = rules.game.symbols
  const empty = { id: '', name: '' }
  return {
    cells: emptyCells(rules.game.rows, rules.game.cols),
    next: a,
    players: players ?? ({ [a]: empty, [b]: empty } as BoardGameState<S>['players']),
    winner: '',
    winLine: '',
  }
}

/** Applique un coup ; renvoie null si le coup est illégal pour cet utilisateur. */
export function applyMove<S extends string>(
  rules: BoardGameRules<S>,
  state: BoardGameState<S>,
  userId: string,
  target: MoveTarget,
): BoardGameState<S> | null {
  if (state.winner !== '') return null
  if (state.players[state.next].id !== userId) return null
  const index = rules.resolveTarget(state.cells, target)
  if (index === null || state.cells[index] !== EMPTY) return null
  const cells = state.cells.slice(0, index) + state.next + state.cells.slice(index + 1)
  const { winner, winLine } = outcome(rules.game, cells)
  return { ...state, cells, next: otherSymbol(rules.game, state.next), winner, winLine }
}

/** Prend une place libre (un joueur ne peut pas occuper les deux). */
export function claimSeat<S extends string>(
  state: BoardGameState<S>,
  seat: S,
  user: { id: string; name: string },
): BoardGameState<S> | null {
  if (state.players[seat].id !== '') return null
  if (Object.values<{ id: string }>(state.players).some((p) => p.id === user.id)) return null
  return { ...state, players: { ...state.players, [seat]: { id: user.id, name: user.name } } }
}

export type TransitionKind = 'move' | 'claim' | 'reset' | 'none'

/**
 * Validation serveur d'une transition d'état reçue d'un client : elle doit correspondre
 * exactement à un coup légal, une prise de place, une remise à zéro, ou ne rien changer.
 */
export function classifyTransition<S extends string>(
  rules: BoardGameRules<S>,
  prev: BoardGameState<S>,
  next: BoardGameState<S>,
  user: { id: string; name: string },
): TransitionKind | null {
  if (sameState(prev, next)) return 'none'

  // Remise à zéro de la grille (joueurs conservés) ou complète.
  const freshKeep = initialState(rules, prev.players)
  if (sameState(next, freshKeep) || sameState(next, initialState(rules))) return 'reset'

  // Prise de place.
  for (const seat of rules.game.symbols) {
    const claimed = claimSeat(prev, seat, user)
    if (claimed && sameState(claimed, next)) return 'claim'
  }

  // Coup : on retrouve la case jouée et on rejoue la règle.
  const diff = [...next.cells].findIndex((c, i) => c !== prev.cells[i])
  if (diff >= 0) {
    const target: MoveTarget =
      rules.game.cols === 3
        ? { kind: 'cell', index: diff }
        : { kind: 'column', column: diff % rules.game.cols }
    const expected = applyMove(rules, prev, user.id, target)
    if (expected && sameState(expected, next)) return 'move'
  }
  return null
}

function sameState<S extends string>(a: BoardGameState<S>, b: BoardGameState<S>): boolean {
  if (a.cells !== b.cells || a.next !== b.next || a.winner !== b.winner || a.winLine !== b.winLine)
    return false
  const seats = Object.keys(a.players) as S[]
  return seats.every(
    (s) => a.players[s].id === b.players[s]?.id && a.players[s].name === b.players[s]?.name,
  )
}
