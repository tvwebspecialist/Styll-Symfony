'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface PlatformLeadInsert {
  email: string
  source: 'trial_signup' | 'demo_request' | 'content_download' | 'chat'
  posthog_distinct_id?: string
  consent_marketing?: boolean
  consent_at?: string
}

type LeadsDb = {
  from(table: 'platform_leads'): {
    upsert(
      data: PlatformLeadInsert,
      opts: { onConflict: string; ignoreDuplicates: boolean }
    ): Promise<{ error: { message: string } | null }>
  }
}

export async function savePlatformLead(input: PlatformLeadInsert): Promise<void> {
  if (!input.email) return
  try {
    const db = createAdminClient() as unknown as LeadsDb
    const { error } = await db
      .from('platform_leads')
      .upsert(
        {
          ...input,
          consent_at: input.consent_marketing ? new Date().toISOString() : undefined,
        },
        { onConflict: 'email', ignoreDuplicates: true }
      )
    if (error) {
      console.error('[platform-leads] upsert error', error.message)
    }
  } catch {
    // best-effort
  }
}
