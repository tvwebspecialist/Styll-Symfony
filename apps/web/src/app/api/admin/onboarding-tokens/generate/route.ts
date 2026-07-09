import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getUntyped() {
  return createSupabaseClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = getUntyped()

  // Rate limit: max 1 token/min per admin
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString()
  const { count } = await raw
    .from('onboarding_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', oneMinAgo)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Rate limit: attendi 1 minuto prima di generare un nuovo link.' },
      { status: 429 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body optional
  }
  const barbiereEmail =
    typeof body.barbiere_email === 'string' ? body.barbiere_email.trim() || null : null

  const token = randomBytes(16).toString('hex') // 32-char hex, case-sensitive
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await raw
    .from('onboarding_tokens')
    .insert({
      token,
      barbiere_email: barbiereEmail,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select('token, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim()
  const link = `${baseUrl}/register?token=${(data as { token: string }).token}`

  return NextResponse.json({
    token: (data as { token: string; expires_at: string }).token,
    link,
    expires_at: (data as { token: string; expires_at: string }).expires_at,
  })
}
