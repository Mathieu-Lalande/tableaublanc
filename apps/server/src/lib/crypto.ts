import { createHash, randomBytes, randomUUID } from 'node:crypto'

/** Token aléatoire cryptographique (256 bits) encodé en base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/** Identifiant opaque compatible avec `boardIdSchema` ([a-zA-Z0-9_-]). */
export function generateId(): string {
  return randomUUID()
}

/** Code d'inscription lisible : 4 groupes de 4 caractères sans ambiguïté (≈ 80 bits). */
export function generateSignupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(16)
  let out = ''
  for (let i = 0; i < 16; i++) {
    const byte = bytes[i] ?? 0
    out += alphabet[byte % alphabet.length]
    if (i % 4 === 3 && i < 15) out += '-'
  }
  return out
}

/** Normalisation avant hash : insensible à la casse et aux espaces. */
export function normalizeSignupCode(code: string): string {
  return code.trim().toUpperCase()
}
