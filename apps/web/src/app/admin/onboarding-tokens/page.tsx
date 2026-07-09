import { Link2, Key } from 'lucide-react'

import { listOnboardingTokens } from '@/app/admin/actions-onboarding'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { OnboardingTokensClient } from './tokens-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingTokensPage() {
  const res = await listOnboardingTokens()
  const tokens = res.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Onboarding Tokens' },
          ]}
        />
        <div className="mt-1 flex items-center gap-3">
          <Key size={20} style={{ color: 'var(--admin-accent)' }} />
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
          >
            Onboarding Tokens
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Genera link privati per permettere la registrazione di nuovi barbieri.
        </p>
      </div>

      <OnboardingTokensClient initialTokens={tokens} />
    </div>
  )
}
