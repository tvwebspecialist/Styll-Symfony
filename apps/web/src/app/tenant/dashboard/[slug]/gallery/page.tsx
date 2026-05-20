import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getGalleryPhotos } from '@/lib/actions/gallery'
import { GalleryClient } from '@/components/dashboard/gallery/GalleryClient'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const photos = await getGalleryPhotos()
  return <GalleryClient initialPhotos={photos} />
}
