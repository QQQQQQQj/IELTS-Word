import { Outlet } from 'react-router-dom'
import AppBootstrap from '../../app/AppBootstrap'
import InstallHint from '../../app/InstallHint'
import NetworkStatus from '../../app/NetworkStatus'
import PwaUpdatePrompt from '../../app/PwaUpdatePrompt'
import BottomNav from './BottomNav'

/**
 * Mobile-first shell: brand header, routed content and bottom navigation.
 * Safe-area padding comes from the root stylesheet.
 */
export default function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper text-ink">
      <PwaUpdatePrompt />
      <NetworkStatus />
      <InstallHint />
      <header className="px-5 pb-1 pt-4">
        <h1 className="text-lg font-semibold tracking-wide">IELTS Word</h1>
      </header>
      <main className="flex-1 px-5 pb-6">
        <AppBootstrap>
          <Outlet />
        </AppBootstrap>
      </main>
      <BottomNav />
    </div>
  )
}
