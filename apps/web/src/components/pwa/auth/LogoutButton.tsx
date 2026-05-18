'use client'

import { logoutClient } from '@/lib/actions/client-auth'

export function LogoutButton({ basePath }: { basePath: string }) {
  return (
    <button
      onClick={async () => {
        await logoutClient()
        window.location.href = basePath
      }}
      className="w-full py-4 text-left text-sm font-bold text-red-500"
    >
      Esci
    </button>
  )
}
