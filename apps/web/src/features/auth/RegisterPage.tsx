import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { registerInputSchema } from '@canvas/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { AuthLayout, FormError } from './AuthLayout'
import { safeNext } from './safeNext'
import { useRegister } from './useAuth'

export function RegisterPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const register = useRegister()
  const [error, setError] = useState<string>()
  const next = safeNext(params.get('next'))

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsed = registerInputSchema.safeParse({
      username: form.get('username'),
      password: form.get('password'),
      signupCode: form.get('signupCode'),
    })
    if (!parsed.success) {
      return setError(parsed.error.issues[0]?.message ?? 'Formulaire invalide')
    }
    if (form.get('password') !== form.get('confirm'))
      return setError('Les mots de passe ne correspondent pas')
    setError(undefined)
    register.mutate(parsed.data, {
      onSuccess: () => navigate(next, { replace: true }),
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Inscription impossible'),
    })
  }

  return (
    <AuthLayout title="Rejoindre Canvas" subtitle="Sur invitation uniquement ✨">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="signupCode">Code d’invitation</Label>
          <Input
            id="signupCode"
            name="signupCode"
            defaultValue={params.get('code') ?? ''}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            className="font-mono uppercase"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Pseudo</Label>
          <Input id="username" name="username" autoComplete="username" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe (10 caractères min.)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmation</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={register.isPending}>
          Créer mon compte
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link
            className="font-medium text-primary hover:underline"
            to={`/login?next=${encodeURIComponent(next)}`}
          >
            Se connecter
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
