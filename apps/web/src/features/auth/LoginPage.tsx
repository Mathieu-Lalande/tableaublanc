import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { loginInputSchema } from '@canvas/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { AuthLayout, FormError } from './AuthLayout'
import { safeNext } from './safeNext'
import { useLogin } from './useAuth'

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const [error, setError] = useState<string>()
  const next = safeNext(params.get('next'))

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsed = loginInputSchema.safeParse({
      username: form.get('username'),
      password: form.get('password'),
    })
    if (!parsed.success) return setError('Pseudo ou mot de passe invalide')
    setError(undefined)
    login.mutate(parsed.data, {
      onSuccess: () => navigate(next, { replace: true }),
      onError: (err) =>
        setError(
          err instanceof ApiError && err.status === 429
            ? err.message
            : 'Pseudo ou mot de passe incorrect',
        ),
    })
  }

  return (
    <AuthLayout title="Canvas" subtitle="Content de te revoir 👋">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="username">Pseudo</Label>
          <Input id="username" name="username" autoComplete="username" autoFocus required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          Se connecter
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Un code d’invitation ?{' '}
          <Link
            className="font-medium text-primary hover:underline"
            to={`/register?next=${encodeURIComponent(next)}`}
          >
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
