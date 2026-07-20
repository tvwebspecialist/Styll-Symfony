import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { MagicWandRequestSchema, buildMagicWandPrompt } from '@/lib/ai/magic-wand'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const rl = checkRateLimit(`magic-wand:${user.id}`, 15, 60_000)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Troppe richieste. Riprova tra poco.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const rawBody = await req.json().catch(() => null)
  const parsed = MagicWandRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { field, context } = parsed.data
  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: 'Rispondi SOLO con JSON valido, senza markdown, senza backtick.',
    messages: [{ role: 'user', content: buildMagicWandPrompt(field, context) }],
  })

  const text = (message.content[0] as { type: 'text'; text: string }).text
  try {
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({ error: 'Invalid model response' }, { status: 502 })
  }
}
