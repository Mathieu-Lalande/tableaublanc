import {
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  type RecordProps,
  type TLDefaultColorStyle,
  type TLShape,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import type { BoardGameRules, BoardGameState } from '../../logic/games/boardGame'
import type { Connect4Symbol } from '../../logic/games/connect4'
import type { TicTacToeSymbol } from '../../logic/games/tictactoe'

export const DICE_TYPE = 'dice'
export const TIMER_TYPE = 'timer'
export const SCOREBOARD_TYPE = 'scoreboard'
export const PICTIONARY_TYPE = 'pictionary'
export const TICTACTOE_TYPE = 'tictactoe'
export const CONNECT4_TYPE = 'connect4'

export interface DiceProps {
  w: number
  h: number
  value: number
  rollId: string
  color: TLDefaultColorStyle
}

export interface TimerProps {
  w: number
  h: number
  label: string
  durationMs: number
  /** Heure serveur de fin quand le minuteur tourne, 0 sinon. */
  endsAt: number
  /** Temps restant quand il est en pause. */
  remainingMs: number
  running: boolean
}

export interface ScoreboardPlayer {
  id: string
  name: string
  score: number
  color: string
}

export interface ScoreboardProps {
  w: number
  h: number
  title: string
  players: ScoreboardPlayer[]
}

export type PictionaryStatus = 'idle' | 'drawing' | 'solved' | 'timeout'

/** État public d'une manche : écrit uniquement par le serveur (le mot n'y figure jamais en cours de manche). */
export interface PictionaryProps {
  w: number
  h: number
  status: PictionaryStatus
  round: number
  drawerId: string
  drawerName: string
  hint: string
  endsAt: number
  revealedWord: string
  winnerName: string
}

interface BoardGameProps<S extends string> {
  w: number
  h: number
  cells: string
  next: S
  playerAId: string
  playerAName: string
  playerBId: string
  playerBName: string
  winner: S | 'draw' | ''
  winLine: string
}

export type TicTacToeProps = BoardGameProps<TicTacToeSymbol>
export type Connect4Props = BoardGameProps<Connect4Symbol>

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    [DICE_TYPE]: DiceProps
    [TIMER_TYPE]: TimerProps
    [SCOREBOARD_TYPE]: ScoreboardProps
    [PICTIONARY_TYPE]: PictionaryProps
    [TICTACTOE_TYPE]: TicTacToeProps
    [CONNECT4_TYPE]: Connect4Props
  }
}

const size = { w: T.nonZeroNumber, h: T.nonZeroNumber }

export const diceProps: RecordProps<TLShape<typeof DICE_TYPE>> = {
  ...size,
  value: T.integer,
  rollId: T.string,
  color: DefaultColorStyle,
}

export const timerProps: RecordProps<TLShape<typeof TIMER_TYPE>> = {
  ...size,
  label: T.string,
  durationMs: T.positiveNumber,
  endsAt: T.number,
  remainingMs: T.number,
  running: T.boolean,
}

export const scoreboardProps: RecordProps<TLShape<typeof SCOREBOARD_TYPE>> = {
  ...size,
  title: T.string,
  players: T.arrayOf(T.object({ id: T.string, name: T.string, score: T.number, color: T.string })),
}

export const pictionaryProps: RecordProps<TLShape<typeof PICTIONARY_TYPE>> = {
  ...size,
  status: T.literalEnum('idle', 'drawing', 'solved', 'timeout'),
  round: T.integer,
  drawerId: T.string,
  drawerName: T.string,
  hint: T.string,
  endsAt: T.number,
  revealedWord: T.string,
  winnerName: T.string,
}

const boardGameFields = {
  ...size,
  cells: T.string,
  playerAId: T.string,
  playerAName: T.string,
  playerBId: T.string,
  playerBName: T.string,
  winLine: T.string,
}

export const ticTacToeProps: RecordProps<TLShape<typeof TICTACTOE_TYPE>> = {
  ...boardGameFields,
  next: T.literalEnum('X', 'O'),
  winner: T.literalEnum('', 'X', 'O', 'draw'),
}

export const connect4Props: RecordProps<TLShape<typeof CONNECT4_TYPE>> = {
  ...boardGameFields,
  next: T.literalEnum('R', 'Y'),
  winner: T.literalEnum('', 'R', 'Y', 'draw'),
}

export const gameMigrations = createShapePropsMigrationSequence({ sequence: [] })

/** Conversion props de shape ⇄ état logique d'un jeu de grille. */
export function propsToGameState<S extends string>(
  rules: BoardGameRules<S>,
  p: BoardGameProps<S>,
): BoardGameState<S> {
  const [a, b] = rules.game.symbols
  return {
    cells: p.cells,
    next: p.next,
    winner: p.winner,
    winLine: p.winLine,
    players: {
      [a]: { id: p.playerAId, name: p.playerAName },
      [b]: { id: p.playerBId, name: p.playerBName },
    } as BoardGameState<S>['players'],
  }
}

export function gameStateToProps<S extends string>(
  rules: BoardGameRules<S>,
  s: BoardGameState<S>,
): Omit<BoardGameProps<S>, 'w' | 'h'> {
  const [a, b] = rules.game.symbols
  return {
    cells: s.cells,
    next: s.next,
    winner: s.winner,
    winLine: s.winLine,
    playerAId: s.players[a].id,
    playerAName: s.players[a].name,
    playerBId: s.players[b].id,
    playerBName: s.players[b].name,
  }
}
