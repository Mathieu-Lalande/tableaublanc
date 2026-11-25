import { mkdirSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AssetRepository } from '../repositories/assetRepository'

/** Stockage disque des assets : noms générés côté serveur, dossier dédié. */
export class AssetStorage {
  constructor(
    private readonly assets: AssetRepository,
    private readonly dir: string,
  ) {
    mkdirSync(dir, { recursive: true })
  }

  async write(fileName: string, data: Buffer): Promise<void> {
    // 'wx' : échoue si le fichier existe déjà (jamais d'écrasement).
    await writeFile(this.pathOf(fileName), data, { flag: 'wx' })
  }

  pathOf(fileName: string): string {
    return join(this.dir, fileName)
  }

  deleteBoardAssets(boardId: string): void {
    for (const row of this.assets.listByBoard(boardId)) {
      rmSync(this.pathOf(row.fileName), { force: true })
    }
  }
}
