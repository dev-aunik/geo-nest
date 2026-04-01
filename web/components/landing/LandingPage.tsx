'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Globe, Zap, Shield, Code2, ChevronRight, Check, Copy,
  Menu, X, ArrowRight, BarChart3, Lock, Layers,
  Sun, Moon, Github, ExternalLink
} from 'lucide-react'

// ── Country data ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'bd', flag: '🇧🇩', name: 'Bangladesh', levels: 4, areas: '5,100+', labelSuffix: '4 levels · divisions → unions' },
  { code: 'lk', flag: '🇱🇰', name: 'Sri Lanka', levels: 4, areas: '14,400+', labelSuffix: '4 levels · provinces → GN divisions' },
  { code: 'np', flag: '🇳🇵', name: 'Nepal', levels: 4, areas: '7,580+', labelSuffix: '4 levels · provinces → wards' },
  { code: 'in', flag: '🇮🇳', name: 'India', levels: 3, areas: '6,800+', labelSuffix: '3 levels · states → sub-districts' },
  { code: 'us', flag: '🇺🇸', name: 'United States', levels: 4, areas: '78,000+', labelSuffix: '4 levels · states → ZIP codes' },
  { code: 'jp', flag: '🇯🇵', name: 'Japan', levels: 3, areas: '20,800+', labelSuffix: '3 levels · prefectures → wards' },
]

const STATS = [
  { label: 'Countries', value: '6' },
  { label: 'Total Areas', value: '133K+' },
  { label: 'P99 Latency', value: '<5ms' },
  { label: 'Free Tier', value: '500/day' },
]

const PLANS = [
  {
    name: 'Free', price: '$0', period: '/mo', highlight: false,
    requests: '500 req/day', perMin: '10/min', keys: '1 API key',
    features: ['JSON format', '3 hierarchy levels', 'Community support'],
    cta: 'Get started free', href: '/register',
  },
  {
    name: 'Starter', price: '$9', period: '/mo', highlight: false,
    requests: '50,000 req/day', perMin: '100/min', keys: '3 API keys',
    features: ['JSON & CSV formats', '4 hierarchy levels', 'Full-text search', 'Reverse geocode', 'Email support'],
    cta: 'Start free trial', href: '/register?plan=starter',
  },
  {
    name: 'Pro', price: '$29', period: '/mo', highlight: true, badge: 'Most Popular',
    requests: '500,000 req/day', perMin: '600/min', keys: '10 API keys',
    features: ['JSON, CSV & XML', '4 hierarchy levels', 'Full-text search', 'Reverse geocode', 'Bulk export', 'Priority support'],
    cta: 'Start free trial', href: '/register?plan=pro',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', highlight: false,
    requests: 'Unlimited', perMin: 'Unlimited', keys: 'Unlimited keys',
    features: ['All formats', 'All levels', 'Custom data', 'SLA guarantee', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact sales', href: 'mailto:sales@geonest.io',
  },
]

const CODE_SAMPLES: Record<string, string> = {
  curl: `curl -X GET "https://api.geonest.io/v1/geo/bd/l2" \\
  -H "X-API-Key: gn_live_your_key_here"

# Response
{
  "data": [
    {
      "id": 1001,
      "country_code": "bd",
      "level": 2,
      "level_label": "district",
      "name": "Dhaka",
      "code": "26",
      "_links": {
        "self": "/v1/geo/bd/l2/1001",
        "children": "/v1/geo/bd/l2/1001/children",
        "ancestors": "/v1/geo/bd/l2/1001/ancestors"
      }
    }
  ],
  "count": 64,
  "country_code": "bd",
  "level": 2
}`,
  javascript: `import axios from 'axios'

const client = axios.create({
  baseURL: 'https://api.geonest.io/v1',
  headers: { 'X-API-Key': 'gn_live_your_key_here' }
})

// Get all districts in Bangladesh
const { data } = await client.get('/geo/bd/l2')
console.log(\`Found \${data.count} districts\`)
// Found 64 districts

// Search for "Dhaka"
const search = await client.get('/search', {
  params: { q: 'Dhaka', cc: 'bd' }
})
console.log(search.data.results[0].full_path)
// Bangladesh > Dhaka > Dhaka`,

  python: `import requests

BASE = "https://api.geonest.io/v1"
HEADERS = {"X-API-Key": "gn_live_your_key_here"}

# Get all prefectures in Japan
r = requests.get(f"{BASE}/geo/jp/l1", headers=HEADERS)
prefectures = r.json()["data"]
print(f"Found {len(prefectures)} prefectures")  # 47

# Get children of Tokyo (id=13)
r = requests.get(f"{BASE}/geo/jp/l1/13/children", headers=HEADERS)
municipalities = r.json()["data"]
print(f"Tokyo has {len(municipalities)} municipalities")`,

  go: `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    req, _ := http.NewRequest("GET",
        "https://api.geonest.io/v1/geo/us/l2", nil)
    req.Header.Set("X-API-Key", "gn_live_your_key_here")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()

    var result struct {
        Count int \`json:"count"\`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("US counties: %d\\n", result.Count) // 3143
}`,
}

// ── Components ───────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
    </button>
  )
}

function NavBar() {
  const [open, setOpen] = useState(false)
  
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span>GeoNest</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <a href="https://github.com/yourusername/geonest" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get API Key
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button className="text-muted-foreground" onClick={() => setOpen(!open)}>
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden pb-6 pt-2 space-y-4 animate-fade-in">
            <div className="flex flex-col gap-4 text-sm font-medium text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground py-2 border-b border-border/50">Docs</Link>
              <Link href="/#pricing" className="hover:text-foreground py-2 border-b border-border/50">Pricing</Link>
              <Link href="/login" className="hover:text-foreground py-2 border-b border-border/50">Sign in</Link>
            </div>
            <Link href="/register" className="block w-full px-4 py-3 bg-primary text-white rounded-xl text-center font-bold shadow-lg shadow-primary/20">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

function Hero() {
  const [copied, setCopied] = useState(false)
  const snippet = 'curl -H "X-API-Key: $KEY" https://api.geonest.io/v1/geo/bd/l1'

  const copy = () => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Mesh Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full dark:bg-blue-600/10" />
        <div className="absolute top-[10%] right-[-5%] w-[35%] h-[35%] bg-indigo-400/20 blur-[120px] rounded-full dark:bg-indigo-600/10" />
        <div className="absolute bottom-[20%] left-[20%] w-[30%] h-[30%] bg-cyan-400/15 blur-[120px] rounded-full dark:bg-cyan-600/5" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 animate-fade-in shadow-sm">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          6 Countries · 133,000+ Areas Indexed
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground tracking-tight mb-8 leading-[1.1] animate-fade-in">
          The Geographic API for{' '}
          <span className="bg-gradient-to-r from-primary via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            Modern Developers
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in [animation-delay:100ms]">
          Simple, fast, and reliable administrative hierarchy data for <span className="text-foreground font-semibold">South Asia, USA & Japan</span>. 
          Stop scraping Wikipedia and start building.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 animate-fade-in [animation-delay:200ms]">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-lg shadow-xl shadow-primary/30 transition-all hover:-translate-y-1"
          >
            Start building for free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-background border border-border hover:bg-secondary text-foreground font-bold rounded-2xl text-lg transition-all hover:-translate-y-1 shadow-sm"
          >
            <Code2 className="w-5 h-5" />
            Documentation
          </Link>
        </div>

        {/* Code Mockup */}
        <div className="relative max-w-3xl mx-auto animate-fade-in [animation-delay:300ms]">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-indigo-500/30 blur-2xl opacity-20 dark:opacity-40" />
          <div className="relative bg-[#0d1117] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
              </div>
              <button onClick={copy} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-white/5">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-8 text-left text-sm text-slate-300 font-mono overflow-x-auto leading-relaxed">
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">1</span>
                <span className="text-slate-400">curl -H <span className="text-green-400">&quot;X-API-Key: $GN_KEY&quot;</span> \</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">2</span>
                <span className="ml-4 text-blue-400">https://api.geonest.io/v1/geo/bd/l1</span>
              </div>
              <div className="mt-4 flex gap-4">
                <span className="text-slate-500 select-none">3</span>
                <span className="text-slate-500"># Response</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">4</span>
                <span className="text-slate-400">&#123;</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">5</span>
                <span className="ml-4">&quot;data&quot;: [&#123;&quot;id&quot;: 1, &quot;name&quot;: <span className="text-yellow-400">&quot;Dhaka&quot;</span>, &quot;level&quot;: 1&#125;, ...],</span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">6</span>
                <span className="ml-4">&quot;count&quot;: <span className="text-orange-400">8</span></span>
              </div>
              <div className="flex gap-4">
                <span className="text-slate-500 select-none">7</span>
                <span className="text-slate-400">&#125;</span>
              </div>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="py-20 bg-secondary/30 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
        {STATS.map((s) => (
          <div key={s.label} className="space-y-2">
            <div className="text-4xl md:text-5xl font-black text-foreground">{s.value}</div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Countries() {
  return (
    <section className="py-32 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">Global Coverage</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We&apos;re expanding rapidly. Currently serving complete administrative data for these regions.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COUNTRIES.map((c) => (
            <div
              key={c.code}
              className="group p-8 rounded-3xl bg-background border border-border hover:border-primary/50 hover:bg-primary/[0.02] transition-all hover:-translate-y-2 relative overflow-hidden shadow-sm hover:shadow-xl"
            >
              <div className="flex items-start justify-between mb-8">
                <span className="text-5xl transform group-hover:scale-110 transition-transform duration-500">{c.flag}</span>
                <span className="px-3 py-1 bg-secondary text-foreground text-xs font-bold rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                  {c.code.toUpperCase()}
                </span>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-foreground">{c.name}</h3>
                <p className="text-muted-foreground text-sm font-medium">{c.labelSuffix}</p>
                <div className="pt-4 flex items-end justify-between border-t border-border/50">
                  <div>
                    <div className="text-3xl font-black text-foreground">{c.areas}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase">Areas Indexed</div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-border group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CodeSamples() {
  const [active, setActive] = useState<keyof typeof CODE_SAMPLES>('curl')
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(CODE_SAMPLES[active])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = Object.keys(CODE_SAMPLES) as Array<keyof typeof CODE_SAMPLES>

  return (
    <section className="py-32 bg-secondary/10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">Works with everything</h2>
          <p className="text-muted-foreground text-lg">Integrate geographic data into any application in minutes.</p>
        </div>

        <div className="rounded-[2rem] overflow-hidden border border-border shadow-2xl bg-background">
          {/* Tab bar */}
          <div className="flex items-center justify-between bg-secondary/50 border-b border-border px-6">
            <div className="flex overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={`px-6 py-4 text-sm font-bold capitalize transition-colors border-b-2 whitespace-nowrap ${
                    active === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-lg hover:bg-secondary"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Code */}
          <pre className="p-8 text-sm text-foreground/90 font-mono overflow-x-auto leading-relaxed bg-background min-h-[300px]">
            {CODE_SAMPLES[active]}
          </pre>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    { icon: Zap, title: '<5ms P99 Latency', desc: 'Global edge caching ensures your users get data instantly, regardless of their location.' },
    { icon: Shield, title: 'Production Ready', desc: 'Secure API access with SHA-256 keys, automatic rate limiting, and 99.9% uptime guarantee.' },
    { icon: Layers, title: 'Deep Hierarchies', desc: 'Traverse complex administrative structures from national level down to the smallest village.' },
    { icon: BarChart3, title: 'Live Analytics', desc: 'Monitor your API usage, error rates, and cache performance from a beautiful dashboard.' },
    { icon: Lock, title: 'Smart Rate Limits', desc: 'Flexible limits that scale with your needs. Redis-backed sliding window protection.' },
    { icon: Code2, title: 'Dev Experience', desc: 'Interactive documentation, SDKs in major languages, and clean JSON/CSV exports.' },
  ]

  return (
    <section className="py-32 bg-secondary/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">Built for Performance</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Infrastructure that scales with your application, from prototype to enterprise.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((f) => (
            <div key={f.title} className="flex gap-6 group">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm group-hover:bg-primary transition-colors duration-300">
                <f.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="py-32 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight">Fair Pricing</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Start free, upgrade as you grow. No hidden fees, no credit card required to start.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-[2rem] flex flex-col transition-all duration-300 border ${
                plan.highlight
                  ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/30 scale-105 z-10'
                  : 'bg-background text-foreground border-border hover:border-primary/50'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-xs font-black rounded-full uppercase tracking-widest shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-xl font-black mb-4 uppercase tracking-wider ${plan.highlight ? 'text-white' : 'text-muted-foreground'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                  <span className={`text-sm font-bold ${plan.highlight ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <div className={`text-sm mb-10 pb-8 border-b ${plan.highlight ? 'border-white/20' : 'border-border'}`}>
                <div className="font-bold flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4" /> {plan.requests}
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  <div className="w-4 h-4" /> {plan.perMin}
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  <div className="w-4 h-4" /> {plan.keys}
                </div>
              </div>

              <ul className="flex-1 space-y-4 mb-10">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium">
                    <Check className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-primary'}`} />
                    <span className={plan.highlight ? 'text-white/90' : 'text-foreground/80'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full py-4 rounded-2xl font-black text-center transition-all ${
                  plan.highlight
                    ? 'bg-white text-primary hover:bg-white/90 shadow-xl'
                    : 'bg-secondary hover:bg-primary hover:text-white text-foreground'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 mb-20">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-black text-2xl text-foreground mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              GeoNest
            </Link>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mb-8">
              Empowering developers with the world&apos;s most accessible geographic data infrastructure.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {[
            { title: 'API', links: [['Documentation', '/docs'], ['Search API', '/docs/search'], ['Endpoints', '/docs/endpoints'], ['Status', '#']] },
            { title: 'Company', links: [['About', '#'], ['Pricing', '/#pricing'], ['Blog', '#'], ['Contact', '#']] },
            { title: 'Legal', links: [['Privacy', '#'], ['Terms', '#'], ['License', '#']] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-foreground font-black uppercase text-xs tracking-widest mb-6">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-muted-foreground hover:text-primary font-medium transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 text-muted-foreground font-medium text-sm">
          <p>&copy; {new Date().getFullYear()} GeoNest. Built with pride in Dhaka.</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-primary">Status</Link>
            <Link href="#" className="hover:text-primary">Security</Link>
            <Link href="#" className="hover:text-primary">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <NavBar />
      <main>
        <Hero />
        <Stats />
        <Countries />
        <CodeSamples />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
