import { generateId, generateSignupCode, normalizeSignupCode, sha256 } from '../lib/crypto'
import type { SignupCodeRepository } from '../repositories/signupCodeRepository'

export class SignupCodeService {
  constructor(private readonly codes: SignupCodeRepository) {}

  /** Crée un code et le renvoie en clair une seule fois (seul son hash est stocké). */
  create(opts: { maxUses: number; expiresInDays?: number; note?: string; code?: string }): string {
    const code = opts.code ? normalizeSignupCode(opts.code) : generateSignupCode()
    this.codes.create({
      id: generateId(),
      codeHash: sha256(code),
      maxUses: opts.maxUses,
      note: opts.note ?? null,
      expiresAt: opts.expiresInDays ? new Date(Date.now() + opts.expiresInDays * 86_400_000) : null,
    })
    return code
  }
}
