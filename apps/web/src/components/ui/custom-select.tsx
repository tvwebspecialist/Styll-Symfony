'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  /** Renders a smaller, inline variant (no full-width wrapper) */
  compact?: boolean
  /** Which edge of the trigger to align the panel to (default: 'start' = left) */
  align?: 'start' | 'end'
}

/**
 * CustomSelect — replaces native <select> inside modals.
 * Matches the modal input field style spec and uses a fixed-positioned
 * floating panel so it never gets clipped by overflow:auto containers.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleziona…',
  compact = false,
  align = 'start',
}: CustomSelectProps) {
  const [isOpen, setIsOpen]       = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const [panelPos, setPanelPos]   = React.useState<{
    top?: number; bottom?: number; left?: number; right?: number; width: number
  }>({ left: 0, width: 0 })

  const triggerRef    = React.useRef<HTMLButtonElement>(null)
  const panelRef      = React.useRef<HTMLDivElement>(null)
  const closeTimer    = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  function computePosition() {
    if (!triggerRef.current) return
    const rect        = triggerRef.current.getBoundingClientRect()
    const PANEL_GAP   = 4
    const PANEL_MAX_H = 248
    const estHeight   = Math.min(options.length * 49 + 8, PANEL_MAX_H)
    const spaceBelow  = window.innerHeight - rect.bottom - PANEL_GAP
    const showAbove   = spaceBelow < estHeight && rect.top > spaceBelow
    if (align === 'end') {
      const rightOffset = window.innerWidth - rect.right
      const panelWidth  = Math.max(rect.width, 150)
      setPanelPos(
        showAbove
          ? { bottom: window.innerHeight - rect.top + PANEL_GAP, right: rightOffset, width: panelWidth }
          : { top: rect.bottom + PANEL_GAP, right: rightOffset, width: panelWidth }
      )
    } else {
      setPanelPos(
        showAbove
          ? { bottom: window.innerHeight - rect.top + PANEL_GAP, left: rect.left, width: rect.width }
          : { top: rect.bottom + PANEL_GAP, left: rect.left, width: rect.width }
      )
    }
  }

  function openDropdown() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    computePosition()
    setIsOpen(true)
    setIsClosing(false)
  }

  function closeDropdown() {
    setIsClosing(true)
    closeTimer.current = setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 140)
  }

  function toggle() {
    if (isOpen && !isClosing) closeDropdown()
    else openDropdown()
  }

  // Click-outside
  React.useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  }, [])

  const active = isOpen && !isClosing

  return (
    <div style={{ position: 'relative', width: compact ? undefined : '100%', display: compact ? 'inline-flex' : undefined }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={active}
        style={{
          width:        compact ? undefined : '100%',
          padding:      compact ? '6px 10px' : '14px 16px',
          borderRadius: compact ? 8 : 12,
          border:       `1px solid ${active ? '#111827' : (compact ? '#E5E5E5' : '#e5e5e5')}`,
          fontSize:     compact ? 13 : 15,
          color:        selectedLabel ? '#111827' : '#b0b0b0',
          background:   compact ? '#F5F5F5' : '#fafafa',
          outline:      'none',
          boxSizing:    'border-box',
          textAlign:    'left',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          fontFamily:   'inherit',
          transition:   'border-color 150ms ease',
          whiteSpace:   'nowrap',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          color="#888"
          style={{
            flexShrink:  0,
            marginLeft:  8,
            marginRight: 0,
            transition:  'transform 200ms ease',
            transform:   active ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          style={{
            position:     'fixed',
            top:          panelPos.top,
            bottom:       panelPos.bottom,
            left:         panelPos.left,
            right:        panelPos.right,
            width:        panelPos.width,
            zIndex:       9999,
            background:   '#FFFFFF',
            borderRadius: 14,
            border:       '1px solid #e5e5e5',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
            overflow:     'hidden',
            maxHeight:    240,
            overflowY:    'auto',
            animation:    isClosing
              ? 'custom-select-close 140ms ease-in forwards'
              : 'custom-select-open 180ms ease-out forwards',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); closeDropdown() }}
              style={{
                padding:         '12px 16px',
                fontSize:        15,
                cursor:          'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                fontWeight:      opt.value === value ? 600 : 400,
                color:           '#222222',
                background:      'transparent',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <Check size={14} color="#111827" style={{ flexShrink: 0, marginLeft: 8 }} />
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
