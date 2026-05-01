import { redirect } from 'next/navigation'

export default function MemberOnboardingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const tenant = typeof searchParams.tenant === 'string' ? searchParams.tenant : null
  if (!tenant) redirect('/dashboard')
  redirect(`/onboarding/member/step-1?tenant=${tenant}`)
}
