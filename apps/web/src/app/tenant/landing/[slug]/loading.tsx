import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </main>
  )
}
