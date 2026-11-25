import { fileTypeFromBuffer } from 'file-type'
import { generateId } from '../lib/crypto'
import { AppError, notFound } from '../lib/errors'
import type { AssetRepository } from '../repositories/assetRepository'
import type { AssetStorage } from './assetStorage'
import type { BoardService } from './boardService'

/** Types autorisés, détectés depuis les octets (magic numbers), jamais depuis le nom ou l'en-tête. */
const ALLOWED_IMAGE_TYPES: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export interface StoredAsset {
  readonly path: string
  readonly mime: string
  readonly size: number
}

export class AssetService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly boards: BoardService,
    private readonly storage: AssetStorage,
    private readonly maxBytes: number,
  ) {}

  async upload(
    boardId: string,
    userId: string,
    data: Buffer,
    kind: 'image' | 'thumbnail' = 'image',
  ): Promise<{ id: string; src: string }> {
    this.boards.requireRole(boardId, userId, 'EDITOR')
    const limit = kind === 'thumbnail' ? Math.min(this.maxBytes, 2 * 1024 * 1024) : this.maxBytes
    if (data.byteLength === 0) throw new AppError(400, 'Fichier vide')
    if (data.byteLength > limit) throw new AppError(413, 'Fichier trop volumineux')

    const detected = await fileTypeFromBuffer(data)
    const ext = detected ? ALLOWED_IMAGE_TYPES[detected.mime] : undefined
    if (!detected || !ext) throw new AppError(415, 'Type de fichier non autorisé')

    const id = generateId()
    const fileName = `${id}.${ext}`
    await this.storage.write(fileName, data)
    this.assets.create({
      id,
      boardId,
      uploaderId: userId,
      kind,
      mime: detected.mime,
      size: data.byteLength,
      fileName,
    })
    if (kind === 'thumbnail') this.boards.setThumbnail(boardId, id)
    return { id, src: `/api/assets/${id}` }
  }

  /** Renvoie le fichier si l'utilisateur est membre du board de l'asset. */
  resolve(assetId: string, userId: string): StoredAsset {
    const row = this.assets.findById(assetId)
    if (!row) throw notFound()
    this.boards.requireRole(row.boardId, userId, 'VIEWER')
    return { path: this.storage.pathOf(row.fileName), mime: row.mime, size: row.size }
  }
}
