import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

type MagicField = 'tagline' | 'description' | 'about_title' | 'about_text' | 'team_description'

interface MagicContext {
  business_name: string
  city: string
  services: string[]
  staff_count: number
}

interface MagicWandRequest {
  field: MagicField
  context: MagicContext
}

function buildPrompt(field: MagicField, ctx: MagicContext): string {
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

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json() as MagicWandRequest
  const { field, context } = body

  if (!context?.business_name) {
    return Response.json({ error: 'Contesto insufficiente' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: 'Rispondi SOLO con JSON valido, senza markdown, senza backtick.',
    messages: [{ role: 'user', content: buildPrompt(field, context) }],
  })

  const text = (message.content[0] as { type: 'text'; text: string }).text
  return Response.json(JSON.parse(text))
}
