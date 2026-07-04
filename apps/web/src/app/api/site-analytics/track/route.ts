import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SiteEventType, AppSurface } from '@/lib/site-analytics/track'

// TODO: replace with Redis-backed rate limiter when app runs on multiple serverless instances.
// Current in-memory map resets on cold start — acceptable for single-instance deploys.
const rateBucket = new Map<string, number>()
const RATE_WINDOW_MS = 2_000
const RATE_BUCKET_MAX = 5_000

function isRateLimited(anonymousId: string): boolean {
  const now = Date.now()
  const last = rateBucket.get(anonymousId)
  if (last !== undefined && now - last < RATE_WINDOW_MS) return true
  rateBucket.set(anonymousId, now)
  if (rateBucket.size > RATE_BUCKET_MAX) {
    for (const [k, v] of rateBucket) {
      if (now - v > RATE_WINDOW_MS * 10) rateBucket.delete(k)
      if (rateBucket.size < RATE_BUCKET_MAX / 2) break
    }
  }
  return false
}

const VALID_EVENTS = new Set<string>([
  'page_view', 'service_view', 'booking_started',
  'booking_completed', 'signup_completed', 'login',
])

const VALID_SURFACES = new Set<string>(['website', 'pwa'])

interface TrackPayload {
  tenant_id: string
  anonymous_id: string
  event_type: string
  app_surface: string
  page_url?: string
  referrer?: string | null
  user_agent?: string
  metadata?: Record<string, unknown>
}

interface SessionRow { id: string }
interface SessionUpsertData {
  tenant_id: string
  anonymous_id: string
  app_surface: AppSurface
  user_agent: string | null
  last_seen_at: string
  first_seen_at?: string
}
interface EventInsertData {
  tenant_id: string
  session_id: string
  anonymous_id: string
  event_type: string
  page_url: string | null
  referrer: string | null
  metadata: Record<string, unknown>
}

type AnalyticsDb = {
  from(table: 'site_sessions'): {
    upsert(data: SessionUpsertData, opts: { onConflict: string; ignoreDuplicates: boolean }): {
      select(cols: string): {
        maybeSingle(): Promise<{ data: SessionRow | null; error: { message: string } | null }>
      }
    }
  }
  from(table: 'site_events'): {
    insert(data: EventInsertData): Promise<{ error: { message: string } | null }>
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TrackPayload
  try {
    body = (await req.json()) as TrackPayload
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { tenant_id, anonymous_id, event_type, app_surface, page_url, referrer, user_agent, metadata } = body

  if (!tenant_id || !anonymous_id || !event_type || !app_surface) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!VALID_EVENTS.has(event_type)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!VALID_SURFACES.has(app_surface)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (isRateLimited(anonymous_id)) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 })
  }

  try {
    const db = createAdminClient() as unknown as AnalyticsDb
    const now = new Date().toISOString()

    const { data: session, error: sessionError } = await db
      .from('site_sessions')
      .upsert(
        {
          tenant_id,
          anonymous_id,
          app_surface: app_surface as AppSurface,
          user_agent: user_agent ?? null,
          last_seen_at: now,
          first_seen_at: now,
        },
        { onConflict: 'tenant_id,anonymous_id,app_surface', ignoreDuplicates: false }
      )
      .select('id')
      .maybeSingle()

    if (sessionError || !session?.id) {
      console.error('[site-analytics] session upsert error', sessionError?.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    const { error: eventError } = await db.from('site_events').insert({
      tenant_id,
      session_id: session.id,
      anonymous_id,
      event_type: event_type as SiteEventType,
      page_url: page_url ?? null,
      referrer: referrer ?? null,
      metadata: metadata ?? {},
    })

    if (eventError) {
      console.error('[site-analytics] event insert error', eventError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[site-analytics] unexpected error', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
