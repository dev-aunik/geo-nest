import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Docs',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const NAV = [
    { label: 'Overview', href: '/docs' },
    { label: 'Authentication', href: '/docs/authentication' },
    { label: 'Rate Limits', href: '/docs/rate-limits' },
    { label: 'Errors', href: '/docs/errors' },
    { label: 'Countries', href: '/docs/countries' },
    {
      label: 'Endpoints',
      items: [
        { label: 'Geo', href: '/docs/endpoints/geo' },
        { label: 'Search', href: '/docs/endpoints/search' },
        { label: 'Usage', href: '/docs/endpoints/usage' },
        { label: 'Keys', href: '/docs/endpoints/keys' },
        { label: 'Billing', href: '/docs/endpoints/billing' },
      ],
    },
    {
      label: 'Code Samples',
      items: [
        { label: 'cURL', href: '/docs/code-samples/curl' },
        { label: 'JavaScript', href: '/docs/code-samples/javascript' },
        { label: 'Python', href: '/docs/code-samples/python' },
        { label: 'Go', href: '/docs/code-samples/go' },
        { label: 'PHP', href: '/docs/code-samples/php' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#070b14]/80 backdrop-blur sticky top-0 z-10 h-16 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg flex-shrink-0">
            <Globe className="w-6 h-6 text-blue-400" />
            GeoNest
          </Link>
          <span className="text-white/20">/</span>
          <Link href="/docs" className="text-slate-400 hover:text-white text-sm">Docs</Link>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-6 py-8 gap-10">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <nav className="sticky top-24 space-y-6">
            {NAV.map((section) => (
              <div key={section.label}>
                {'href' in section ? (
                  <Link
                    href={section.href as string}
                    className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    {section.label}
                  </Link>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {section.label}
                    </div>
                    <ul className="space-y-1">
                      {section.items?.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 prose-custom">{children}</main>
      </div>
    </div>
  )
}
