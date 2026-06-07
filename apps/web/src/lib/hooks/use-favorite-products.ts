'use client'

import { useState, useEffect, useCallback, startTransition } from 'react'
import { toggleWishlist } from '@/lib/actions/wishlist'

interface Options {
  isLoggedIn: boolean
  clientId?: string | null
  tenantId: string
  slug: string
  initialIds?: string[]
}

export function useFavoriteProducts({
  isLoggedIn,
  clientId,
  tenantId,
  slug,
  initialIds = [],
}: Options) {
  const storageKey = `styll_wishlist_${slug}`
  const [favIds, setFavIds] = useState<Set<string>>(new Set(initialIds))

  useEffect(() => {
    if (!isLoggedIn) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const ids = JSON.parse(stored) as string[]
          startTransition(() => setFavIds(new Set(ids)))
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [isLoggedIn, storageKey])

  const isFavorite = useCallback((id: string) => favIds.has(id), [favIds])

  const toggle = useCallback(
    async (productId: string) => {
      const current = favIds.has(productId)
      const next = new Set(favIds)
      if (current) next.delete(productId)
      else next.add(productId)

      setFavIds(next)

      if (isLoggedIn && clientId) {
        const result = await toggleWishlist({
          tenantId,
          clientId,
          productId,
          currentState: current,
        })
        if (!result.success) {
          setFavIds(favIds)
        }
      } else {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)))
        } catch {
          // ignore storage errors
        }
      }
    },
    [favIds, isLoggedIn, clientId, tenantId, storageKey],
  )

  return { isFavorite, toggle, count: favIds.size }
}
