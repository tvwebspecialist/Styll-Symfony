import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { validateOnboardingToken } from '@/app/admin/actions-onboarding'
import {
  EMAIL_PASSWORD_REGISTER_SOURCE,
  GOOGLE_OAUTH_REGISTER_SOURCE,
  createPendingB2bTermsAcceptanceProof,
  setB2bRegisterCookies,
} from '@/lib/legal/b2b-register-acceptance'

const requestSchema = z.object({
  email: z.string().email().optional(),
  onboardingToken: z.string().min(1, 'Token onboarding mancante'),
  source: z.enum([EMAIL_PASSWORD_REGISTER_SOURCE, GOOGLE_OAUTH_REGISTER_SOURCE]),
})

function jsonError(status: number, error: string) {
  const response = NextResponse.json({ success: false, error }, { status })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? 'Richiesta non valida')
  }

  const { email, onboardingToken, source } = parsed.data
  const tokenValidation = await validateOnboardingToken(onboardingToken)

  if (!tokenValidation.valid) {
    return jsonError(400, tokenValidation.error ?? 'Token onboarding non valido')
  }

  try {
    const proof = await createPendingB2bTermsAcceptanceProof({
      acceptedByEmail: source === EMAIL_PASSWORD_REGISTER_SOURCE ? email ?? null : null,
      contextToken: source === GOOGLE_OAUTH_REGISTER_SOURCE ? onboardingToken : null,
      metadata: { flow: 'root_register' },
      source,
    })

    const response = NextResponse.json({
      success: true,
      expiresAt: proof.expiresAt,
      privacyNoticeVersion: proof.privacyNoticeVersion,
      termsVersion: proof.documentVersion,
    })

    setB2bRegisterCookies(response.cookies, {
      contextToken: source === GOOGLE_OAUTH_REGISTER_SOURCE ? onboardingToken : null,
      proofToken: proof.rawToken,
    })

    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return jsonError(
      500,
      error instanceof Error
        ? error.message
        : 'Impossibile preparare la prova legale di registrazione',
    )
  }
}
