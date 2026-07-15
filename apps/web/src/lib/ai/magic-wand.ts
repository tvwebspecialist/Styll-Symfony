import { z } from 'zod'

export const MagicFieldSchema = z.enum([
  'tagline',
  'description',
  'about_title',
  'about_text',
  'team_description',
])

export const MagicContextSchema = z.object({
  business_name: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  services: z.array(z.string().trim().min(1).max(120)).max(20),
  staff_count: z.number().int().min(0).max(500),
}).strict()

export const MagicWandRequestSchema = z.object({
  field: MagicFieldSchema,
  context: MagicContextSchema,
}).strict()

export type MagicField = z.infer<typeof MagicFieldSchema>
export type MagicContext = z.infer<typeof MagicContextSchema>

export function buildMagicWandPrompt(field: MagicField, ctx: MagicContext): string {
  switch (field) {
    case 'tagline':
      return `Genera 3 tagline brevi (max 8 parole) per un barbiere chiamato "${ctx.business_name}" a ${ctx.city}. Servizi: ${ctx.services.join(', ')}. Tono: professionale ma caldo. Solo italiano. Restituisci JSON: {"options": ["...", "...", "..."]}`
    case 'description':
      return `Scrivi una descrizione breve (max 120 caratteri) per la hero page del barbiere "${ctx.business_name}" a ${ctx.city}. Tono diretto e professionale. Solo italiano. JSON: {"text": "..."}`
    case 'about_title':
      return `Genera 3 titoli creativi (max 6 parole) per la sezione "Chi siamo" del barbiere "${ctx.business_name}". NON usare "Chi siamo" o "La nostra storia". JSON: {"options": ["...", "...", "..."]}`
    case 'about_text':
      return `Scrivi un testo about (80-150 parole) per il barbiere "${ctx.business_name}" a ${ctx.city} con ${ctx.staff_count} barbieri. Servizi: ${ctx.services.join(', ')}. Tono: autentico, caldo, professionale. Prima persona plurale. Solo italiano. JSON: {"text": "..."}`
    case 'team_description':
      return `Scrivi un sottotitolo breve (max 60 caratteri) per la sezione team del barbiere "${ctx.business_name}". JSON: {"text": "..."}`
  }
}
