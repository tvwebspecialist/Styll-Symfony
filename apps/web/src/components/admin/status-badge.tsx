import { cn } from '@/lib/utils'

type Status = 'active' | 'inactive' | 'suspended' | 'pending' | 'trial' | string

const STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  trial: 'bg-violet-50 text-violet-700 border-violet-200',
  default: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

const LABELS: Record<string, string> = {
  active: 'Attivo',
  inactive: 'Inattivo',
  suspended: 'Sospeso',
  pending: 'In attesa',
  trial: 'Trial',
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const key = String(status ?? '').toLowerCase()
  const style = STYLES[key] ?? STYLES.default
  const label = LABELS[key] ?? String(status ?? '—')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}
