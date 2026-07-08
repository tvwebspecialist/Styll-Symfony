import { redirect } from 'next/navigation'

export default async function MemberOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tenant = typeof params.tenant === 'string' ? params.tenant : null
  if (!tenant) redirect('/dashboard')
  redirect(`/onboarding/member/step-1?tenant=${tenant}`)
}
