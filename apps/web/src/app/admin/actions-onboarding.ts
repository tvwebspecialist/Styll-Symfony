'use server'

import { createClient } from '@supabase/supabase-js'

import { requireSuperadmin, type ActionResult } from './actions'

function getDb() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  )
}

export interface OnboardingToken {
  id: string
  token: string
  barbiere_email: string | null
  created_by: string | null
  created_at: string
  expires_at: string
  used_at: string | null
  used_by_email: string | null
  active: boolean
}

export async function listOnboardingTokens(): Promise<{
  success: boolean
  data?: OnboardingToken[]
  error?: string
}> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = getDb()
  const { data, error } = await db
    .from('onboarding_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return { success: false, error: error.message }
  return { success: true, data: (data ?? []) as OnboardingToken[] }
}

export async function deleteOnboardingToken(id: string): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = getDb()
  const { data: token } = await db
    .from('onboarding_tokens')
    .select('used_at')
    .eq('id', id)
    .maybeSingle()
  if ((token as { used_at: string | null } | null)?.used_at) {
    return { success: false, error: 'Token già usato, impossibile eliminarlo.' }
  }
  const { error } = await db.from('onboarding_tokens').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function validateOnboardingToken(token: string): Promise<{
  valid: boolean
  barbiere_email?: string | null
  error?: string
}> {
  const db = getDb()
  const { data } = await db
    .from('onboarding_tokens')
    .select('id, barbiere_email, expires_at, used_at, active')
    .eq('token', token)
    .maybeSingle()

  const row = data as {
    id: string
    barbiere_email: string | null
    expires_at: string
    used_at: string | null
    active: boolean
  } | null

  if (!row) return { valid: false, error: 'Token non trovato.' }
  if (!row.active) return { valid: false, error: 'Token disattivato.' }
  if (row.used_at) return { valid: false, error: 'Token già utilizzato.' }
  if (new Date(row.expires_at) < new Date()) return { valid: false, error: 'Token scaduto.' }
  return { valid: true, barbiere_email: row.barbiere_email }
}

export async function markOnboardingTokenUsed(
  token: string,
  usedByEmail: string
): Promise<ActionResult> {
  const db = getDb()
  const { error } = await db
    .from('onboarding_tokens')
    .update({
      used_at: new Date().toISOString(),
      used_by_email: usedByEmail,
      active: false,
    })
    .eq('token', token)
    .is('used_at', null)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
