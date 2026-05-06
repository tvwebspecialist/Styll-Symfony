interface Props {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export default async function DashboardLayout({ params: _params, children }: Props) {
  return <>{children}</>
}
