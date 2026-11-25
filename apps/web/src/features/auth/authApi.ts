import {
  meSchema,
  type LoginInput,
  type Me,
  type RegisterInput,
  type UpdateMeInput,
} from '@canvas/shared'
import { api, apiVoid } from '@/lib/api'

export const authApi = {
  me: (): Promise<Me> => api('/api/me', meSchema),
  login: (input: LoginInput): Promise<void> =>
    apiVoid('/api/auth/sign-in/username', { method: 'POST', body: input }),
  register: (input: RegisterInput): Promise<void> =>
    apiVoid('/api/account/register', { method: 'POST', body: input }),
  logout: (): Promise<void> => apiVoid('/api/auth/sign-out', { method: 'POST', body: {} }),
  updateMe: (input: UpdateMeInput): Promise<Me> =>
    api('/api/me', meSchema, { method: 'PATCH', body: input }),
}
