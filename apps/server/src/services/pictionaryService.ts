import { randomInt } from 'node:crypto'
import type { TLRecord, TLShape } from '@tldraw/tlschema'
import {
  isCorrectGuess,
  maskWord,
  PICTIONARY_ROUND_MS,
  PICTIONARY_TYPE,
  PICTIONARY_WORDS,
  type PictionaryProps,
} from '@canvas/shared'
import { AppError, notFound } from '../lib/errors'
import type { BoardService } from './boardService'

type PictionaryShape = TLShape<typeof PICTIONARY_TYPE>

/** Accès aux rooms nécessaire au jeu (écritures serveur + messages ciblés). */
export interface PictionaryRoomGateway {
  getRecord(boardId: string, id: string): TLRecord | undefined
  updateRecord(
    boardId: string,
    id: string,
    updater: (record: TLRecord) => TLRecord,
  ): Promise<boolean>
  broadcast(boardId: string, data: unknown): void
}

interface Round {
  readonly word: string
  readonly drawerId: string
  readonly timer: NodeJS.Timeout
}

export interface PictionaryUser {
  readonly id: string
  readonly name: string
}

/**
 * Pictionary géré côté serveur : le mot secret ne quitte le serveur que vers le dessinateur,
 * et seul le serveur modifie l'état public de la manche (shape `pictionary`).
 * Compromis : l'état des manches est en mémoire (perdu au redémarrage du serveur).
 */
export class PictionaryService {
  private readonly rounds = new Map<string, Round>()

  constructor(
    private readonly rooms: PictionaryRoomGateway,
    private readonly boards: BoardService,
    private readonly opts: {
      readonly now?: () => number
      readonly pickWord?: () => string
      readonly roundMs?: number
    } = {},
  ) {}

  private now(): number {
    return this.opts.now?.() ?? Date.now()
  }

  async start(boardId: string, shapeId: string, user: PictionaryUser): Promise<{ word: string }> {
    this.boards.requireRole(boardId, user.id, 'EDITOR')
    const shape = this.getShape(boardId, shapeId)
    const key = this.key(boardId, shapeId)
    if (shape.props.status === 'drawing' && this.rounds.has(key)) {
      throw new AppError(409, 'Une manche est déjà en cours')
    }
    const word =
      this.opts.pickWord?.() ?? PICTIONARY_WORDS[randomInt(PICTIONARY_WORDS.length)] ?? 'chat'
    const roundMs = this.opts.roundMs ?? PICTIONARY_ROUND_MS
    const endsAt = this.now() + roundMs
    this.clear(key)
    const timer = setTimeout(() => void this.finish(boardId, shapeId, 'timeout'), roundMs)
    timer.unref()
    this.rounds.set(key, { word, drawerId: user.id, timer })
    await this.write(boardId, shapeId, (p) => ({
      ...p,
      status: 'drawing',
      round: p.round + 1,
      drawerId: user.id,
      drawerName: user.name,
      hint: maskWord(word),
      endsAt,
      revealedWord: '',
      winnerName: '',
    }))
    return { word }
  }

  /** Le mot n'est communiqué qu'au dessinateur de la manche en cours. */
  word(boardId: string, shapeId: string, userId: string): { word: string } {
    this.boards.requireRole(boardId, userId, 'VIEWER')
    const round = this.rounds.get(this.key(boardId, shapeId))
    if (!round || round.drawerId !== userId) throw new AppError(403, 'Accès refusé')
    return { word: round.word }
  }

  async guess(
    boardId: string,
    shapeId: string,
    user: PictionaryUser,
    guess: string,
  ): Promise<{ correct: boolean }> {
    // Les lecteurs peuvent deviner : la proposition passe par l'API, pas par le document.
    this.boards.requireRole(boardId, user.id, 'VIEWER')
    const round = this.rounds.get(this.key(boardId, shapeId))
    if (!round) throw new AppError(409, 'Aucune manche en cours')
    if (round.drawerId === user.id) throw new AppError(400, 'Le dessinateur ne peut pas deviner')
    if (!isCorrectGuess(guess, round.word)) return { correct: false }
    await this.finish(boardId, shapeId, 'solved', user.name)
    return { correct: true }
  }

  async skip(boardId: string, shapeId: string, userId: string): Promise<void> {
    this.boards.requireRole(boardId, userId, 'EDITOR')
    const round = this.rounds.get(this.key(boardId, shapeId))
    if (!round) throw new AppError(409, 'Aucune manche en cours')
    await this.finish(boardId, shapeId, 'timeout')
  }

  dispose(): void {
    for (const key of [...this.rounds.keys()]) this.clear(key)
  }

  private async finish(
    boardId: string,
    shapeId: string,
    status: 'solved' | 'timeout',
    winnerName = '',
  ): Promise<void> {
    const key = this.key(boardId, shapeId)
    const round = this.rounds.get(key)
    if (!round) return
    this.clear(key)
    await this.write(boardId, shapeId, (p) => ({
      ...p,
      status,
      endsAt: 0,
      revealedWord: round.word,
      winnerName,
    }))
    this.rooms.broadcast(boardId, {
      type: 'pictionary:end',
      shapeId,
      status,
      winnerName,
      word: round.word,
    })
  }

  private clear(key: string): void {
    const round = this.rounds.get(key)
    if (round) clearTimeout(round.timer)
    this.rounds.delete(key)
  }

  private getShape(boardId: string, shapeId: string): PictionaryShape {
    const record = this.rooms.getRecord(boardId, shapeId)
    if (!record || record.typeName !== 'shape' || record.type !== PICTIONARY_TYPE) {
      // Room non chargée (personne connecté) ou shape inexistante.
      throw notFound()
    }
    return record as PictionaryShape
  }

  private async write(
    boardId: string,
    shapeId: string,
    update: (p: PictionaryProps) => PictionaryProps,
  ): Promise<void> {
    await this.rooms.updateRecord(boardId, shapeId, (record) => {
      if (record.typeName !== 'shape' || record.type !== PICTIONARY_TYPE) return record
      return { ...record, props: update(record.props) }
    })
  }

  private key(boardId: string, shapeId: string): string {
    return `${boardId}:${shapeId}`
  }
}
