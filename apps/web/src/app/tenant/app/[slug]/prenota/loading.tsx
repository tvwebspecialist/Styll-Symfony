import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-5 w-full rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
    </div>
  )
}
