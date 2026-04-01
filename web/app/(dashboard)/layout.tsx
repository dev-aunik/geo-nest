'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Globe, LayoutDashboard, Key, BarChart2, CreditCard,
  ExternalLink, LogOut, ChevronRight, Bell,
} from 'lucide-react'
import { clearTokens, getUserFromToken } from '@/lib/auth'

const PLAN_NAMES: Record<number, { name: string; color: string }> = {
  1: { name: 'Free', color: 'bg-slate-500/20 text-slate-300' },
  2: { name: 'Starter', color: 'bg-blue-500/20 text-blue-300' },
  3: { name: 'Pro', color: 'bg-violet-500/20 text-violet-300' },
  4: { name: 'Enterprise', color: 'bg-yellow-500/20 text-yellow-300' },
}

const NAV = [
  { href: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { href: '/keys', icon: Key, label: 'API Keys' },
  { href: '/usage', icon: BarChart2, label: 'Usage' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = getUserFromToken()
  const plan = user?.plan_id ? PLAN_NAMES[user.plan_id] : PLAN_NAMES[1]

  function handleLogout() {
    clearTokens()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/8 bg-[#070b14] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/8">
          <Globe className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-white text-lg">GeoNest</span>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/8">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.email || 'Loading…'}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.color}`}>
                {plan.name}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </Link>
            )
          })}

          <div className="pt-2 border-t border-white/8 mt-2">
            <a
              href="/docs"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              Documentation
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/8 bg-[#0a0f1e]/80 backdrop-blur sticky top-0 z-10">
          <div>
            {/* Breadcrumb based on current path */}
            <h2 className="text-white font-semibold capitalize">
              {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
