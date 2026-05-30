'use client'

import { useRouter } from 'next/navigation'
import { logoutClient } from '@/lib/actions/client-auth'
import { createPwaClient } from '@/lib/supabase/pwa-client'

export function LogoutButton({ basePath }: { basePath: string }) {
  const router = useRouter()

  return (
    <button
      onClick={async () => {
        const pwa = createPwaClient()
        await Promise.all([
          logoutClient(),
          pwa.auth.signOut({ scope: 'local' }),
        ])
        router.push(basePath)
        router.refresh()
      }}
      className="w-full py-4 text-left text-sm font-bold text-red-500"
    >
      Esci
    </button>
  )
}
