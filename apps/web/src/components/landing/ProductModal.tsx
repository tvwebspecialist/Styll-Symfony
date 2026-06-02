'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { pauseLenis, resumeLenis } from '@/hooks/useLenis'
import type { LandingProduct } from '@/types/landing'

interface Props {
  product: LandingProduct | null
  onClose: () => void
}

function formatPrice(price: number): string {
  return price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export default function ProductModal({ product, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Pause Lenis and lock body scroll while open
  useEffect(() => {
    if (!product) return

    pauseLenis()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      resumeLenis()
      document.body.style.overflow = prev
    }
  }, [product])

  // Close on Escape
  useEffect(() => {
    if (!product) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [product, onClose])

  // Move focus to close button when modal opens
  useEffect(() => {
    if (product) {
      // small delay so AnimatePresence finishes mounting
      const id = setTimeout(() => closeButtonRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [product])

  const titleId = 'product-modal-title'

  return (
    <AnimatePresence>
      {product && (
        // Overlay
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.70)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          {/* Modal card — stop propagation so clicks inside don't close */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 680,
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                zIndex: 10,
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.07)',
                color: '#111',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Content layout: side-by-side on sm+, stacked on mobile */}
            <div className="flex flex-col sm:flex-row">
              {/* Photo column */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '24px 24px 0 24px',
                }}
                className="sm:py-6 sm:pr-0 sm:pl-6"
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 260,
                    aspectRatio: '1 / 1',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#f0f0f0',
                    position: 'relative',
                    margin: '0 auto',
                  }}
                >
                  {product.photo_url ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                      sizes="260px"
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 64,
                        fontWeight: 800,
                        color: 'rgba(0,0,0,0.15)',
                        userSelect: 'none',
                      }}
                      aria-hidden="true"
                    >
                      {product.name.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
              </div>

              {/* Info column */}
              <div
                style={{
                  flex: 1,
                  padding: '20px 24px 28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  minWidth: 0,
                }}
                className="sm:pt-8 sm:pr-8 sm:pb-8 sm:pl-6"
              >
                {/* Category pill */}
                {product.category && (
                  <span
                    style={{
                      display: 'inline-block',
                      alignSelf: 'flex-start',
                      padding: '3px 10px',
                      borderRadius: 99,
                      background: 'rgba(0,0,0,0.06)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#555',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    {product.category}
                  </span>
                )}

                {/* Name */}
                <h2
                  id={titleId}
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#111',
                    lineHeight: 1.2,
                    letterSpacing: '-0.3px',
                  }}
                >
                  {product.name}
                </h2>

                {/* Brand */}
                {product.brand?.trim() && (
                  <p
                    style={{
                      margin: '6px 0 0 0',
                      fontSize: 14,
                      color: '#888',
                      fontWeight: 400,
                    }}
                  >
                    {product.brand.trim()}
                  </p>
                )}

                {/* Description */}
                {product.description?.trim() && (
                  <p
                    style={{
                      margin: '16px 0 0 0',
                      fontSize: 14,
                      color: '#444',
                      lineHeight: 1.65,
                    }}
                  >
                    {product.description.trim()}
                  </p>
                )}

                {/* Price */}
                <p
                  style={{
                    margin: '20px 0 0 0',
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#111',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {formatPrice(product.price_sell)}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
