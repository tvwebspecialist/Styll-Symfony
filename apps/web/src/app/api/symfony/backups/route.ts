import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SYMFONY_API = (process.env.SYMFONY_API_URL ?? 'https://api.styll.it').replace(/\/$/, '')

async function assertSuperadmin(): Promise<{ error: NextResponse } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { error: null }
}

export async function GET(): Promise<NextResponse> {
  const guard = await assertSuperadmin()
  if (guard.error) return guard.error

  const token = process.env.SYMFONY_ADMIN_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'SYMFONY_ADMIN_API_TOKEN not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${SYMFONY_API}/api/admin/backups`, {
      headers: { 'X-Admin-Token': token },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Symfony API unreachable' }, { status: 503 })
  }
}
