export interface VisitItem {
  id: string
  startTime: string
  serviceNames: string[]
  staffName: string
  pointsEarned: number
}

interface VisitHistoryProps {
  visits: VisitItem[]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function VisitHistory({ visits }: VisitHistoryProps) {
  if (visits.length === 0) return null

  const fmt = new Intl.NumberFormat('it-IT')

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="text-base font-bold text-neutral-950">Le tue ultime visite</h2>
      <div className="mt-4 divide-y divide-neutral-100">
        {visits.map((visit) => (
          <div
            key={visit.id}
            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-neutral-950">{formatDate(visit.startTime)}</p>
              <p className="mt-0.5 truncate text-sm text-neutral-500">
                {visit.serviceNames.length > 0 ? visit.serviceNames.join(' + ') : 'Servizio'}
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">con {visit.staffName}</p>
            </div>
            {visit.pointsEarned > 0 && (
              <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                +{fmt.format(visit.pointsEarned)} pt
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
