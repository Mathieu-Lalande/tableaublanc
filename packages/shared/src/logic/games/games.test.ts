import { describe, expect, it } from 'vitest'
import {
  applyMove,
  claimSeat,
  classifyTransition,
  initialState,
  type BoardGameState,
} from './boardGame'
import { connect4Rules, type Connect4Symbol } from './connect4'
import { findWinner } from './grid'
import { isCorrectGuess, maskWord, normalizeGuess } from './pictionary'
import { ticTacToeRules, type TicTacToeSymbol } from './tictactoe'

const alice = { id: 'alice', name: 'Alice' }
const bob = { id: 'bob', name: 'Bob' }
const eve = { id: 'eve', name: 'Eve' }

function seatedTtt(): BoardGameState<TicTacToeSymbol> {
  const s0 = initialState(ticTacToeRules)
  const s1 = claimSeat(s0, 'X', alice)
  const s2 = s1 && claimSeat(s1, 'O', bob)
  if (!s2) throw new Error('setup')
  return s2
}

function play(state: BoardGameState<TicTacToeSymbol>, moves: Array<[string, number]>) {
  let s: BoardGameState<TicTacToeSymbol> | null = state
  for (const [user, index] of moves) {
    s = s && applyMove(ticTacToeRules, s, user, { kind: 'cell', index })
  }
  return s
}

describe('Morpion', () => {
  it('alterne les tours et détecte la victoire', () => {
    const s = play(seatedTtt(), [
      ['alice', 0],
      ['bob', 3],
      ['alice', 1],
      ['bob', 4],
      ['alice', 2],
    ])
    expect(s?.winner).toBe('X')
    expect(s?.winLine).toBe('0,1,2')
  })

  it('refuse de jouer hors de son tour ou sur une case prise', () => {
    const s = seatedTtt()
    expect(applyMove(ticTacToeRules, s, 'bob', { kind: 'cell', index: 0 })).toBeNull()
    const s1 = applyMove(ticTacToeRules, s, 'alice', { kind: 'cell', index: 0 })
    expect(s1 && applyMove(ticTacToeRules, s1, 'bob', { kind: 'cell', index: 0 })).toBeNull()
  })

  it('refuse un spectateur et un coup après la fin', () => {
    expect(applyMove(ticTacToeRules, seatedTtt(), 'eve', { kind: 'cell', index: 0 })).toBeNull()
    const won = play(seatedTtt(), [
      ['alice', 0],
      ['bob', 3],
      ['alice', 1],
      ['bob', 4],
      ['alice', 2],
    ])
    expect(won && applyMove(ticTacToeRules, won, 'bob', { kind: 'cell', index: 5 })).toBeNull()
  })

  it('détecte le match nul', () => {
    const s = play(seatedTtt(), [
      ['alice', 0],
      ['bob', 1],
      ['alice', 2],
      ['bob', 4],
      ['alice', 3],
      ['bob', 5],
      ['alice', 7],
      ['bob', 6],
      ['alice', 8],
    ])
    expect(s?.winner).toBe('draw')
  })

  it('un joueur ne peut pas occuper les deux places', () => {
    const s = claimSeat(initialState(ticTacToeRules), 'X', alice)
    expect(s && claimSeat(s, 'O', alice)).toBeNull()
  })
})

describe('Puissance 4', () => {
  const seated = (): BoardGameState<Connect4Symbol> => {
    const s = claimSeat(initialState(connect4Rules), 'R', alice)
    const s2 = s && claimSeat(s, 'Y', bob)
    if (!s2) throw new Error('setup')
    return s2
  }

  it('fait tomber les pions au fond de la colonne', () => {
    const s1 = applyMove(connect4Rules, seated(), 'alice', { kind: 'column', column: 3 })
    expect(s1?.cells[5 * 7 + 3]).toBe('R')
    const s2 = s1 && applyMove(connect4Rules, s1, 'bob', { kind: 'column', column: 3 })
    expect(s2?.cells[4 * 7 + 3]).toBe('Y')
  })

  it('détecte un alignement vertical de 4', () => {
    let s: BoardGameState<Connect4Symbol> | null = seated()
    for (const [u, c] of [
      ['alice', 0],
      ['bob', 1],
      ['alice', 0],
      ['bob', 1],
      ['alice', 0],
      ['bob', 1],
      ['alice', 0],
    ] as const) {
      s = s && applyMove(connect4Rules, s, u, { kind: 'column', column: c })
    }
    expect(s?.winner).toBe('R')
  })

  it('refuse une colonne pleine', () => {
    let s: BoardGameState<Connect4Symbol> | null = seated()
    const users = ['alice', 'bob']
    for (let i = 0; i < 6; i++)
      s = s && applyMove(connect4Rules, s, users[i % 2] ?? '', { kind: 'column', column: 0 })
    expect(s && applyMove(connect4Rules, s, 'alice', { kind: 'column', column: 0 })).toBeNull()
  })

  it('détecte une diagonale', () => {
    const cells = '.'.repeat(42).split('')
    for (const i of [35, 29, 23, 17]) cells[i] = 'Y'
    expect(findWinner(connect4Rules.game, cells.join(''))?.winner).toBe('Y')
  })
})

describe('Validation serveur des transitions (anti-triche)', () => {
  it('accepte un coup légal du bon joueur', () => {
    const prev = seatedTtt()
    const next = applyMove(ticTacToeRules, prev, 'alice', { kind: 'cell', index: 4 })
    expect(next && classifyTransition(ticTacToeRules, prev, next, alice)).toBe('move')
  })

  it('refuse le même coup envoyé par un autre utilisateur', () => {
    const prev = seatedTtt()
    const next = applyMove(ticTacToeRules, prev, 'alice', { kind: 'cell', index: 4 })
    expect(next && classifyTransition(ticTacToeRules, prev, next, eve)).toBeNull()
  })

  it('refuse deux coups d’un coup ou une victoire inventée', () => {
    const prev = seatedTtt()
    const twoMoves = { ...prev, cells: 'XX.......', next: 'O' as const }
    expect(classifyTransition(ticTacToeRules, prev, twoMoves, alice)).toBeNull()
    const fakeWin = { ...prev, winner: 'X' as const }
    expect(classifyTransition(ticTacToeRules, prev, fakeWin, alice)).toBeNull()
  })

  it('accepte prise de place et remise à zéro', () => {
    const s0 = initialState(ticTacToeRules)
    const claimed = claimSeat(s0, 'X', eve)
    expect(claimed && classifyTransition(ticTacToeRules, s0, claimed, eve)).toBe('claim')
    // Usurpation : prendre la place au nom de quelqu'un d'autre.
    expect(claimed && classifyTransition(ticTacToeRules, s0, claimed, alice)).toBeNull()
    const played = applyMove(ticTacToeRules, seatedTtt(), 'alice', { kind: 'cell', index: 0 })
    expect(
      played &&
        classifyTransition(
          ticTacToeRules,
          played,
          initialState(ticTacToeRules, played.players),
          bob,
        ),
    ).toBe('reset')
  })

  it('valide aussi les coups du puissance 4', () => {
    const s = claimSeat(initialState(connect4Rules), 'R', alice)
    const prev = s && claimSeat(s, 'Y', bob)
    const next = prev && applyMove(connect4Rules, prev, 'alice', { kind: 'column', column: 2 })
    expect(prev && next && classifyTransition(connect4Rules, prev, next, alice)).toBe('move')
    // Pion « flottant » (pas en bas de colonne) refusé.
    if (prev) {
      const floating = { ...prev, cells: 'R' + prev.cells.slice(1), next: 'Y' as const }
      expect(classifyTransition(connect4Rules, prev, floating, alice)).toBeNull()
    }
  })
})

describe('Pictionary', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(normalizeGuess('  Éléphant !')).toBe('elephant')
    expect(isCorrectGuess('arc en ciel', 'arc-en-ciel')).toBe(true)
    expect(isCorrectGuess('', 'chat')).toBe(false)
    expect(isCorrectGuess('chats', 'chat')).toBe(false)
  })
  it('masque le mot sans révéler de lettres', () => {
    expect(maskWord('tour eiffel')).toBe('_ _ _ _   _ _ _ _ _ _')
    expect(maskWord('cerf-volant')).not.toMatch(/[a-z]/)
  })
})
