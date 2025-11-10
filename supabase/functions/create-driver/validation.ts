import { z } from 'https://esm.sh/zod@3.25.76'

export const createDriverSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().regex(/^[\d\s()+-]+$/, 'Telefone inválido').min(10, 'Telefone muito curto').max(20, 'Telefone muito longo'),
  cpf: z.string()
    .regex(/^[\d.-]+$/, 'CPF deve conter apenas números, pontos e hífens')
    .refine((val) => {
      const digitsOnly = val.replace(/\D/g, '');
      return digitsOnly.length === 11;
    }, {
      message: 'CPF deve ter exatamente 11 dígitos numéricos'
    })
    .transform((val) => val.replace(/\D/g, '')), // Remove formatação e retorna apenas números
  vehicle: z.enum(['MOTO', 'CARRO', 'BICICLETA', 'A_PE'], {
    errorMap: () => ({ message: 'Tipo de veículo inválido' })
  }),
  plate: z.string().optional().nullable(),
  tenant_id: z.string().uuid('ID do tenant inválido'),
})

export type CreateDriverInput = z.infer<typeof createDriverSchema>

