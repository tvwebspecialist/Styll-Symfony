'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Plus, Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleWishlist } from '@/lib/actions/wishlist'
import type { UpsellProduct } from '@/lib/actions/public-booking'

interface BookingUpsellDrawerProps {
  products: UpsellProduct[]
  primaryColor: string
  staffName: string | null
  isLoggedIn: boolean
  clientId?: string
  tenantId: string
  onContinue: (selectedProductIds: string[]) => void
  onSkip: () => void
}

export function BookingUpsellDrawer({
  products,
  primaryColor,
  staffName,
  isLoggedIn,
  clientId,
  tenantId,
  onContinue,
  onSkip,
}: BookingUpsellDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [wishlistMap, setWishlistMap] = useState<Record<string, boolean>>(
    Object.fromEntries(products.map((p) => [p.id, p.is_favourite])),
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onSkip])

  function toggleProduct(id: string) {
    const product = products.find((p) => p.id === id)
    if (!product?.available) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function handleToggleFavourite(productId: string) {
    if (!isLoggedIn || !clientId) return
    const current = wishlistMap[productId] ?? false
    setWishlistMap((prev) => ({ ...prev, [productId]: !current }))
    const result = await toggleWishlist({ tenantId, clientId, productId, currentState: current })
    if (!result.success) {
      setWishlistMap((prev) => ({ ...prev, [productId]: current }))
    }
  }

  const selectedCount = selectedIds.length
  const firstNameOnly = staffName?.split(' ')[0] ?? 'il tuo barbiere'

  return (
    <AnimatePresence>
      <motion.div
        key="upsell-overlay"
        className="fixed inset-0 z-[200] bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onSkip}
        aria-hidden="true"
      />

      <motion.div
        key="upsell-drawer"
        className="fixed bottom-2 left-2 right-2 z-[201] flex flex-col overflow-hidden bg-white"
        style={{ maxHeight: '88vh', borderRadius: '44px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog"
        aria-label="Prodotti consigliati"
      >
        {/* Drag handle */}
        <div className="flex justify-center" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-200 mt-3 mb-5" />
        </div>

        {/* Header — non scrolla, con gradiente che pende verso il basso */}
        <div className="relative px-6 pb-4" style={{ overflow: 'visible' }}>
          <p
            className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-2"
            style={{ color: primaryColor }}
          >
            Solo per te, oggi
          </p>
          <h2
            className="text-[26px] font-bold leading-[1.15] text-gray-900"
            style={{ fontFamily: 'var(--font-tenant, inherit)' }}
          >
            Porta a casa<br />il risultato
          </h2>

          {/* Gradiente overlay: parte dal fondo dell'header e pende giù di 28px */}
          <div
            className="absolute bottom-0 pointer-events-none"
            style={{
              height: '48px',
              left: '-24px',
              right: '-24px',
              transform: 'translateY(100%)',
              background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 100%)',
              zIndex: 10,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-5">
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                className={cn(
                  'group relative bg-white rounded-2xl cursor-pointer overflow-hidden',
                  'transition-all duration-200',
                  !product.available && 'pointer-events-none opacity-60',
                )}
                style={{
                  boxShadow: selectedIds.includes(product.id)
                    ? `0 0 0 2px ${primaryColor}, 0 4px 16px rgba(0,0,0,0.08)`
                    : '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                {/* FOTO */}
                <div className="relative h-[130px] mx-1.5 mt-1.5 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  {product.photo_url ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="45vw"
                      loading="eager"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Scissors className="w-7 h-7 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                  {product.is_new && (
                    <span className="absolute top-1.5 left-1.5 bg-gray-900 text-white text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md">
                      Novità
                    </span>
                  )}

                  {product.available && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleProduct(product.id)
                      }}
                      aria-label={
                        selectedIds.includes(product.id)
                          ? `Rimuovi ${product.name} dalla visita`
                          : `Aggiungi ${product.name} alla visita`
                      }
                      className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white/70 shadow-md transition-transform duration-200 active:scale-90"
                      style={{
                        backgroundColor: selectedIds.includes(product.id)
                          ? '#22c55e'
                          : primaryColor,
                      }}
                    >
                      {selectedIds.includes(product.id) ? (
                        <Check className="text-white w-4 h-4" strokeWidth={2.5} />
                      ) : (
                        <Plus className="text-white w-4 h-4" />
                      )}
                    </button>
                  )}

                  {!product.available && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Esaurito
                      </span>
                    </div>
                  )}
                </div>

                {/* INFO PRODOTTO */}
                <div className="px-2.5 pt-2 pb-2.5">
                  <p className="text-[13px] font-bold text-gray-900 truncate leading-snug">
                    {product.name}
                  </p>
                  {product.brand && (
                    <p className="text-[11px] text-gray-400 font-normal mt-0.5 truncate">
                      {product.brand}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{product.description}</p>
                  )}
                  <div className="flex items-center mt-2">
                    <span className="text-xs font-bold text-gray-900 bg-[#f0f0f0] rounded-full px-3 py-1 shrink-0">
                      €
                      {product.price_sell.toLocaleString('it-IT', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer sticky */}
        <div className="border-t border-gray-100 bg-white px-5 pb-[max(28px,env(safe-area-inset-bottom,0px))] pt-4">
          <button
            type="button"
            onClick={() => onContinue(selectedIds)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
            style={{ backgroundColor: primaryColor, fontFamily: 'var(--font-tenant, inherit)' }}
          >
            <ArrowRight size={16} />
            <span>
              {selectedCount === 0
                ? 'Continua alla conferma'
                : selectedCount === 1
                  ? 'Continua con 1 prodotto'
                  : `Continua con ${selectedCount} prodotti`}
            </span>
            {selectedCount > 0 && (
              <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-medium text-white">
                {selectedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="mt-0.5 w-full py-2.5 text-center text-xs text-neutral-400 underline underline-offset-2"
          >
            Salta, prenota senza prodotti
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
