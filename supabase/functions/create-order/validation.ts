import { z } from 'https://esm.sh/zod@3.25.76'

export const addressSchema = z.object({
  street: z.string().min(3, 'Rua deve ter no mínimo 3 caracteres').max(200, 'Rua muito longa'),
  number: z.string().min(1, 'Número é obrigatório').max(20, 'Número muito longo'),
  complement: z.string().max(100, 'Complemento muito longo').optional().nullable(),
  neighborhood: z.string().min(2, 'Bairro deve ter no mínimo 2 caracteres').max(100, 'Bairro muito longo'),
  city: z.string().min(2, 'Cidade deve ter no mínimo 2 caracteres').max(100, 'Cidade muito longa'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional().nullable(),
})

export const orderItemSchema = z.object({
  product_id: z.string().uuid('ID do produto inválido'),
  name: z.string().min(1, 'Nome do item é obrigatório').max(200, 'Nome muito longo'),
  quantity: z.number().int('Quantidade deve ser um número inteiro').min(1, 'Quantidade mínima é 1').max(100, 'Quantidade máxima é 100'),
  unit_price: z.number().positive('Preço deve ser positivo').max(100000, 'Preço muito alto'),
})

export const createOrderSchema = z.object({
  tenant_id: z.string().uuid('ID do tenant inválido'),
  client_id: z.string().uuid('ID do cliente inválido'),
  total: z.number().positive('Total deve ser positivo').max(100000, 'Total muito alto'),
  payment_method: z.enum(['PIX', 'CARD', 'CASH'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' })
  }),
  change_for: z.number().nonnegative('Troco não pode ser negativo').max(10000, 'Troco muito alto').optional().nullable(),
  address: addressSchema,
  items: z.array(orderItemSchema).min(1, 'Pedido deve ter pelo menos um item'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

