'use client'

import React from 'react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'warning' | 'info' | 'error'

export interface Toast {
  id: string
  type: ToastType
  title: string
  subtitle?: string
  duration?: number
}

interface ToastContextValue {
  showToast: (opts: Omit<Toast, 'id'>) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  return ctx ?? { showToast: () => {} }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { bg: string; borderColor: string; titleColor: string }> = {
  success: { bg: 'rgba(220,252,231,0.95)', borderColor: '#16a34a', titleColor: '#14532d' },
  warning: { bg: 'rgba(254,249,195,0.95)', borderColor: '#ca8a04', titleColor: '#713f12' },
  info:    { bg: 'rgba(219,234,254,0.95)', borderColor: '#2563eb', titleColor: '#1e3a8a' },
  error:   { bg: 'rgba(254,226,226,0.95)', borderColor: '#dc2626', titleColor: '#7f1d1d' },
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#16a34a" />
      <path d="M5.5 10.5L8.5 13.5L14.5 7.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M9.13 2.75L1.13 16.25A1 1 0 002 17.75h16a1 1 0 00.87-1.5L10.87 2.75a1 1 0 00-1.74 0z" fill="#ca8a04" />
      <path d="M10 8.75v3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14.75" r="0.75" fill="white" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#2563eb" />
      <path d="M10 9.5v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.9" fill="white" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#dc2626" />
      <path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

const ICONS: Record<ToastType, () => React.ReactElement> = {
  success: SuccessIcon,
  warning: WarningIcon,
  info:    InfoIcon,
  error:   ErrorIcon,
}

// ─── Toast Item ───────────────────────────────────────────────────────────────

type Phase = 'entering' | 'visible' | 'exiting'

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [phase, setPhase] = useState<Phase>('entering')
  const c = CONFIG[toast.type]
  const Icon = ICONS[toast.type]
  const duration = toast.duration ?? 3500

  useEffect(() => {
    // entering → visible after first paint
    const t1 = setTimeout(() => setPhase('visible'), 16)
    // visible → exiting
    const t2 = setTimeout(() => setPhase('exiting'), duration - 200)
    // exiting → unmount
    const t3 = setTimeout(() => onRemove(toast.id), duration)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [toast.id, duration, onRemove])

  function handleClose() {
    setPhase('exiting')
    setTimeout(() => onRemove(toast.id), 200)
  }

  const translateY = phase === 'visible' ? '0px' : phase === 'entering' ? '-12px' : '-8px'
  const opacity = phase === 'visible' ? 1 : 0
  const transitionDuration = phase === 'exiting' ? '200ms' : '250ms'
  const transitionEasing = phase === 'exiting' ? 'ease-in' : 'ease-out'

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: '50%',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 14,
        background: c.bg,
        borderLeft: `4px solid ${c.borderColor}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: 280,
        maxWidth: 340,
        transform: `translateX(-50%) translateY(${translateY})`,
        opacity,
        transition: `transform ${transitionDuration} ${transitionEasing}, opacity ${transitionDuration} ${transitionEasing}`,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Icon />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: c.titleColor, lineHeight: 1.3 }}>
          {toast.title}
        </p>
        {toast.subtitle && (
          <p style={{ margin: '2px 0 0', fontSize: 12, color: c.titleColor, opacity: 0.75, lineHeight: 1.3 }}>
            {toast.subtitle}
          </p>
        )}
      </div>

      <button
        onClick={handleClose}
        aria-label="Chiudi"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.55,
          color: c.titleColor,
          marginTop: 1,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { ...opts, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </ToastContext.Provider>
  )
}
