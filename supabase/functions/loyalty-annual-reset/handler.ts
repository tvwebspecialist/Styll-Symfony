export const LOYALTY_RESET_SECRET_ENV = 'LOYALTY_RESET_SECRET'
export const LOYALTY_RESET_SECRET_HEADER = 'x-loyalty-reset-secret'

interface DbError {
  message: string
}

interface ClientLoyaltyRow {
  id: string
}

interface ClientLoyaltySelectResult {
  data: ClientLoyaltyRow[] | null
  error: DbError | null
}

interface ClientLoyaltyUpdateResult {
  error: DbError | null
  count: number | null
}

export interface LoyaltyAnnualResetDb {
  from(table: 'client_loyalty'): {
    select(columns: string): {
      lt(column: 'tier_year', value: number): Promise<ClientLoyaltySelectResult>
    }
    update(values: {
      tier_points_this_year: number
      tier_year: number
      tier_grace_expires_at: string
    }): {
      in(column: 'id', ids: string[]): {
        select(
          columns: 'id',
          options: { count: 'exact'; head: true }
        ): Promise<ClientLoyaltyUpdateResult>
      }
    }
  }
}

export interface LoyaltyAnnualResetDeps {
  env: {
    supabaseUrl: string | null
    serviceRoleKey: string | null
    loyaltyResetSecret: string | null
  }
  createAdminClient: (supabaseUrl: string, serviceRoleKey: string) => LoyaltyAnnualResetDb
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

function readProvidedSecret(req: Request): string | null {
  const headerSecret = req.headers.get(LOYALTY_RESET_SECRET_HEADER)?.trim()
  if (headerSecret) return headerSecret

  return extractBearerToken(req.headers.get('authorization'))
}

function timingSafeEqual(expected: string, actual: string): boolean {
  const encoder = new TextEncoder()
  const expectedBytes = encoder.encode(expected)
  const actualBytes = encoder.encode(actual)

  if (expectedBytes.length !== actualBytes.length) {
    return false
  }

  let mismatch = 0
  for (let index = 0; index < expectedBytes.length; index += 1) {
    mismatch |= expectedBytes[index] ^ actualBytes[index]
  }

  return mismatch === 0
}

export function isAuthorizedLoyaltyAnnualResetRequest(
  req: Request,
  loyaltyResetSecret: string | null | undefined
): boolean {
  const expectedSecret = loyaltyResetSecret?.trim()
  if (!expectedSecret) return false

  const providedSecret = readProvidedSecret(req)
  if (!providedSecret) return false

  return timingSafeEqual(expectedSecret, providedSecret)
}

export async function handleLoyaltyAnnualResetRequest(
  req: Request,
  deps: LoyaltyAnnualResetDeps
): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const loyaltyResetSecret = deps.env.loyaltyResetSecret?.trim() ?? ''
  if (!loyaltyResetSecret) {
    console.error(
      `[loyalty-annual-reset] ${LOYALTY_RESET_SECRET_ENV} is not configured`
    )
    return json({ success: false, error: 'Service unavailable' }, 503)
  }

  if (!isAuthorizedLoyaltyAnnualResetRequest(req, loyaltyResetSecret)) {
    return json({ success: false, error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = deps.env.supabaseUrl?.trim() ?? ''
  const serviceRoleKey = deps.env.serviceRoleKey?.trim() ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[loyalty-annual-reset] Supabase admin env is not configured')
    return json({ success: false, error: 'Service unavailable' }, 503)
  }

  const db = deps.createAdminClient(supabaseUrl, serviceRoleKey)
  const now = new Date()
  const currentYear = now.getFullYear()

  const gracePeriodEnd = new Date(currentYear, 2, 1, 0, 0, 0, 0).toISOString()

  const { data: rows, error: fetchErr } = await db
    .from('client_loyalty')
    .select('id, tier_year')
    .lt('tier_year', currentYear)

  if (fetchErr) {
    console.error('[loyalty-annual-reset] fetch error:', fetchErr.message)
    return json({ success: false, error: fetchErr.message }, 500)
  }

  if (!rows || rows.length === 0) {
    return json({ success: true, message: 'Nothing to reset', updated: 0 }, 200)
  }

  const ids = rows.map((row) => row.id)
  const batchSize = 500
  let totalUpdated = 0

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize)
    const { error: updateErr, count } = await db
      .from('client_loyalty')
      .update({
        tier_points_this_year: 0,
        tier_year: currentYear,
        tier_grace_expires_at: gracePeriodEnd,
      })
      .in('id', batch)
      .select('id', { count: 'exact', head: true })

    if (updateErr) {
      console.error('[loyalty-annual-reset] update error:', updateErr.message)
    } else {
      totalUpdated += count ?? 0
    }
  }

  console.log(
    `[loyalty-annual-reset] Reset complete. Updated: ${totalUpdated} rows. Grace expires: ${gracePeriodEnd}`
  )

  return json(
    {
      success: true,
      updated: totalUpdated,
      tierYear: currentYear,
      graceExpires: gracePeriodEnd,
    },
    200
  )
}
