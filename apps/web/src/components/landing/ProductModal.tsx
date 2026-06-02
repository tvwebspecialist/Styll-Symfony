'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { pauseLenis, resumeLenis } from '@/hooks/useLenis'
import type { LandingProduct } from '@/types/landing'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

// ── Availability section ──────────────────────────────────────────────────────

function AvailabilitySection({ inventory }: { inventory: LandingProduct['inventory'] }) {
  if (inventory.length === 0) return null

  const inStock = inventory.filter((i) => i.quantity > 0)

  return (
    <div>
      <div style={{ height: 1, background: '#F0F0F0', margin: '20px 0 16px' }} />
      <p
        style={{
          margin: '0 0 10px 0',
          fontSize: 11,
          fontWeight: 600,
          color: '#AAAAAA',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Disponibilità
      </p>

      {inStock.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {inStock.map((item) => (
            <div
              key={item.locationName}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22C55E',
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 13, color: '#333333', flex: 1 }}>
                {item.locationName}
              </span>
              <span style={{ fontSize: 13, color: '#888888', flexShrink: 0 }}>
                {item.quantity} {item.quantity === 1 ? 'pezzo' : 'pezzi'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#D1D5DB',
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 13, color: '#888888' }}>
            Disponibilità da verificare in negozio
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  product: LandingProduct | null
  onClose: () => void
}

export default function ProductModal({ product, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Pause Lenis + lock body scroll
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

  // Focus close button on open
  useEffect(() => {
    if (product) {
      const id = setTimeout(() => closeButtonRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [product])

  const titleId = 'product-modal-title'

  return (
    <AnimatePresence>
      {product && (
        <>
          {/* ── Overlay ── */}
          <motion.div
            key="product-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0,0,0,0.60)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* ── Modal card ── */}
          <motion.div
            key="product-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
              zIndex: 9999,
              width: 'calc(100% - 32px)',
              maxWidth: 720,
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── Non-scrolling close button row ── */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '14px 14px 0',
              }}
            >
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Chiudi"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F0F0F0',
                  color: '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Scrollable content ── */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div className="flex flex-col sm:flex-row">

                {/* ── Photo column ── */}
                <div
                  style={{ flexShrink: 0 }}
                  className="w-full sm:w-[260px] px-5 pt-4 pb-0 sm:py-6 sm:px-6 sm:pr-0"
                >
                  <div
                    className="relative w-full aspect-[4/3] sm:aspect-square overflow-hidden rounded-xl"
                    style={{ background: '#1A1A1A' }}
                  >
                    {product.photo_url ? (
                      <Image
                        src={product.photo_url}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        sizes="(max-width: 639px) calc(100vw - 80px), 260px"
                      />
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 40,
                          fontWeight: 800,
                          color: 'rgba(255,255,255,0.5)',
                          userSelect: 'none',
                        }}
                        aria-hidden="true"
                      >
                        {product.name.trim().charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Info column ── */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  className="px-5 pt-5 pb-7 sm:px-7 sm:pt-6 sm:pb-8 sm:pl-6"
                >
                  {/* Category pill */}
                  {product.category?.trim() && (
                    <span
                      style={{
                        display: 'inline-block',
                        alignSelf: 'flex-start',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: '#F0F0F0',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#666',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginBottom: 12,
                      }}
                    >
                      {product.category.trim()}
                    </span>
                  )}

                  {/* Name */}
                  <h2
                    id={titleId}
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#0A0A0A',
                      lineHeight: 1.15,
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {product.name}
                  </h2>

                  {/* Brand */}
                  {product.brand?.trim() && (
                    <p
                      style={{
                        margin: '5px 0 0 0',
                        fontSize: 14,
                        color: '#888888',
                        fontWeight: 400,
                      }}
                    >
                      {product.brand.trim()}
                    </p>
                  )}

                  {/* Description */}
                  {product.description?.trim() && (
                    <>
                      <div style={{ height: 1, background: '#F0F0F0', margin: '16px 0' }} />
                      <p
                        style={{
                          margin: 0,
                          fontSize: 15,
                          color: '#444444',
                          lineHeight: 1.6,
                        }}
                      >
                        {product.description.trim()}
                      </p>
                    </>
                  )}

                  {/* Availability */}
                  <AvailabilitySection inventory={product.inventory} />

                  {/* Price */}
                  <p
                    style={{
                      margin: '20px 0 0 0',
                      fontSize: 32,
                      fontWeight: 800,
                      color: '#0A0A0A',
                      letterSpacing: '-0.8px',
                      lineHeight: 1,
                    }}
                  >
                    {formatPrice(product.price_sell)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
