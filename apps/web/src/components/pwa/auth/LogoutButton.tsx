'use client'

import { useRouter } from 'next/navigation'
import { logoutClient } from '@/lib/actions/client-auth'

export function LogoutButton({ basePath }: { basePath: string }) {
  const router = useRouter()

  return (
    <button
      onClick={async () => {
        await logoutClient()
        router.push(basePath)
        router.refresh()
      }}
      className="w-full py-4 text-left text-sm font-bold text-red-500"
    >
      Esci
    </button>
  )
}
