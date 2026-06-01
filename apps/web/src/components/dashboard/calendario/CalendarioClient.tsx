'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type {
  CalendarioAppointment,
  CalendarioData,
} from '@/lib/actions/calendario'
import { getCalendarioData } from '@/lib/actions/calendario'
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments'
import {
  HOUR_HEIGHT,
  HOURS,
  STATUS_LABELS,
  STATUS_BADGE,
  DAYS_ABBR,
  type CalendarView,
  addDays,
  isToday,
  formatTime,
  getDurationMin,
  getApptPosition,
  getInitials,
  isHourWorking,
  findNextEmptySlot,
} from './calendario-utils'
import { CalendarioMainLayout } from './CalendarioSubComponents'

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  weekStart: string
  dayView?: string | null
  data: CalendarioData
  currentStaffId: string | null
  isManagerOrOwner: boolean
  selectedStaffId: string | null
  timezone?: string
}

// ── Main component ─────────────────────────────────────────────────────────

export function CalendarioClient({
  tenantId,
  weekStart,
  dayView,
  data,
  currentStaffId,
  isManagerOrOwner,
  selectedStaffId,
  timezone = 'Europe/Rome',
}: Props) {
  const router = useRouter()

  // ── Live appointments ────────────────────────────────────────────────────
  // `liveAppts` is initialized from the SSR-rendered `data.appointments` and
  // kept in sync by two mechanisms:
  //   1. Real-time: useRealtimeAppointments calls refetchAppointments whenever
  //      the DB changes (INSERT / UPDATE / DELETE), giving <1s latency.
  //   2. Navigation: when the user changes week/day/staff, Next.js re-renders
  //      this component with new `data` props — the effect below reconciles.
  const [liveAppts, setLiveAppts] = React.useState<CalendarioAppointment[]>(data.appointments)
  const [syncError, setSyncError] = React.useState<Error | null>(null)

  // Sync with fresh SSR data on navigation (week change, staff filter, etc.).
  // Uses reference equality so it only fires when the server actually returns
  // new props, not on local state changes.
  const dataRef = React.useRef(data)
  React.useEffect(() => {
    if (dataRef.current !== data) {
      dataRef.current = data
      setLiveAppts(data.appointments)
    }
  }, [data])

  // End-of-week boundary used for both the realtime filter and the refetch.
  const weekEnd = React.useMemo(() => addDays(weekStart, 7), [weekStart])

  /**
   * Fetches the full joined appointments (client name + services) for the
   * current week/staff via a server action and updates liveAppts.
   * Called by the realtime subscription on any INSERT / UPDATE / DELETE.
   */
  const refetchAppointments = React.useCallback(async () => {
    setSyncError(null)
    try {
      const fresh = await getCalendarioData(tenantId, weekStart, selectedStaffId)
      setLiveAppts(fresh.appointments)
    } catch (caught) {
      setSyncError(
        caught instanceof Error
          ? caught
          : new Error('Errore durante la sincronizzazione degli appuntamenti.')
      )
    }
  }, [tenantId, weekStart, selectedStaffId])

  // Subscribe to Supabase Realtime.  Uses trigger-only mode so the hook does
  // NOT maintain its own state — it just calls refetchAppointments whenever a
  // change arrives on the appointments table for this tenant/week.
  const {
    loading: realtimeLoading,
    error: realtimeError,
  } = useRealtimeAppointments({
    tenantId,
    staffId: selectedStaffId ?? undefined,
    startDate: weekStart,
    endDate: weekEnd,
    onDataChange: refetchAppointments,
  })

  const visibleRealtimeError = syncError ?? realtimeError
  const showInitialRealtimeSpinner = realtimeLoading && liveAppts.length === 0

  const [isMobile, setIsMobile]         = React.useState(false)
  const [view, setView]                 = React.useState<CalendarView>(dayView ? 'Giorno' : 'Settimana')
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [detailAppt, setDetailAppt]     = React.useState<CalendarioAppointment | null>(null)
  const [newApptCell, setNewApptCell]   = React.useState<{ date: string; hour: number } | null>(null)
  const [staffPickerOpen, setStaffPickerOpen] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const effectiveView: CalendarView = isMobile ? 'Giorno' : view

  const todayStr  = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const activeDayStr = dayView ?? todayStr

  // 6-column week (Mon–Sat)
  const dayDates = React.useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const todayAppts = React.useMemo(
    () => liveAppts.filter((a) => a.start_time.slice(0, 10) === todayStr),
    [liveAppts, todayStr]
  )
  const completedToday = React.useMemo(
    () => todayAppts.filter((a) => a.status === 'completed').length,
    [todayAppts]
  )
  const remainingToday = React.useMemo(
    () => todayAppts.filter((a) => ['confirmed', 'pending'].includes(a.status)).length,
    [todayAppts]
  )
  const todayRevenue = React.useMemo(
    () => todayAppts.reduce((sum, a) => sum + (a.total_price ?? 0), 0),
    [todayAppts]
  )
  const avgTicket = React.useMemo(
    () => todayAppts.length > 0 ? todayRevenue / todayAppts.length : 0,
    [todayAppts, todayRevenue]
  )
  const nextEmptySlot = React.useMemo(() => findNextEmptySlot(todayAppts), [todayAppts])

  const dayComparison = React.useMemo(() => {
    const dow = new Date(todayStr + 'T12:00:00').getDay()
    if (dow <= 1) return null
    const prev = addDays(todayStr, -1)
    const tc   = liveAppts.filter((a) => a.start_time.slice(0, 10) === todayStr).length
    const pc   = liveAppts.filter((a) => a.start_time.slice(0, 10) === prev).length
    return { diff: tc - pc, dayLabel: DAYS_ABBR[new Date(prev + 'T12:00:00').getDay()] }
  }, [liveAppts, todayStr])

  const staffColorMap = React.useMemo(() => {
    const cols = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']
    const map: Record<string, string> = {}
    data.staff.forEach((s, i) => { map[s.id] = cols[i % cols.length] })
    return map
  }, [data.staff])

  function navigate(dir: -1 | 1) {
    if (view === 'Giorno') {
      const newDay = addDays(activeDayStr, dir)
      const p = new URLSearchParams({ day: newDay })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    } else {
      const p = new URLSearchParams({ week: addDays(weekStart, dir * 7) })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    }
  }

  function navigateToDate(dateStr: string) {
    const p = new URLSearchParams({ week: dateStr })
    if (selectedStaffId) p.set('staff', selectedStaffId)
    router.push(`/calendario?${p}`)
  }

  function handleViewChange(v: CalendarView) {
    if (v === view) return
    setIsTransitioning(true)
    setTimeout(() => {
      setView(v)
      setIsTransitioning(false)
      if (v === 'Giorno') {
        const p = new URLSearchParams({ day: todayStr })
        if (selectedStaffId) p.set('staff', selectedStaffId)
        router.push(`/calendario?${p}`)
      } else if (v === 'Settimana') {
        const p = new URLSearchParams({ week: weekStart })
        if (selectedStaffId) p.set('staff', selectedStaffId)
        router.push(`/calendario?${p}`)
      }
    }, 150)
  }

  function selectStaff(id: string | null) {
    if (view === 'Giorno') {
      const p = new URLSearchParams({ day: activeDayStr })
      if (id) p.set('staff', id)
      router.push(`/calendario?${p}`)
    } else {
      const p = new URLSearchParams({ week: weekStart })
      if (id) p.set('staff', id)
      router.push(`/calendario?${p}`)
    }
  }

  const isCellWorking = React.useCallback(
    (date: string, hour: number, dayIdx: number): boolean => {
      if (data.staff.length === 0) return true
      const check = selectedStaffId
        ? data.staff.filter((s) => s.id === selectedStaffId)
        : data.staff
      return check.some((s) =>
        isHourWorking(s.id, dayIdx, date, hour, data.workingHours, data.overrides)
      )
    },
    [data.staff, data.workingHours, data.overrides, selectedStaffId]
  )

  // Shared renderer for a single day column (used in both week and day views)
  const renderDayColumn = React.useCallback((date: string, dayIdx: number, isFullWidth: boolean) => {
    const dayAppts = liveAppts.filter((a) => a.start_time.slice(0, 10) === date)
    const todayCol = isToday(date)
    return (
      <div key={date} style={{ flex: 1, borderRight: isFullWidth ? 'none' : dayIdx < 5 ? '1px solid #F0F0F0' : 'none', background: todayCol ? 'rgba(17,24,39,0.015)' : 'transparent' }}>
        <div style={{ position: 'relative' }}>
          {HOURS.map((h) => {
            const working = isCellWorking(date, h, dayIdx)
            return (
              <div
                key={h}
                onClick={() => setNewApptCell({ date, hour: h })}
                style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F9FAFB', background: working ? 'transparent' : 'rgba(0,0,0,0.012)', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(17,24,39,0.04)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = working ? 'transparent' : 'rgba(0,0,0,0.012)' }}
              />
            )
          })}

          {dayAppts.map((appt) => {
            const { top, height } = getApptPosition(appt, timezone)
            const serviceColor = appt.services[0]?.color || '#888888'
            const col = { border: serviceColor, bg: serviceColor + '26' }
            const dur       = getDurationMin(appt)
            const compact   = height <= 36
            const sb        = STATUS_BADGE[appt.status] ?? { bg: '#F3F4F6', text: '#374151' }
            const isDone    = appt.status === 'completed' || appt.status === 'cancelled'
            const textDeco  = appt.status === 'cancelled' ? 'line-through' as const : 'none' as const
            const textColor = '#111827'
            const subColor  = '#6B7280'
            let opacity = 1
            if (appt.status === 'cancelled') opacity = 0.32
            else if (appt.status === 'completed') opacity = 0.55
            else if (appt.status === 'pending')   opacity = 0.72

            return (
              <div
                key={appt.id}
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setDetailAppt(appt) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDetailAppt(appt) } }}
                style={{
                  position: 'absolute', top: top + 2, left: 3, right: 3, height: height - 4,
                  background: col.bg, borderRadius: 10, opacity,
                  borderLeft: `3px solid ${col.border}`,
                  padding: compact ? '3px 6px' : '6px 8px',
                  cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                  transition: 'transform 80ms ease',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1.02)'; el.style.zIndex = '10' }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1)'; el.style.zIndex = '2' }}
              >
                {compact ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: textColor, textDecoration: textDeco, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {appt.client_name}
                    </span>
                    <span style={{ fontSize: 9, color: subColor, flexShrink: 0 }}>
                      {formatTime(appt.start_time, timezone)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 100, background: serviceColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.6)' }}>
                        {getInitials(appt.client_name)}
                      </div>
                      {isDone ? (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 100, background: todayCol ? 'rgba(255,255,255,0.15)' : sb.bg, color: todayCol ? '#fff' : sb.text, whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[appt.status] ?? appt.status}
                        </span>
                      ) : (
                        <span
                          style={{ color: subColor, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setDetailAppt(appt) }}
                        >
                          ···
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: textColor, textDecoration: textDeco, whiteSpace: 'normal', lineHeight: 1.2, marginBottom: 1, wordBreak: 'break-word' }}>
                      {appt.client_name}
                    </div>
                    <div style={{ fontSize: 10, color: subColor, lineHeight: 1.3 }}>
                      {formatTime(appt.start_time, timezone)}–{formatTime(appt.end_time, timezone)} · {dur}min
                    </div>
                    <div style={{ fontSize: 10, color: subColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, marginTop: 1 }}>
                      {appt.services.length > 0 ? appt.services.map((s) => s.name).join(' + ') : '–'}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [liveAppts, isCellWorking, setNewApptCell, setDetailAppt, timezone])

  return (
    <CalendarioMainLayout
      tenantId={tenantId}
      weekStart={weekStart}
      activeDayStr={activeDayStr}
      todayStr={todayStr}
      dayDates={dayDates}
      data={data}
      currentStaffId={currentStaffId}
      isManagerOrOwner={isManagerOrOwner}
      selectedStaffId={selectedStaffId}
      timezone={timezone}
      isMobile={isMobile}
      view={view}
      effectiveView={effectiveView}
      isTransitioning={isTransitioning}
      staffPickerOpen={staffPickerOpen}
      setStaffPickerOpen={setStaffPickerOpen}
      detailAppt={detailAppt}
      setDetailAppt={setDetailAppt}
      newApptCell={newApptCell}
      setNewApptCell={setNewApptCell}
      showInitialRealtimeSpinner={showInitialRealtimeSpinner}
      visibleRealtimeError={visibleRealtimeError}
      staffColorMap={staffColorMap}
      completedToday={completedToday}
      todayAppts={todayAppts}
      remainingToday={remainingToday}
      todayRevenue={todayRevenue}
      avgTicket={avgTicket}
      nextEmptySlot={nextEmptySlot}
      dayComparison={dayComparison}
      navigate={navigate}
      navigateToDate={navigateToDate}
      handleViewChange={handleViewChange}
      selectStaff={selectStaff}
      renderDayColumn={renderDayColumn}
      router={router}
    />
  )
}
