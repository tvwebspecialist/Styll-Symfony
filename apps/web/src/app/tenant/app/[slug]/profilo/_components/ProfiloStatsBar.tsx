interface Props {
  upcoming: number
  completed: number
  cancelled: number
}

export function ProfiloStatsBar({ upcoming, completed, cancelled }: Props) {
  const fmt = new Intl.NumberFormat('it-IT')

  const stats = [
    { label: 'Futuri', value: upcoming },
    { label: 'Completati', value: completed },
    { label: 'Cancellati', value: cancelled },
  ]

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-neutral-100 flex overflow-hidden">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`flex-1 flex flex-col items-center py-4 ${i < stats.length - 1 ? 'border-r border-neutral-100' : ''}`}
        >
          <span className="text-[22px] font-black text-neutral-950 leading-none">
            {fmt.format(stat.value)}
          </span>
          <span className="mt-1 text-[11px] text-neutral-400 font-medium">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
