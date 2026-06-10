import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const rawNext = searchParams.get('next') ?? '/profilo'

  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://')
      ? rawNext
      : '/profilo'

  const host = request.headers.get('host') ?? new URL(request.url).host
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(new URL('/accesso', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return NextResponse.redirect(new URL('/accesso?error=oauth_failed', origin))
  }

  const freshUrl = new URL(next, origin)
  freshUrl.searchParams.set('_t', Date.now().toString())
  const response = NextResponse.redirect(freshUrl)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
