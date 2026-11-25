import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { openDatabase } from '../db/client'
import { SignupCodeRepository } from '../repositories/signupCodeRepository'
import { SignupCodeService } from '../services/signupCodeService'

const USAGE = `Usage :
  pnpm --filter @canvas/server admin create-code [--uses 1] [--days 7] [--note "pour Léa"]
  pnpm --filter @canvas/server admin list-codes`

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    uses: { type: 'string', default: '1' },
    days: { type: 'string', default: '7' },
    note: { type: 'string' },
  },
})

const dataDir = resolve(process.env.DATA_DIR ?? './data')
const { sqlite, db } = openDatabase(join(dataDir, 'app.db'))
const repo = new SignupCodeRepository(db)

try {
  switch (positionals[0]) {
    case 'create-code': {
      const uses = Number.parseInt(values.uses, 10)
      const days = Number.parseInt(values.days, 10)
      if (!Number.isInteger(uses) || uses < 1 || uses > 100)
        throw new Error('--uses doit être entre 1 et 100')
      if (!Number.isInteger(days) || days < 1 || days > 365)
        throw new Error('--days doit être entre 1 et 365')
      const code = new SignupCodeService(repo).create({
        maxUses: uses,
        expiresInDays: days,
        ...(values.note ? { note: values.note } : {}),
      })
      console.log(`Code d'inscription (affiché une seule fois) : ${code}`)
      console.log(`Utilisations : ${uses} — expire dans ${days} jour(s)`)
      break
    }
    case 'list-codes':
      for (const c of repo.list()) {
        console.log(
          `${c.id}  ${c.uses}/${c.maxUses}  expire: ${c.expiresAt?.toISOString() ?? 'jamais'}  ${c.note ?? ''}`,
        )
      }
      break
    default:
      console.log(USAGE)
      process.exitCode = 1
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  sqlite.close()
}
