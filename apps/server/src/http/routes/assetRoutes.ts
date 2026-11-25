import { createReadStream } from 'node:fs'
import type {} from '@fastify/multipart'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { boardIdSchema } from '@canvas/shared'
import type { Auth } from '../../auth/auth'
import { badRequest } from '../../lib/errors'
import type { AssetService } from '../../services/assetService'
import { currentUser, requireAuth } from '../session'
import { parse } from '../validation'

const boardParams = z.object({ boardId: boardIdSchema })
const assetParams = z.object({ assetId: z.string().uuid() })

export async function assetRoutes(
  app: FastifyInstance,
  opts: { auth: Auth; assets: AssetService },
): Promise<void> {
  app.addHook('preHandler', requireAuth(opts.auth))

  const uploadHandler = (kind: 'image' | 'thumbnail') => async (req: FastifyRequest) => {
    const { boardId } = parse(boardParams, req.params)
    const file = await req.file()
    if (!file) throw badRequest()
    // toBuffer() lève une erreur 413 si la limite de @fastify/multipart est dépassée.
    const data = await file.toBuffer()
    return opts.assets.upload(boardId, currentUser(req).id, data, kind)
  }

  app.post(
    '/api/boards/:boardId/assets',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    uploadHandler('image'),
  )
  app.post(
    '/api/boards/:boardId/thumbnail',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    uploadHandler('thumbnail'),
  )

  app.get('/api/assets/:assetId', async (req, reply) => {
    const { assetId } = parse(assetParams, req.params)
    const asset = opts.assets.resolve(assetId, currentUser(req).id)
    return reply
      .header('content-type', asset.mime)
      .header('content-length', asset.size)
      .header('x-content-type-options', 'nosniff')
      .header('content-security-policy', "default-src 'none'")
      .header('content-disposition', 'inline')
      .header('cross-origin-resource-policy', 'same-origin')
      .header('cache-control', 'private, max-age=31536000, immutable')
      .send(createReadStream(asset.path))
  })
}
