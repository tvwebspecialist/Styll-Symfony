import { CookieBanner } from '@/components/shared/CookieBanner'

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner privacyPath="/cookie" />
    </>
  )
}
