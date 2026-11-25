import { hash, verify } from '@node-rs/argon2'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins/username'
import type { Env } from '../config/env'
import type { Db } from '../db/client'
import { authSchema } from '../db/schema'

/**
 * Paramètres Argon2id recommandés par l'OWASP Password Storage Cheat Sheet
 * (m = 19 MiB, t = 2, p = 1). @node-rs/argon2 utilise Argon2id par défaut.
 */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(data.hash, data.password)
  } catch {
    return false
  }
}

export function createAuth(db: Db, env: Env) {
  const isProd = env.NODE_ENV === 'production'
  return betterAuth({
    appName: 'Canvas',
    baseURL: env.PUBLIC_ORIGIN,
    basePath: '/api/auth',
    secret: env.AUTH_SECRET ?? 'dev-only-secret-dev-only-secret-dev-only',
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    trustedOrigins: [env.PUBLIC_ORIGIN],
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    user: {
      additionalFields: {
        color: { type: 'string', required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 32,
        usernameValidator: (value) => USERNAME_PATTERN.test(value),
      }),
    ],
    // Pas d'inscription publique ni de flux email : l'inscription passe par notre route
    // /api/account/register qui vérifie d'abord le code d'invitation.
    disabledPaths: [
      '/sign-up/email',
      '/sign-in/email',
      '/request-password-reset',
      '/reset-password',
      '/send-verification-email',
      '/verify-email',
      '/change-email',
    ],
    rateLimit: {
      enabled: env.NODE_ENV !== 'test',
      window: 60,
      max: 60 * env.RATE_LIMIT_MULTIPLIER,
      customRules: {
        '/sign-in/username': { window: 60, max: 5 * env.RATE_LIMIT_MULTIPLIER },
      },
    },
    advanced: {
      useSecureCookies: isProd,
      cookiePrefix: 'canvas',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' },
      // En production, seul l'en-tête écrasé par le reverse proxy est digne de confiance.
      ipAddress: { ipAddressHeaders: isProd ? [env.CLIENT_IP_HEADER] : ['x-forwarded-for'] },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
