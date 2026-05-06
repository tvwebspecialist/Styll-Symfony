interface Props {
  params: Promise<{ slug: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params
  return <p>Dashboard for {slug}</p>
}
