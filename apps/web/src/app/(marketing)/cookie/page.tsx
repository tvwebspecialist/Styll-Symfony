import type { Metadata } from 'next'
import { CookiePolicyPage } from '@/components/legal/CookiePolicyPage'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Cookie Policy | Styll',
  description: 'Informativa cookie del sito styll.it.',
}

export default function CookiePage() {
  return <CookiePolicyPage context={{ kind: 'platform', backHref: '/', backLabel: '← Torna alla home' }} />
}
