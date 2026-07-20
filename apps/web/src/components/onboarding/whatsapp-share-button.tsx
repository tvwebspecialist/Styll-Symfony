'use client'

export function WhatsAppShareButton({
  businessName,
  publicUrl,
}: {
  businessName: string
  publicUrl: string
}) {
  function handleClick() {
    const text = `Prenota da ${businessName} qui: ${publicUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        borderRadius: 12,
        border: '1.5px solid #25D366',
        padding: '12px 16px',
        fontSize: 13,
        fontWeight: 700,
        color: '#25D366',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        transition: 'background 150ms, color 150ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.backgroundColor = '#25D366'
        el.style.color = '#ffffff'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.backgroundColor = '#ffffff'
        el.style.color = '#25D366'
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.118 1.533 5.843L.057 23.514a.5.5 0 0 0 .609.627l5.805-1.516A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.658-.523-5.165-1.432l-.37-.222-3.444.9.916-3.352-.241-.386A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
      Condividi su WhatsApp
    </button>
  )
}
