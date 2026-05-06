interface Props {
  params: Promise<{ slug: string }>
}

export default async function AnalyticsPage({ params }: Props) {
  const { slug } = await params
  return <p>Analytics for {slug}</p>
}
