interface Props {
  params: Promise<{ slug: string }>
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params
  return <p>Landing page for {slug}</p>
}
