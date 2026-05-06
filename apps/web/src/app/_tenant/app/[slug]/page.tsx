interface Props {
  params: Promise<{ slug: string }>
}

export default async function AppHomePage({ params }: Props) {
  const { slug } = await params
  return <p>PWA home for {slug}</p>
}
