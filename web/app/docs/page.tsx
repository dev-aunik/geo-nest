import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Key, Zap, AlertCircle, Globe, Code2, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'GeoNest API documentation — quick start, authentication, endpoints and more.',
}

const DOC_SECTIONS = [
  {
    icon: BookOpen,
    title: 'Quick Start',
    desc: '5 minutes to your first API call.',
    href: '/docs/quickstart',
    color: 'text-blue-400 bg-blue-500/10',
  },
  {
    icon: Key,
    title: 'Authentication',
    desc: 'How API keys work and where to send them.',
    href: '/docs/authentication',
    color: 'text-green-400 bg-green-500/10',
  },
  {
    icon: Zap,
    title: 'Rate Limits',
    desc: 'Limits per plan, headers, handling 429.',
    href: '/docs/rate-limits',
    color: 'text-yellow-400 bg-yellow-500/10',
  },
  {
    icon: AlertCircle,
    title: 'Errors',
    desc: 'Full error code table and how to handle them.',
    href: '/docs/errors',
    color: 'text-red-400 bg-red-500/10',
  },
  {
    icon: Globe,
    title: 'Countries',
    desc: 'Supported countries, level names, area counts.',
    href: '/docs/countries',
    color: 'text-violet-400 bg-violet-500/10',
  },
  {
    icon: Code2,
    title: 'Endpoints',
    desc: 'Full reference for all API endpoints.',
    href: '/docs/endpoints/geo',
    color: 'text-cyan-400 bg-cyan-500/10',
  },
]

const NAV_LINKS = [
  { label: 'Quick Start', href: '/docs/quickstart' },
  { label: 'Authentication', href: '/docs/authentication' },
  { label: 'Rate Limits', href: '/docs/rate-limits' },
  { label: 'Errors', href: '/docs/errors' },
  { label: 'Countries', href: '/docs/countries' },
  {
    label: 'Endpoints',
    children: [
      { label: 'Geo', href: '/docs/endpoints/geo' },
      { label: 'Search', href: '/docs/endpoints/search' },
      { label: 'Usage', href: '/docs/endpoints/usage' },
      { label: 'Keys', href: '/docs/endpoints/keys' },
      { label: 'Billing', href: '/docs/endpoints/billing' },
    ],
  },
  {
    label: 'Code Samples',
    children: [
      { label: 'cURL', href: '/docs/code-samples/curl' },
      { label: 'JavaScript', href: '/docs/code-samples/javascript' },
      { label: 'Python', href: '/docs/code-samples/python' },
      { label: 'Go', href: '/docs/code-samples/go' },
      { label: 'PHP', href: '/docs/code-samples/php' },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Header */}
      <header className="border-b border-white/8 bg-[#070b14]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-white text-lg">
            <Globe className="w-6 h-6 text-blue-400" />
            GeoNest
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <Link href="/docs" className="text-white font-medium">Docs</Link>
            <Link href="/#pricing" className="hover:text-white">Pricing</Link>
            <Link href="/dashboard/overview" className="hover:text-white">Dashboard</Link>
          </nav>
          <Link
            href="/register"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16 max-w-2xl">
          <h1 className="text-4xl font-extrabold text-white mb-4">Documentation</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Everything you need to integrate GeoNest into your application.
            Geographic hierarchy data for 6 countries, available via a simple REST API.
          </p>
        </div>

        {/* Quick nav grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {DOC_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group p-5 bg-white/3 border border-white/8 hover:border-blue-500/30 rounded-2xl transition-all hover:-translate-y-0.5"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold mb-1 flex items-center gap-1">
                {s.title}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="text-slate-400 text-sm">{s.desc}</p>
            </Link>
          ))}
        </div>

        {/* Quick start inline */}
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Start</h2>

          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'Get your API key',
                content: (
                  <p className="text-slate-400">
                    <Link href="/register" className="text-blue-400 hover:underline">Create a free account</Link> to get your API key.
                    The free tier includes 500 requests per day.
                  </p>
                ),
              },
              {
                step: '2',
                title: 'Make your first request',
                content: (
                  <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto">
                    {`curl -X GET "https://api.geonest.io/v1/geo/bd/l1" \\
  -H "X-API-Key: gn_live_your_key_here"`}
                  </pre>
                ),
              },
              {
                step: '3',
                title: 'Parse the response',
                content: (
                  <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto">
                    {`{
  "data": [
    {
      "id": 1,
      "country_code": "bd",
      "level": 1,
      "level_label": "division",
      "name": "Dhaka",
      "_links": {
        "self": "/v1/geo/bd/l1/1",
        "children": "/v1/geo/bd/l1/1/children",
        "ancestors": "/v1/geo/bd/l1/1/ancestors"
      }
    }
  ],
  "count": 8,
  "country_code": "bd",
  "level": 1
}`}
                  </pre>
                ),
              },
            ].map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold text-sm">
                  {step.step}
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-white font-semibold mb-3">{step.title}</h3>
                  {step.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
