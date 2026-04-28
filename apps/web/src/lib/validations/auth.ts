import { z } from 'zod'

export const finalizeOnboardingSchema = z.object({
  step1: z.object({
    name: z.string().trim().min(2, 'Nome attività obbligatorio'),
    business_type: z
      .enum(['barbiere', 'parrucchiere', 'salone_misto', 'beauty_center', 'altro'])
      .nullable(),
    phone: z.string().trim().max(40).optional().default(''),
    address: z.string().trim().min(2, 'Indirizzo obbligatorio'),
    city: z.string().trim().min(2, 'Città obbligatoria'),
  }),
  step2: z.object({
    work_mode: z.enum(['solo', 'team']),
  }),
  step3: z.object({
    services: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          price: z.number().nonnegative(),
          duration_minutes: z.number().int().positive(),
        })
      )
      .min(1, 'Aggiungi almeno un servizio'),
  }),
  step4: z.object({
    hours: z
      .array(
        z.object({
          day_of_week: z.number().int().min(0).max(6),
          is_open: z.boolean(),
          open_time: z.string().regex(/^\d{2}:\d{2}$/),
          close_time: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .length(7),
  }),
  staff: z.object({
    members: z
      .array(
        z.object({
          name: z.string().trim().max(80).optional().default(''),
          email: z.string().trim().email('Email non valida'),
          role: z.enum(['staff', 'manager', 'receptionist']),
        })
      )
      .max(10),
  }),
})

export type FinalizeOnboardingInput = z.infer<typeof finalizeOnboardingSchema>

