import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5858),
  /** Dossier persistant : app.db, rooms/, assets/. */
  DATA_DIR: z.string().default('./data'),
  /** Origine publique de l'app (ex. https://canvas.example.com). Sert à CORS/CSRF/WS. */
  PUBLIC_ORIGIN: z.url().default('http://localhost:5173'),
  /** Secret Better Auth (>= 32 caractères). Obligatoire en production. */
  AUTH_SECRET: z.string().min(32).optional(),
  /** Dossier du front buildé, servi en statique en production. */
  WEB_DIST_DIR: z.string().optional(),
  /** Taille max d'upload d'image en octets. */
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  /** Multiplicateur des limites de débit (tests e2e uniquement ; refusé en production). */
  RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
  /** En-tête portant l'IP client, posé (et écrasé) par le reverse proxy. Caddy : x-real-ip. */
  CLIENT_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default('x-real-ip'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    // On n'affiche que les noms de variables fautives, jamais leurs valeurs.
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Configuration invalide : ${fields}`)
  }
  const env = parsed.data
  if (env.NODE_ENV === 'production' && !env.AUTH_SECRET) {
    throw new Error('Configuration invalide : AUTH_SECRET est obligatoire en production')
  }
  if (env.NODE_ENV === 'production' && env.RATE_LIMIT_MULTIPLIER !== 1) {
    throw new Error('Configuration invalide : RATE_LIMIT_MULTIPLIER doit valoir 1 en production')
  }
  return env
}
