'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StyllModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/**
 * StyllModal — universal popup for Styll.
 * Mobile: bottom sheet (like NewApptModal in calendario).
 * Desktop: centered modal.
 */
export function StyllModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: StyllModalProps) {
  const maxWidthClass = {
    sm: 'sm:max-w-[440px]',
    md: 'sm:max-w-[520px]',
    lg: 'sm:max-w-[640px]',
  }[size]

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop
          className="fixed inset-0 isolate z-[200] bg-black/40 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />

        {/* Popup — bottom sheet on mobile, centered on sm+ */}
        <DialogPrimitive.Popup
          className={cn(
            'styll-modal-popup',
            'fixed z-[201]',
            // ── Mobile: bottom sheet ──────────────────────────────────────
            'bottom-4 left-4 right-4 rounded-3xl',
            // ── Desktop (sm+): centered modal ─────────────────────────────
            'sm:bottom-auto sm:left-1/2 sm:right-auto',
            'sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:w-[calc(100vw-2rem)]',
            maxWidthClass,
            // ── Common ────────────────────────────────────────────────────
            'flex flex-col',
            'bg-white shadow-2xl',
            'max-h-[90dvh]',
            'outline-none',
            'duration-150',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          {/* Drag handle — hint visivo su mobile */}
          <div className="styll-modal-drag-handle" aria-hidden="true" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 shrink-0">
            <div className="min-w-0">
              <DialogPrimitive.Title
                className="text-[17px] font-bold leading-tight text-[color:var(--color-fg)]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-[color:var(--color-fg-secondary)] mt-1">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Chiudi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-fg-secondary)] transition-colors styll-hover-color-bg-secondary active:scale-95"
            >
              <X size={15} />
            </DialogPrimitive.Close>
          </div>

          {/* Divider */}
          <div className="styll-modal-divider h-px bg-[color:var(--color-border)] mx-6 shrink-0" />

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            {children}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
