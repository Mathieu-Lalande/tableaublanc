import type { FastifyError, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { AppError } from '../../lib/errors'

export interface SecurityOptions {
  readonly publicOrigin: string
  readonly isTest: boolean
  readonly rateLimitMultiplier: number
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
export const CSRF_HEADER = 'x-canvas-csrf'

const GENERIC_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Requête invalide',
  401: 'Authentification requise',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  406: 'Requête invalide',
  413: 'Fichier trop volumineux',
  415: 'Type de fichier non autorisé',
  429: 'Trop de requêtes, réessaie dans un instant',
}

/**
 * En-têtes de sécurité (CSP compatible tldraw), rate limiting global, protection CSRF
 * (vérification d'Origin + en-tête custom) et gestion d'erreurs générique.
 */
async function security(app: FastifyInstance, opts: SecurityOptions): Promise<void> {
  const origin = new URL(opts.publicOrigin)
  const wsOrigin = `${origin.protocol === 'https:' ? 'wss:' : 'ws:'}//${origin.host}`

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // tldraw positionne ses éléments via des styles inline.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", wsOrigin],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        workerSrc: ["'self'", 'blob:'],
        // Embeds tldraw (YouTube, Figma…) : seules des origines https sont autorisées.
        frameSrc: ['https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: origin.protocol === 'https:' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: origin.protocol === 'https:' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  })

  await app.register(rateLimit, {
    global: true,
    max: opts.isTest ? 10_000 : 300 * opts.rateLimitMultiplier,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ statusCode: 429, error: GENERIC_MESSAGES[429] }),
  })

  app.addHook('onRequest', async (req) => {
    if (!MUTATING.has(req.method) || !req.url.startsWith('/api/')) return
    const requestOrigin = req.headers.origin
    const sameOrigin =
      requestOrigin === origin.origin ||
      (!requestOrigin && req.headers['sec-fetch-site'] === 'same-origin')
    // L'en-tête custom impose un preflight CORS aux requêtes cross-site (CORS non activé → bloquées).
    if (!sameOrigin || req.headers[CSRF_HEADER] !== '1') {
      throw new AppError(403, GENERIC_MESSAGES[403] ?? 'Accès refusé')
    }
  })

  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.publicMessage })
    }
    const status = err.statusCode ?? 500
    if (status < 500) {
      return reply.code(status).send({ error: GENERIC_MESSAGES[status] ?? 'Requête invalide' })
    }
    req.log.error({ err }, 'unhandled error')
    return reply.code(500).send({ error: 'Erreur interne' })
  })

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: GENERIC_MESSAGES[404] })
  })
}

export default fp(security, { name: 'canvas-security' })
