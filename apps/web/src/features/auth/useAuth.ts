import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginInput, Me, RegisterInput, UpdateMeInput } from '@canvas/shared'
import { ApiError } from '@/lib/api'
import { authApi } from './authApi'

export const ME_KEY = ['me'] as const

/** Utilisateur courant ; `null` si non connecté. */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await authApi.me()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(ME_KEY, null)
    },
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMeInput) => authApi.updateMe(input),
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
  })
}
