import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'
import { MobileTopBar } from '@/components/dashboard/MobileTopBar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { MainContent } from '@/components/dashboard/MainContent'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      <TopBar />
      <Sidebar />
      <MobileTopBar />
      <BottomNav />
      <MainContent>{children}</MainContent>
    </div>
  )
}
