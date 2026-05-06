interface Props {
  params: Promise<{ slug: string }>
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  return <p>Booking for {slug}</p>
}
