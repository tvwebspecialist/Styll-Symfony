'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarPlus, ArrowRight, RefreshCw } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface SuccessVariant {
  type?: 'success'
  appointmentId: string
  formattedDate: string
  formattedTime: string
  totalDuration: number
  date: string
  time: string
  businessName: string
  locationName: string
  locationAddress?: string | null
  locationCity?: string | null
  primaryColor: string
  slug: string
  errorMessage?: undefined
  onRetry?: undefined
}

interface ErrorVariant {
  type: 'error'
  primaryColor: string
  errorMessage: string
  onRetry: () => void
  appointmentId?: undefined
  formattedDate?: undefined
  formattedTime?: undefined
  totalDuration?: undefined
  date?: undefined
  time?: undefined
  businessName?: undefined
  locationName?: undefined
  locationAddress?: undefined
  locationCity?: undefined
  slug?: undefined
}

type Props = SuccessVariant | ErrorVariant

function buildGCalLink(title: string, startISO: string, endISO: string, location: string) {
  const formatForGoogle = (v: string) =>
    v.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatForGoogle(startISO)}/${formatForGoogle(endISO)}`,
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function BookingSuccessModal(props: Props) {
  const router = useRouter()
  // useTenantPath must be called unconditionally — safe with empty string in error mode
  const tenantPath = useTenantPath(props.slug ?? '')

  const isError = props.type === 'error'
  const pulseColor = isError ? 'rgba(239,68,68,0.16)' : `${props.primaryColor}22`
  const iconSrc = isError ? '/img/Allert.png' : '/img/ceck.png'
  const iconAlt = isError ? 'Errore' : 'Prenotazione confermata'

  const calendarLink = isError
    ? '#'
    : buildGCalLink(
        `Prenotazione da ${props.businessName}`,
        `${props.date}T${props.time}Z`,
        new Date(
          new Date(`${props.date}T${props.time}Z`).getTime() +
            (props.totalDuration ?? 0) * 60_000,
        ).toISOString(),
        [props.locationName, props.locationAddress, props.locationCity]
          .filter(Boolean)
          .join(', '),
      )

  return (
    <>
      {/* Non-dismissable overlay — covers header and everything (z-[200]) */}
      <div className="fixed inset-0 bg-black/55 z-[200]" aria-hidden="true" />

      {/* Floating panel — slide-up + fade-in via framer-motion */}
      <motion.div
        className="fixed bottom-4 left-4 right-4 z-[201] bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.24)]"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        role={isError ? 'alertdialog' : 'dialog'}
        aria-live={isError ? 'assertive' : undefined}
        aria-label={isError ? 'Errore nella prenotazione' : 'Prenotazione confermata'}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-6 pt-4 pb-7 flex flex-col items-center gap-5">

          {/* Icon with pulse rings — dedicated child elements prevent will-change
              stacking context issues on Safari/iOS for the fixed panel */}
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
              src={iconSrc}
              alt={iconAlt}
              width={110}
              height={110}
              className="relative z-10 object-contain"
            />
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h2
              className="text-[24px] font-bold text-gray-900 leading-tight"
              style={{ fontFamily: 'var(--font-tenant, inherit)' }}
            >
              {isError ? 'Qualcosa è andato storto' : 'Prenotazione confermata!'}
            </h2>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              {isError ? (
                props.errorMessage
              ) : (
                <>
                  Ti aspettiamo{' '}
                  <span className="capitalize font-medium text-gray-700">
                    {props.formattedDate}
                  </span>{' '}
                  alle{' '}
                  <span className="font-semibold text-gray-800">{props.formattedTime}</span>.
                </>
              )}
            </p>
          </div>

          {/* CTAs */}
          <div className="w-full flex flex-col gap-3 mt-1">
            {isError ? (
              <button
                onClick={props.onRetry}
                className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ backgroundColor: props.primaryColor }}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Riprova</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.replace(tenantPath(''))}
                  className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: props.primaryColor }}
                >
                  <span>Visualizza appuntamento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={calendarLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 border transition-all active:scale-[0.98]"
                  style={{ color: props.primaryColor, borderColor: `${props.primaryColor}40` }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Aggiungi al calendario</span>
                </a>
              </>
            )}
          </div>

        </div>
      </motion.div>
    </>
  )
}
