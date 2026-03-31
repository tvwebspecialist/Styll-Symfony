import { z } from 'zod'

export const phoneSchema = z
  .string()
  .min(9, 'Numero di telefono troppo corto')
  .regex(/^[+]?[0-9\s\-()]+$/, 'Numero di telefono non valido')

export const emailSchema = z
  .string()
  .email('Email non valida')
  .optional()
  .or(z.literal(''))

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password troppo corta (minimo 6 caratteri)'),
})

export const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password troppo corta (minimo 8 caratteri)'),
  fullName: z.string().min(2, 'Nome troppo corto'),
  businessName: z.string().min(2, 'Nome del salone troppo corto'),
  phone: phoneSchema,
})

export const newClientSchema = z.object({
  full_name: z.string().min(2, 'Nome troppo corto'),
  phone: phoneSchema,
  email: emailSchema,
  date_of_birth: z.string().optional(),
  preferred_contact_channel: z.enum(['push', 'whatsapp', 'sms', 'email']).optional(),
})

export const newServiceSchema = z.object({
  name: z.string().min(2, 'Nome troppo corto'),
  price: z.number().positive('Il prezzo deve essere positivo'),
  duration_minutes: z.number().int().positive('La durata deve essere positiva'),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const newProductSchema = z.object({
  name: z.string().min(2, 'Nome troppo corto'),
  brand: z.string().optional(),
  price_sell: z.number().positive('Il prezzo deve essere positivo'),
  price_cost: z.number().positive().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type NewClientFormData = z.infer<typeof newClientSchema>
export type NewServiceFormData = z.infer<typeof newServiceSchema>
export type NewProductFormData = z.infer<typeof newProductSchema>
