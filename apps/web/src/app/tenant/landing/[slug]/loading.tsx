export default function Loading() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Hero skeleton */}
      <div className="flex min-h-screen flex-col justify-center px-5 py-24">
        <div className="mb-6 h-14 w-14 animate-pulse rounded-xl bg-white/10" />
        <div className="mb-3 h-5 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="mb-5 h-16 w-full max-w-sm animate-pulse rounded-lg bg-white/10" />
        <div className="mb-8 h-6 w-64 animate-pulse rounded bg-white/10" />
        <div className="h-14 w-40 animate-pulse rounded-full bg-white/20" />
      </div>

      {/* Services skeleton */}
      <div className="px-5 py-20" style={{ background: '#0a0a0a' }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 h-9 w-32 animate-pulse rounded-lg bg-white/10" />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="mb-4 flex items-center justify-between border-b py-5"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-white/20" />
                <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-7 w-16 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
