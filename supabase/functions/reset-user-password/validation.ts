import { z } from 'https://esm.sh/zod@3.25.76'

export const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

