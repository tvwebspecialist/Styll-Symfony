'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setWorkingHours, type DaySlot } from '@/app/admin/actions'

interface Staff {
  id: string
  profile?: { full_name: string | null; email: string | null } | null
}

interface Hour {
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

const DAYS = [
  { v: 1, label: 'Lunedì' },
  { v: 2, label: 'Martedì' },
  { v: 3, label: 'Mercoledì' },
  { v: 4, label: 'Giovedì' },
  { v: 5, label: 'Venerdì' },
  { v: 6, label: 'Sabato' },
  { v: 0, label: 'Domenica' },
]

function defaultGrid(): DaySlot[] {
  return DAYS.map((d) => ({
    day_of_week: d.v,
    is_open: d.v >= 1 && d.v <= 5,
    start_time: '09:00',
    end_time: '18:00',
  }))
}

function buildGrid(staffId: string, hours: Hour[]): DaySlot[] {
  return DAYS.map((d) => {
    const h = hours.find((x) => x.staff_id === staffId && x.day_of_week === d.v)
    if (h) {
      return {
        day_of_week: d.v,
        is_open: true,
        start_time: h.start_time.slice(0, 5),
        end_time: h.end_time.slice(0, 5),
      }
    }
    return {
      day_of_week: d.v,
      is_open: false,
      start_time: '09:00',
      end_time: '18:00',
    }
  })
}

export function WorkingHoursClient({
  tenantId,
  staff,
  hours,
}: {
  tenantId: string
  staff: Staff[]
  hours: Hour[]
}) {
  const router = useRouter()
  const [staffId, setStaffId] = React.useState<string>(staff[0]?.id ?? '')
  const [grid, setGrid] = React.useState<DaySlot[]>(() =>
    staff[0] ? buildGrid(staff[0].id, hours) : defaultGrid()
  )
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (staffId) setGrid(buildGrid(staffId, hours))
  }, [staffId, hours])

  function patchDay(idx: number, p: Partial<DaySlot>) {
    setGrid((g) => g.map((d, i) => (i === idx ? { ...d, ...p } : d)))
  }

  function save() {
    if (!staffId) {
      toast.error('Seleziona uno staff.')
      return
    }
    startTransition(async () => {
      const res = await setWorkingHours(tenantId, staffId, grid)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Orari salvati.')
      router.refresh()
    })
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Nessuno staff. Aggiungi prima dei membri staff.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="wh-staff" className="shrink-0">
          Staff
        </Label>
        <select
          id="wh-staff"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.profile?.full_name ?? s.profile?.email ?? s.id}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card">
        {grid.map((d, idx) => {
          const meta = DAYS.find((x) => x.v === d.day_of_week)!
          return (
            <div
              key={d.day_of_week}
              className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <div className="w-28 text-sm font-medium">{meta.label}</div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={d.is_open}
                  onChange={(e) => patchDay(idx, { is_open: e.target.checked })}
                />
                {d.is_open ? 'Aperto' : 'Chiuso'}
              </label>
              <div className="ml-auto flex items-center gap-2">
                <Input
                  type="time"
                  value={d.start_time}
                  disabled={!d.is_open}
                  onChange={(e) => patchDay(idx, { start_time: e.target.value })}
                  className="w-28"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="time"
                  value={d.end_time}
                  disabled={!d.is_open}
                  onChange={(e) => patchDay(idx, { end_time: e.target.value })}
                  className="w-28"
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva orari'}
        </Button>
      </div>
    </div>
  )
}
