import { z } from 'zod'
import { roleSchema } from './common'

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.-]{3,32}$/, '3 à 32 caractères : lettres, chiffres, _ . -')

export const passwordSchema = z.string().min(10, '10 caractères minimum').max(128)

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

export const registerInputSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  signupCode: z.string().trim().min(4).max(64),
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const updateMeInputSchema = z
  .object({ color: hexColorSchema, displayName: usernameSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Aucune modification')
export type UpdateMeInput = z.infer<typeof updateMeInputSchema>

export const meSchema = z.object({
  id: z.string(),
  username: z.string(),
  color: hexColorSchema,
})
export type Me = z.infer<typeof meSchema>

export const boardNameSchema = z.string().trim().min(1).max(80)

export const createBoardInputSchema = z.object({ name: boardNameSchema })
export const renameBoardInputSchema = z.object({ name: boardNameSchema })
export const favoriteInputSchema = z.object({ favorite: z.boolean() })
export const listBoardsQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  favorites: z.enum(['1', '0']).optional(),
})

export const boardSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  favorite: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  memberCount: z.number(),
  updatedAt: z.string(),
  lastOpenedAt: z.string().nullable(),
})
export type BoardSummary = z.infer<typeof boardSummarySchema>

export const boardDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  favorite: z.boolean(),
})
export type BoardDetail = z.infer<typeof boardDetailSchema>

export const memberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  color: z.string(),
  role: roleSchema,
})
export type Member = z.infer<typeof memberSchema>

export const updateMemberInputSchema = z.object({ role: z.enum(['EDITOR', 'VIEWER']) })

export const createInviteInputSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER']),
  expiresInHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(72),
  maxUses: z.number().int().min(1).max(50).default(5),
})
export type CreateInviteInput = z.input<typeof createInviteInputSchema>

export const inviteSchema = z.object({
  id: z.string(),
  role: z.enum(['EDITOR', 'VIEWER']),
  uses: z.number(),
  maxUses: z.number(),
  expiresAt: z.string(),
})
export type Invite = z.infer<typeof inviteSchema>

export const createdInviteSchema = inviteSchema.extend({ token: z.string() })
export type CreatedInvite = z.infer<typeof createdInviteSchema>

export const invitePreviewSchema = z.object({
  boardId: z.string(),
  boardName: z.string(),
  role: z.enum(['EDITOR', 'VIEWER']),
})
export type InvitePreview = z.infer<typeof invitePreviewSchema>

export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/)

export const assetUploadResultSchema = z.object({ id: z.string(), src: z.string() })

export const apiErrorSchema = z.object({ error: z.string() })
