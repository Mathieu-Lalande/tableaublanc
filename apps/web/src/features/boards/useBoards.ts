import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateInviteInput } from '@canvas/shared'
import { boardsApi } from './boardsApi'

export const boardKeys = {
  all: ['boards'] as const,
  list: (q: string, favorites: boolean) => ['boards', 'list', q, favorites] as const,
  detail: (id: string) => ['boards', 'detail', id] as const,
  members: (id: string) => ['boards', 'members', id] as const,
  invites: (id: string) => ['boards', 'invites', id] as const,
}

export function useBoardList(q: string, favorites: boolean) {
  return useQuery({
    queryKey: boardKeys.list(q, favorites),
    queryFn: () => boardsApi.list({ q, favorites }),
    placeholderData: (prev) => prev,
  })
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => boardsApi.get(id),
    retry: false,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: boardKeys.all })
}

export function useCreateBoard() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (name: string) => boardsApi.create(name),
    onSuccess: invalidate,
  })
}

export function useRenameBoard() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => boardsApi.rename(id, name),
    onSuccess: invalidate,
  })
}

export function useDeleteBoard() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => boardsApi.remove(id), onSuccess: invalidate })
}

export function useToggleFavorite() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      boardsApi.setFavorite(id, favorite),
    onSuccess: invalidate,
  })
}

export function useMembers(id: string, enabled = true) {
  return useQuery({
    queryKey: boardKeys.members(id),
    queryFn: () => boardsApi.members(id),
    enabled,
  })
}

export function useUpdateMember(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'EDITOR' | 'VIEWER' }) =>
      boardsApi.updateMember(boardId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.members(boardId) }),
  })
}

export function useRemoveMember(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => boardsApi.removeMember(boardId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.all }),
  })
}

export function useInvites(boardId: string, enabled: boolean) {
  return useQuery({
    queryKey: boardKeys.invites(boardId),
    queryFn: () => boardsApi.invites(boardId),
    enabled,
  })
}

export function useCreateInvite(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInviteInput) => boardsApi.createInvite(boardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.invites(boardId) }),
  })
}

export function useRevokeInvite(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => boardsApi.revokeInvite(boardId, inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.invites(boardId) }),
  })
}
