'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Check, Loader2, Plus, ShoppingBag } from 'lucide-react'
import { addProductToAppointment } from '@/lib/actions/wishlist'

export interface SuggestedProduct {
  id: string
  name: string
  brand: string | null
  photo_url: string | null
  price_sell: number
}

interface Props {
  appointmentId: string
  tenantId: string
  products: SuggestedProduct[]
  brandColor: string
  isLoggedIn: boolean
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export function PostBookingProducts({
  appointmentId,
  tenantId,
  products,
  brandColor,
  isLoggedIn,
}: Props) {
  const [states, setStates] = useState<
    Record<string, { added: boolean; loading: boolean }>
  >(Object.fromEntries(products.map((p) => [p.id, { added: false, loading: false }])))

  async function handleAdd(product: SuggestedProduct) {
    const state = states[product.id]
    if (!state || state.added || state.loading) return

    setStates((prev) => ({
      ...prev,
      [product.id]: { ...prev[product.id], loading: true },
    }))

    const result = await addProductToAppointment({
      tenantId,
      appointmentId,
      productId: product.id,
      quantity: 1,
      priceAtSale: product.price_sell,
    })

    setStates((prev) => ({
      ...prev,
      [product.id]: { loading: false, added: result.success },
    }))
  }

  if (!isLoggedIn || products.length === 0) return null

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="h-1 w-full" style={{ backgroundColor: brandColor }} />

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
            Porta a casa il risultato
          </p>
        </div>
        <p className="text-[14px] font-semibold text-gray-900 mb-4">
          Aggiungi un prodotto alla visita
        </p>

        <div className="flex flex-col gap-3">
          {products.map((product) => {
            const state = states[product.id] ?? { added: false, loading: false }
            return (
              <div
                key={product.id}
                className="flex items-center gap-3"
              >
                {/* Image */}
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {product.photo_url ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-[12px] font-bold" style={{ color: brandColor }}>
                    {formatPrice(product.price_sell)}
                  </p>
                </div>

                {/* Add button */}
                {state.added ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                    <span className="text-[12px] font-semibold text-green-700">Aggiunto</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleAdd(product)}
                    disabled={state.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-opacity active:scale-95"
                    style={{
                      backgroundColor: brandColor,
                      opacity: state.loading ? 0.7 : 1,
                      border: 'none',
                      cursor: state.loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {state.loading ? (
                      <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span className="text-[12px] font-semibold text-white">Aggiungi</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
