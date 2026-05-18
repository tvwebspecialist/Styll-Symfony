import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPublicLocations } from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PrenotaPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const locations = await getPublicLocations(tenant.tenant_id)

  if (locations.length === 1) {
    redirect(`/tenant/app/${slug}/prenota/barbiere?location=${locations[0].id}&_skip=sede`)
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Scegli la sede</h1>
          <p className="text-sm text-muted-foreground">
            Seleziona il punto vendita che preferisci per continuare con la prenotazione.
          </p>
        </div>

        <div className="grid gap-4">
          {locations.map((location) => (
            <Link
              key={location.id}
              href={`/tenant/app/${slug}/prenota/barbiere?location=${location.id}`}
              className="block"
            >
              <Card className="rounded-3xl transition-transform hover:-translate-y-0.5">
                {location.photo_url ? (
                  <img src={location.photo_url} alt={location.name} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    <span className="text-base font-medium">{location.name}</span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{location.name}</CardTitle>
                  <CardDescription>
                    {[location.address, location.city].filter(Boolean).join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex min-h-[44px] items-center rounded-2xl text-sm font-medium text-[var(--brand-primary)]">
                    Continua con questa sede →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
