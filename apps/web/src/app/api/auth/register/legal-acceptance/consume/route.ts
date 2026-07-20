import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  B2B_REGISTER_LEGAL_PROOF_COOKIE,
  EMAIL_PASSWORD_REGISTER_SOURCE,
  clearB2bRegisterCookies,
  consumePendingB2bTermsAcceptanceProof,
} from '@/lib/legal/b2b-register-acceptance'
import { toPublicErrorMessage } from '@/lib/security/public-error'

const requestSchema = z.object({
  source: z.literal(EMAIL_PASSWORD_REGISTER_SOURCE).default(EMAIL_PASSWORD_REGISTER_SOURCE),
})

function jsonResponse(
  status: number,
  payload: Record<string, unknown>,
  configure?: (response: NextResponse) => void,
) {
  const response = NextResponse.json(payload, { status })
  configure?.(response)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function isRecoverableClientError(message: string) {
  return /missing|expired|used|mismatch/i.test(message)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Richiesta non valida',
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return jsonResponse(401, {
      success: false,
      error: 'Sessione non valida. Effettua di nuovo la registrazione.',
    })
  }

  const proofToken = request.cookies.get(B2B_REGISTER_LEGAL_PROOF_COOKIE)?.value ?? null
  if (!proofToken) {
    return jsonResponse(
      400,
      {
        success: false,
        error: 'Prova legale di registrazione mancante o scaduta. Riprova dalla pagina di registrazione.',
      },
      (response) => {
        clearB2bRegisterCookies(response.cookies)
      },
    )
  }

  try {
    const acceptance = await consumePendingB2bTermsAcceptanceProof({
      rawToken: proofToken,
      source: parsed.data.source,
      userEmail: user.email ?? null,
      userId: user.id,
    })

    return jsonResponse(
      200,
      {
        success: true,
        acceptedAt: acceptance.accepted_at,
        privacyNoticeVersion: acceptance.privacy_notice_version,
        termsVersion: acceptance.document_version,
      },
      (response) => {
        clearB2bRegisterCookies(response.cookies)
      },
    )
  } catch (error) {
    const message = toPublicErrorMessage(
      error,
      'Impossibile completare la registrazione dell’accettazione dei Termini',
      isRecoverableClientError,
    )

    return jsonResponse(
      isRecoverableClientError(message) ? 400 : 500,
      {
        success: false,
        error: message,
      },
      (response) => {
        clearB2bRegisterCookies(response.cookies)
      },
    )
  }
}
