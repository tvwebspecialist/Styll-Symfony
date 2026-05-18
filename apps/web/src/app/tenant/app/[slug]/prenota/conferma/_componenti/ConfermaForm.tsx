'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createGuestBooking } from '@/lib/actions/create-booking'
import type {
  PublicLocation,
  PublicService,
  PublicStaffMember,
} from '@/lib/actions/public-booking'

interface ConfermaFormProps {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  serviceIds: string[]
  date: string
  time: string
  location: PublicLocation
  staff: PublicStaffMember
  services: PublicService[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00Z`))
}

export function ConfermaForm({
  slug,
  tenantId,
  locationId,
  staffId,
  serviceIds,
  date,
  time,
  location,
  staff,
  services,
}: ConfermaFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)

  const totalPrice = useMemo(() => services.reduce((total, service) => total + service.price, 0), [services])
  const totalDuration = useMemo(
    () => services.reduce((total, service) => total + service.duration_minutes, 0),
    [services]
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await createGuestBooking({
        slug,
        tenantId,
        locationId,
        staffId,
        serviceIds,
        date,
        time,
        fullName,
        phone,
        email,
        notes,
        marketingConsent,
      })

      if (!result.success || !result.appointmentId) {
        toast.error(result.error ?? 'Non siamo riusciti a confermare la prenotazione.')
        return
      }

      toast.success('Prenotazione confermata!')
      router.replace(`/tenant/app/${slug}/prenota/successo?appointment=${result.appointmentId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Conferma</h1>
        <p className="text-sm text-muted-foreground">Controlla il riepilogo e inserisci i tuoi dati per bloccare l’orario scelto.</p>
      </div>

      <Card className="rounded-3xl border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
        <CardHeader>
          <CardTitle>Riepilogo prenotazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Servizi</p>
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(service.price)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Quando</p>
              <p className="font-semibold">{formatDate(date)} alle {time}</p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Durata stimata</p>
              <p className="font-semibold">{totalDuration} minuti</p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Barbiere</p>
              <p className="font-semibold">{staff.full_name ?? 'Staff Styll'}</p>
            </div>
            <div className="rounded-2xl bg-background px-4 py-3">
              <p className="text-sm text-muted-foreground">Sede</p>
              <p className="font-semibold">{location.name}</p>
              <p className="text-sm text-muted-foreground">{[location.address, location.city].filter(Boolean).join(', ')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-background px-4 py-3">
            <span className="font-medium">Totale</span>
            <span className="text-lg font-semibold">{formatCurrency(totalPrice)}</span>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Nome e cognome
            </label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Mario Rossi"
              className="min-h-[44px] rounded-2xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Telefono
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="333 1234567"
              className="min-h-[44px] rounded-2xl"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email opzionale
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mario@email.it"
              className="min-h-[44px] rounded-2xl"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Note opzionali
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Preferenze, dettagli utili o richieste particolari"
              className="min-h-[120px] w-full rounded-2xl border border-input bg-transparent px-4 py-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-4 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(event) => setMarketingConsent(event.target.checked)}
            className="mt-1 size-4 accent-[var(--brand-primary)]"
          />
          <span>
            Acconsento a ricevere comunicazioni promozionali, aggiornamenti e offerte dedicate da questo salone.
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-4 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Conferma in corso...' : 'Conferma prenotazione'}
        </button>
      </form>
    </div>
  )
}
