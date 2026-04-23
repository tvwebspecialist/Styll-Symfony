interface TenantPageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { slug } = await params
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">{slug}</h1>
      <p className="text-muted-foreground mt-2">Prenota il tuo appuntamento</p>
      {/* TODO: BookingFlow */}
    </main>
  )
}
