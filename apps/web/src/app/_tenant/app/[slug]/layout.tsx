interface Props {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export default async function AppLayout({ params: _params, children }: Props) {
  return <>{children}</>
}
