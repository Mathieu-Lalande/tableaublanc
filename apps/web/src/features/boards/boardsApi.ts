import { z } from 'zod'
import {
  boardDetailSchema,
  boardSummarySchema,
  createdInviteSchema,
  invitePreviewSchema,
  inviteSchema,
  memberSchema,
  type BoardDetail,
  type BoardSummary,
  type CreatedInvite,
  type CreateInviteInput,
  type Invite,
  type InvitePreview,
  type Member,
} from '@canvas/shared'
import { api, apiVoid } from '@/lib/api'

const enc = encodeURIComponent

export const boardsApi = {
  list: (filter: { q?: string; favorites?: boolean }): Promise<BoardSummary[]> => {
    const params = new URLSearchParams()
    if (filter.q) params.set('q', filter.q)
    if (filter.favorites) params.set('favorites', '1')
    const qs = params.toString()
    return api(`/api/boards${qs ? `?${qs}` : ''}`, z.array(boardSummarySchema))
  },
  create: (name: string): Promise<BoardSummary> =>
    api('/api/boards', boardSummarySchema, { method: 'POST', body: { name } }),
  get: (id: string): Promise<BoardDetail> => api(`/api/boards/${enc(id)}`, boardDetailSchema),
  rename: (id: string, name: string) =>
    apiVoid(`/api/boards/${enc(id)}`, { method: 'PATCH', body: { name } }),
  remove: (id: string) => apiVoid(`/api/boards/${enc(id)}`, { method: 'DELETE' }),
  setFavorite: (id: string, favorite: boolean) =>
    apiVoid(`/api/boards/${enc(id)}/favorite`, { method: 'PUT', body: { favorite } }),
  members: (id: string): Promise<Member[]> =>
    api(`/api/boards/${enc(id)}/members`, z.array(memberSchema)),
  updateMember: (id: string, userId: string, role: 'EDITOR' | 'VIEWER') =>
    apiVoid(`/api/boards/${enc(id)}/members/${enc(userId)}`, { method: 'PATCH', body: { role } }),
  removeMember: (id: string, userId: string) =>
    apiVoid(`/api/boards/${enc(id)}/members/${enc(userId)}`, { method: 'DELETE' }),
  invites: (id: string): Promise<Invite[]> =>
    api(`/api/boards/${enc(id)}/invites`, z.array(inviteSchema)),
  createInvite: (id: string, input: CreateInviteInput): Promise<CreatedInvite> =>
    api(`/api/boards/${enc(id)}/invites`, createdInviteSchema, { method: 'POST', body: input }),
  revokeInvite: (id: string, inviteId: string) =>
    apiVoid(`/api/boards/${enc(id)}/invites/${enc(inviteId)}`, { method: 'DELETE' }),
  previewInvite: (token: string): Promise<InvitePreview> =>
    api(`/api/invites/${enc(token)}`, invitePreviewSchema),
  acceptInvite: (token: string): Promise<{ boardId: string }> =>
    api(`/api/invites/${enc(token)}/accept`, z.object({ boardId: z.string() }), { method: 'POST' }),
  uploadThumbnail: async (id: string, blob: Blob): Promise<void> => {
    const form = new FormData()
    form.append('file', blob, 'thumbnail.png')
    await fetch(`/api/boards/${enc(id)}/thumbnail`, {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
      headers: { 'x-canvas-csrf': '1' },
    })
  },
}
