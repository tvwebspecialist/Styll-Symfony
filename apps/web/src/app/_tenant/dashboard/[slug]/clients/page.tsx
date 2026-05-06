interface Props {
  params: Promise<{ slug: string }>
}

export default async function ClientsPage({ params }: Props) {
  const { slug } = await params
  return <p>Clients for {slug}</p>
}
