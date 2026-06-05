'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CalendarPlus, ArrowRight } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface BookingSuccessModalProps {
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
}

function buildGCalLink(title: string, startISO: string, endISO: string, location: string) {
  const formatForGoogle = (value: string) =>
    value.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatForGoogle(startISO)}/${formatForGoogle(endISO)}`,
    location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function BookingSuccessModal({
  formattedDate,
  formattedTime,
  totalDuration,
  date,
  time,
  businessName,
  locationName,
  locationAddress,
  locationCity,
  primaryColor,
  slug,
}: BookingSuccessModalProps) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)

  const startISO = `${date}T${time}Z`
  const endISO = new Date(new Date(startISO).getTime() + totalDuration * 60 * 1000).toISOString()
  const locationStr = [locationName, locationAddress, locationCity].filter(Boolean).join(', ')
  const calendarLink = buildGCalLink(`Prenotazione da ${businessName}`, startISO, endISO, locationStr)

  return (
    <>
      {/* Non-dismissable overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" aria-hidden="true" />

      {/* Floating panel */}
      <motion.div
        className="fixed bottom-6 left-4 right-4 z-50 bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.22)]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        role="dialog"
        aria-label="Prenotazione confermata"
      >
        <div className="px-6 pt-8 pb-7 flex flex-col items-center gap-5">

          {/* Check image */}
          <Image
            src="/img/ceck.png"
            alt="Prenotazione confermata"
            width={80}
            height={80}
            className="object-contain"
          />

          {/* Text */}
          <div className="text-center space-y-1.5">
            <h2
              className="text-[22px] font-bold text-gray-900 leading-tight"
              style={{ fontFamily: 'var(--font-tenant, inherit)' }}
            >
              Prenotazione confermata!
            </h2>
            <p className="text-[14px] text-gray-500">
              Ti aspettiamo{' '}
              <span className="capitalize">{formattedDate}</span>
              {' '}alle{' '}
              <span className="font-medium text-gray-700">{formattedTime}</span>.
            </p>
          </div>

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 mt-1">
            <button
              onClick={() => router.replace(tenantPath(''))}
              className="w-full py-4 rounded-2xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Visualizza appuntamento</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={calendarLink}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 border transition-all active:scale-[0.98]"
              style={{ color: primaryColor, borderColor: `${primaryColor}40` }}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Aggiungi al calendario</span>
            </a>
          </div>

        </div>
      </motion.div>
    </>
  )
}
