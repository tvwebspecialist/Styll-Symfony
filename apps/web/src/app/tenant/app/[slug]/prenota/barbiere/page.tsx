import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { getStaffForBooking } from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

function getInitials(value: string | null): string {
  if (!value) return 'ST'
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default async function BarbierePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedParams] = await Promise.all([params, searchParams])
  const locationId = readParam(resolvedParams.location)
  const skipParam = readParam(resolvedParams._skip) ?? ''
  const tp = await createTenantPaths(slug)

  if (!locationId) {
    redirect(tp('/prenota'))
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const { staff, autoSelected } = await getStaffForBooking(tenant.tenant_id, locationId)

  if (autoSelected) {
    const newSkip = [...skipParam.split(',').filter(Boolean), 'barbiere'].join(',')
    redirect(
      tp(`/prenota/servizi?location=${locationId}&staff=${staff[0].id}&_skip=${newSkip}`)
    )
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Scegli il barbiere</h1>
          <p className="text-sm text-muted-foreground">
            Seleziona il professionista con cui vuoi prenotare.
          </p>
        </div>

        {staff.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            Nessun barbiere disponibile per questa sede al momento.
          </div>
        ) : (
          <div className="space-y-4">
            {staff.map((member) => {
              const servicesLabel =
                member.services.length > 0
                  ? member.services.map((s) => s.name).join(', ')
                  : 'Consulta disponibilità'

              const href = tp(`/prenota/servizi?location=${locationId}&staff=${member.id}${skipParam ? `&_skip=${skipParam}` : ''}`)

              return (
                <Link key={member.id} href={href} className="block">
                  <Card className="rounded-3xl transition-transform hover:-translate-y-0.5">
                    <CardContent className="flex items-center gap-4 py-5">
                      <Avatar className="size-14 shrink-0">
                        <AvatarImage
                          src={member.avatar_url ?? undefined}
                          alt={member.full_name ?? 'Staff'}
                        />
                        <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <p className="text-base font-semibold">
                          {member.full_name ?? 'Barbiere'}
                        </p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {servicesLabel}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
