import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SYMFONY_API = (process.env.SYMFONY_API_URL ?? 'https://api.styll.it').replace(/\/$/, '')

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

  const token = process.env.SYMFONY_ADMIN_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'SYMFONY_ADMIN_API_TOKEN not configured' }, { status: 500 })
  }

  const { id } = await params

  try {
    const res = await fetch(`${SYMFONY_API}/api/admin/backups/${id}/verify`, {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
      // restore can take up to 2 minutes
      signal: AbortSignal.timeout(150_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Verify timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Symfony API unreachable' }, { status: 503 })
  }
}
