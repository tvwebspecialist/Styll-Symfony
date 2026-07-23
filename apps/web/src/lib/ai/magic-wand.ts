const MAGIC_FIELDS = [
  'tagline',
  'description',
  'about_title',
  'about_text',
  'team_description',
] as const

type SafeParseSuccess<T> = {
  success: true
  data: T
}

type SafeParseFailure = {
  success: false
  error: {
    issues: string[]
  }
}

type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseFailure

export type MagicField = (typeof MAGIC_FIELDS)[number]

export interface MagicContext {
  business_name: string
  city: string
  services: string[]
  staff_count: number
}

function success<T>(data: T): SafeParseSuccess<T> {
  return {
    success: true,
    data,
  }
}

function failure(issue: string): SafeParseFailure {
  return {
    success: false,
    error: {
      issues: [issue],
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeBoundedString(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > maxLength) {
    return null
  }

  return normalized
}

export const MagicFieldSchema = {
  safeParse(value: unknown): SafeParseResult<MagicField> {
    if (typeof value !== 'string' || !MAGIC_FIELDS.includes(value as MagicField)) {
      return failure('Invalid magic field.')
    }

    return success(value as MagicField)
  },
}

export const MagicContextSchema = {
  safeParse(value: unknown): SafeParseResult<MagicContext> {
    if (!isRecord(value)) {
      return failure('Invalid magic context.')
    }

    const businessName = normalizeBoundedString(value.business_name, 120)
    const city = normalizeBoundedString(value.city, 120)
    const services = value.services
    const staffCount = value.staff_count

    if (!businessName || !city) {
      return failure('Invalid magic context.')
    }

    if (!Array.isArray(services) || services.length > 20) {
      return failure('Invalid magic context.')
    }

    const normalizedServices = services.map((service) => normalizeBoundedString(service, 120))
    if (normalizedServices.some((service) => service === null)) {
      return failure('Invalid magic context.')
    }

    if (
      typeof staffCount !== 'number'
      || !Number.isInteger(staffCount)
      || staffCount < 0
      || staffCount > 500
    ) {
      return failure('Invalid magic context.')
    }

    return success({
      business_name: businessName,
      city,
      services: normalizedServices as string[],
      staff_count: staffCount,
    })
  },
}

export const MagicWandRequestSchema = {
  safeParse(value: unknown): SafeParseResult<{
    field: MagicField
    context: MagicContext
  }> {
    if (!isRecord(value)) {
      return failure('Invalid magic wand request.')
    }

    const field = MagicFieldSchema.safeParse(value.field)
    if (!field.success) {
      return failure('Invalid magic wand request.')
    }

    const context = MagicContextSchema.safeParse(value.context)
    if (!context.success) {
      return failure('Invalid magic wand request.')
    }

    return success({
      field: field.data,
      context: context.data,
    })
  },
}

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
