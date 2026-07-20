import { redirect } from 'next/navigation'
import { buildPathWithTrialIntent, readTrialIntent } from '@/lib/trial-intent'

export default async function LegacyCompleteRedirect({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string | string[] | undefined }>
}) {
  const params = await searchParams
  redirect(buildPathWithTrialIntent('/onboarding/step-1', readTrialIntent(params.intent)))
}
