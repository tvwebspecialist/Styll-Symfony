import { NextResponse, type NextRequest } from 'next/server'
import { buildTenantAppUrl, sanitizeAppRelativePath } from '@/lib/auth/urls'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const rawNext = searchParams.get('next')
  const next = sanitizeAppRelativePath(rawNext, '/profilo')
  const accessoUrl = new URL(buildTenantAppUrl(slug, '/accesso'))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    accessoUrl.searchParams.set('error', 'session_failed')
    return NextResponse.redirect(accessoUrl)
  }

  const freshUrl = new URL(buildTenantAppUrl(slug, next))
  freshUrl.searchParams.set('_t', Date.now().toString())
  freshUrl.searchParams.set('google_login', '1')
  const response = NextResponse.redirect(freshUrl)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
