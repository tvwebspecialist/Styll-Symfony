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
 * StyllModal — universal centered popup for Styll.
 * Wraps @base-ui/react Dialog with Styll design: rounded-3xl, Outfit font,
 * smooth animations. Forms pass their own footer buttons as part of children.
 */
export function StyllModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: StyllModalProps) {
  const maxWidthMap = { sm: '440px', md: '520px', lg: '640px' }
  const maxWidth = maxWidthMap[size]

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

        {/* Popup */}
        <DialogPrimitive.Popup
          className={cn(
            'styll-modal-popup',
            'fixed top-1/2 left-1/2 z-[201] -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-2rem)]',
            'flex flex-col',
            'rounded-3xl bg-white shadow-2xl',
            'max-h-[90dvh]',
            'outline-none',
            'duration-150',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
          )}
          style={{ maxWidth }}
        >
          {/* Drag handle — visible on mobile only */}
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-fg-secondary)] transition-colors hover:bg-[color:var(--color-bg-secondary)] active:scale-95"
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
