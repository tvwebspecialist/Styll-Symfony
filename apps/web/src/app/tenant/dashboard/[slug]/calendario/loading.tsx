export default function CalendarioLoading() {
  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 168px)', overflow: 'hidden' }}>

      {/* ── CENTER ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <div className="animate-pulse" style={{ width: 200, height: 32, borderRadius: 8, background: '#E5E7EB' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="animate-pulse" style={{ width: 144, height: 32, borderRadius: 100, background: '#E5E7EB' }} />
            <div className="animate-pulse" style={{ width: 32, height: 32, borderRadius: 100, background: '#E5E7EB' }} />
            <div className="animate-pulse" style={{ width: 32, height: 32, borderRadius: 100, background: '#E5E7EB' }} />
          </div>
        </div>

        {/* Calendar card skeleton */}
        <div style={{ flex: 1, background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Day headers */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
            <div style={{ width: 52, flexShrink: 0, height: 52, borderRight: '1px solid #F0F0F0' }} />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, borderRight: i < 6 ? '1px solid #F0F0F0' : 'none' }}>
                <div className="animate-pulse" style={{ width: 22, height: 9, borderRadius: 4, background: '#E5E7EB' }} />
                <div className="animate-pulse" style={{ width: 28, height: 28, borderRadius: 100, background: '#E5E7EB' }} />
              </div>
            ))}
          </div>
          {/* Grid */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid #F0F0F0' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ height: 64, borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5 }}>
                  <div className="animate-pulse" style={{ width: 30, height: 9, borderRadius: 4, background: '#E5E7EB' }} />
                </div>
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} style={{ flex: 1, borderRight: col < 6 ? '1px solid #F0F0F0' : 'none', position: 'relative' }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ height: 64, borderBottom: '1px solid #F9FAFB' }} />
                ))}
                {col % 3 !== 2 && (
                  <div className="animate-pulse" style={{ position: 'absolute', top: ((col * 43 + 30) % 5) * 64 + 4, left: 3, right: 3, height: 56 + (col * 17) % 40, borderRadius: 10, background: '#E5E7EB' }} />
                )}
                {col % 2 === 0 && (
                  <div className="animate-pulse" style={{ position: 'absolute', top: ((col * 67 + 180) % 5) * 64 + 4, left: 3, right: 3, height: 40 + (col * 11) % 36, borderRadius: 10, background: '#E5E7EB' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ width: 292, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Card 1 */}
        <div className="animate-pulse" style={{ height: 88, borderRadius: 16, background: '#E5E7EB' }} />
        {/* Card 2 mini cal */}
        <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="animate-pulse" style={{ width: 100, height: 14, borderRadius: 4, background: '#E5E7EB' }} />
            <div className="animate-pulse" style={{ width: 48, height: 22, borderRadius: 6, background: '#E5E7EB' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="animate-pulse" style={{ height: 24, borderRadius: 100, background: '#E5E7EB', margin: '1px auto', width: 24 }} />
            ))}
          </div>
        </div>
        {/* Card 3 overview */}
        <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', padding: '16px 18px' }}>
          <div className="animate-pulse" style={{ width: 120, height: 14, borderRadius: 4, background: '#E5E7EB', marginBottom: 14 }} />
          <div className="animate-pulse" style={{ width: 112, height: 60, borderRadius: 8, background: '#E5E7EB', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="animate-pulse" style={{ width: '70%', height: 11, borderRadius: 4, background: '#E5E7EB' }} />
            <div className="animate-pulse" style={{ width: '55%', height: 11, borderRadius: 4, background: '#E5E7EB' }} />
          </div>
        </div>
        {/* Card 4 slot */}
        <div className="animate-pulse" style={{ height: 120, borderRadius: 16, background: '#E5E7EB' }} />
      </div>
    </div>
  )
}
