import { redirect } from 'next/navigation'

export default function LegacyCompleteRedirect() {
  redirect('/onboarding/step-1')
}
