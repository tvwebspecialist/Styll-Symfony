import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-14 rounded-2xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </main>
  )
}
