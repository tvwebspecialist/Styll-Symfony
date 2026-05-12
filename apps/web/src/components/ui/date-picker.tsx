'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerProps {
  /** ISO date string "YYYY-MM-DD" or empty string */
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const DAYS_IT = ['Lu','Ma','Me','Gi','Ve','Sa','Do']

/** Parse "YYYY-MM-DD" to a midnight local Date, avoiding timezone shifts */
function parseDate(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(dateStr: string): string {
  const d = parseDate(dateStr)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

/**
 * DatePicker — styled trigger + floating calendar panel.
 * Same fixed-panel pattern as CustomSelect so it works inside overflow containers.
 * Zero new dependencies; reuses existing custom-select-open/close CSS keyframes.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleziona data',
}: DatePickerProps) {
  const [isOpen, setIsOpen]       = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const [panelPos, setPanelPos]   = React.useState<{
    top?: number; bottom?: number; left: number; width: number
  }>({ left: 0, width: 0 })
  const [viewDate, setViewDate] = React.useState<Date>(() => parseDate(value) ?? new Date())

  const triggerRef  = React.useRef<HTMLButtonElement>(null)
  const panelRef    = React.useRef<HTMLDivElement>(null)
  const closeTimer  = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedDate  = parseDate(value)
  const todayMidnight = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()

  function computePosition() {
    if (!triggerRef.current) return
    const rect      = triggerRef.current.getBoundingClientRect()
    const PANEL_GAP = 4
    const PANEL_H   = 340
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP
    const showAbove  = spaceBelow < PANEL_H && rect.top > spaceBelow
    setPanelPos(
      showAbove
        ? { bottom: window.innerHeight - rect.top + PANEL_GAP, left: rect.left, width: Math.max(rect.width, 290) }
        : { top: rect.bottom + PANEL_GAP,                      left: rect.left, width: Math.max(rect.width, 290) }
    )
  }

  function openPicker() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setViewDate(parseDate(value) ?? new Date())
    computePosition()
    setIsOpen(true)
    setIsClosing(false)
  }

  function closePicker() {
    setIsClosing(true)
    closeTimer.current = setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
    }, 140)
  }

  function toggle() {
    if (isOpen && !isClosing) closePicker()
    else openPicker()
  }

  // Click-outside
  React.useEffect(() => {
    if (!isOpen) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      closePicker()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  React.useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  }, [])

  // Build calendar grid for current view month
  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDow   = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1   // Mon-based (0=Mon … 6=Sun)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function selectDay(day: number) {
    onChange(toIso(year, month, day))
    closePicker()
  }

  const active = isOpen && !isClosing

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={active}
        style={{
          width:        '100%',
          padding:      '14px 16px',
          borderRadius: 12,
          border:       `1px solid ${active ? '#111827' : '#e5e5e5'}`,
          fontSize:     15,
          color:        value ? '#111827' : '#b0b0b0',
          background:   '#fafafa',
          outline:      'none',
          boxSizing:    'border-box',
          textAlign:    'left',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          fontFamily:   'inherit',
          transition:   'border-color 150ms ease',
        }}
      >
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        <CalendarIcon
          size={16}
          color="#888"
          style={{ flexShrink: 0, marginLeft: 8 }}
        />
      </button>

      {/* Floating panel — rendered via portal so transform on dialog doesn't offset position:fixed */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Scegli data"
          style={{
            position:     'fixed',
            top:          panelPos.top,
            bottom:       panelPos.bottom,
            left:         panelPos.left,
            width:        panelPos.width,
            minWidth:     290,
            zIndex:       9999,
            background:   '#FFFFFF',
            borderRadius: 16,
            border:       '1px solid #e5e5e5',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
            padding:      16,
            animation:    isClosing
              ? 'custom-select-close 140ms ease-in forwards'
              : 'custom-select-open 180ms ease-out forwards',
          }}
        >
          {/* Month / year navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              style={navBtnStyle}
            >
              <ChevronLeft size={16} color="#555" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#222' }}>
              {MONTHS_IT[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              style={navBtnStyle}
            >
              <ChevronRight size={16} color="#555" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_IT.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#b0b0b0', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const cellMidnight = new Date(year, month, day)
              const isSelected = selectedDate?.getTime() === cellMidnight.getTime()
              const isToday    = todayMidnight.getTime() === cellMidnight.getTime()
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    aspectRatio:     '1',
                    borderRadius:    8,
                    border:          'none',
                    background:      isSelected ? '#222222' : 'transparent',
                    color:           isSelected ? '#fff' : '#222',
                    fontSize:        13,
                    fontWeight:      isSelected ? 700 : isToday ? 600 : 400,
                    cursor:          'pointer',
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    position:        'relative',
                    transition:      'background 100ms ease',
                    fontFamily:      'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f0f0f0'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span style={{
                      position:    'absolute',
                      bottom:       3,
                      left:        '50%',
                      transform:   'translateX(-50%)',
                      width:        4,
                      height:       4,
                      borderRadius: '50%',
                      background:  '#222',
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Clear */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); closePicker() }}
              style={{
                marginTop:   12,
                width:       '100%',
                padding:     '8px',
                borderRadius: 8,
                border:      '1px solid #e5e5e5',
                background:  'transparent',
                fontSize:    13,
                color:       '#888',
                cursor:      'pointer',
                fontFamily:  'inherit',
              }}
            >
              Cancella data
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  padding:         '6px',
  borderRadius:    8,
  border:          'none',
  background:      '#f5f5f5',
  cursor:          'pointer',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
}
