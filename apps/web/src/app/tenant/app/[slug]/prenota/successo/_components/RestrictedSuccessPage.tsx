import Image from 'next/image'
import Link from 'next/link'

interface Props {
  homeHref: string
  brandColor?: string
}

export function RestrictedSuccessPage({
  homeHref,
  brandColor = '#1a1a1a',
}: Props) {
  const pulseColor = `${brandColor}20`

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div
        className="flex flex-col gap-5 pb-10"
        style={{ animation: 'fadeSlideUp 0.45s ease both' }}
      >
        <div className="flex flex-col items-center gap-4 text-center pt-2">
          <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: pulseColor, animation: 'pulse-ring 2.4s ease-out infinite' }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: pulseColor, animation: 'pulse-ring 2.4s ease-out 0.8s infinite' }}
              aria-hidden="true"
            />
            <Image
              src="/img/Allert.png"
              alt="Dettagli non disponibili"
              width={110}
              height={110}
              className="relative z-10 object-contain"
              priority
            />
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-[26px] font-bold tracking-tight text-gray-900"
              style={{ fontFamily: 'var(--font-tenant, inherit)' }}
            >
              Dettagli non disponibili
            </h1>
            <p className="text-[14px] text-gray-500">
              Per vedere il riepilogo di questo appuntamento usa il link completo ricevuto nella
              conferma. Se hai un account, puoi anche accedere all&apos;app del salone.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <p className="text-[14px] leading-relaxed text-gray-600">
            Questo link risulta incompleto, scaduto oppure richiede un accesso valido per mostrare i
            dettagli della prenotazione.
          </p>
        </div>

        <Link
          href={homeHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl px-4 py-3 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: brandColor }}
        >
          Torna alla home
        </Link>
      </div>
    </main>
  )
}
