'use server'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

import type { ActionResult } from './actions'

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
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
  try {
    const data = await fetchSymfonyAdminJson<OnboardingToken[]>('/api/admin/onboarding-tokens')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteOnboardingToken(id: string): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(`/api/admin/onboarding-tokens/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function validateOnboardingToken(token: string): Promise<{
  valid: boolean
  barbiere_email?: string | null
  error?: string
}> {
  return { valid: false, error: 'Validazione token ancora non migrata lato Symfony.' }
}

export async function markOnboardingTokenUsed(
  _token: string,
  _usedByEmail: string
): Promise<ActionResult> {
  return { success: false, error: 'Mark token used ancora non migrato lato Symfony.' }
}
