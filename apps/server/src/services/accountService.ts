import { randomUUID } from 'node:crypto'
import { APIError } from 'better-auth/api'
import type { Me, RegisterInput, UpdateMeInput } from '@canvas/shared'
import type { Auth } from '../auth/auth'
import { normalizeSignupCode, sha256 } from '../lib/crypto'
import { AppError } from '../lib/errors'
import type { SignupCodeRepository } from '../repositories/signupCodeRepository'
import type { UserRepository } from '../repositories/userRepository'
import { pickUserColor } from './userColors'

/** Domaine réservé (RFC 2606) : l'email technique exigé par Better Auth n'est jamais routable. */
const TECHNICAL_EMAIL_DOMAIN = 'users.canvas.invalid'

export class AccountService {
  constructor(
    private readonly auth: Auth,
    private readonly signupCodes: SignupCodeRepository,
    private readonly users: UserRepository,
  ) {}

  /**
   * Inscription sur code d'invitation. Retourne la réponse Better Auth (qui porte le cookie
   * de session) pour que la route la relaie telle quelle.
   */
  async register(input: RegisterInput, headers: Headers): Promise<Response> {
    const code = this.signupCodes.findByHash(sha256(normalizeSignupCode(input.signupCode)))
    const invalid = new AppError(400, "Code d'invitation invalide ou expiré")
    if (!code || (code.expiresAt && code.expiresAt <= new Date())) throw invalid
    if (!this.signupCodes.reserve(code.id)) throw invalid

    try {
      const response = await this.auth.api.signUpEmail({
        body: {
          email: `${randomUUID()}@${TECHNICAL_EMAIL_DOMAIN}`,
          password: input.password,
          name: input.username,
          username: input.username,
        },
        headers,
        asResponse: true,
      })
      if (!response.ok) {
        this.signupCodes.release(code.id)
        if (response.status === 400 || response.status === 422) {
          throw new AppError(409, 'Ce pseudo est indisponible')
        }
        throw new AppError(400, 'Inscription impossible')
      }
      const body = (await response.clone().json()) as { user?: { id?: string } }
      if (body.user?.id) this.users.setColor(body.user.id, pickUserColor(body.user.id))
      return response
    } catch (err) {
      if (err instanceof AppError) throw err
      this.signupCodes.release(code.id)
      if (err instanceof APIError) throw new AppError(409, 'Ce pseudo est indisponible')
      throw err
    }
  }

  getMe(userId: string): Me {
    const row = this.users.findById(userId)
    if (!row) throw new AppError(401, 'Authentification requise')
    return {
      id: row.id,
      username: row.displayUsername ?? row.username ?? row.name,
      color: row.color ?? pickUserColor(row.id),
    }
  }

  updateMe(userId: string, input: UpdateMeInput): Me {
    if (input.color) this.users.setColor(userId, input.color)
    if (input.displayName) this.users.setDisplayName(userId, input.displayName)
    return this.getMe(userId)
  }
}
