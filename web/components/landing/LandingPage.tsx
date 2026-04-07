"use client";

import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Crown,
  Github,
  Globe,
  Headphones,
  Layers,
  Lock,
  Map,
  Menu,
  Moon,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  Sun,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ── Dynamic import (Three.js — no SSR) ───────────────────────────────────────
const GlobeCanvas = dynamic(
  () => import("./GlobeCanvas").then((m) => m.GlobeCanvas),
  { ssr: false, loading: () => null },
);

// ── Data ─────────────────────────────────────────────────────────────────────
const COUNTRIES = [
  {
    code: "BD",
    flag: "🇧🇩",
    name: "Bangladesh",
    levels: 4,
    areas: "5,100+",
    desc: "Divisions → Districts → Upazilas → Unions",
  },
  {
    code: "LK",
    flag: "🇱🇰",
    name: "Sri Lanka",
    levels: 4,
    areas: "14,400+",
    desc: "Provinces → Districts → DS Divisions → GN Divisions",
  },
  {
    code: "NP",
    flag: "🇳🇵",
    name: "Nepal",
    levels: 4,
    areas: "7,580+",
    desc: "Provinces → Districts → Municipalities → Wards",
  },
  {
    code: "IN",
    flag: "🇮🇳",
    name: "India",
    levels: 3,
    areas: "6,800+",
    desc: "States → Districts → Sub-Districts",
  },
  {
    code: "US",
    flag: "🇺🇸",
    name: "United States",
    levels: 4,
    areas: "78,000+",
    desc: "States → Counties → Cities → ZIP Codes",
  },
  {
    code: "JP",
    flag: "🇯🇵",
    name: "Japan",
    levels: 3,
    areas: "20,800+",
    desc: "Prefectures → Municipalities → Wards",
  },
];

const STATS = [
  { label: "Countries", value: "6", suffix: "" },
  { label: "Areas Indexed", value: "133", suffix: "K+" },
  { label: "P99 Latency", value: "<5", suffix: "ms" },
  { label: "Free Tier", value: "500", suffix: "/day" },
];

const PLANS = [
  {
    name: "Free",
    price: 0,
    period: "/mo",
    highlight: false,
    icon: "shield",
    color: "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900",
    borderColor: "border-gray-200 dark:border-white/[0.08]",
    requests: "500",
    rate: "10",
    unit: "req/day",
    keys: "1 Key",
    features: [
      { text: "JSON format", included: true },
      { text: "3 hierarchy levels", included: true },
      { text: "Community support", included: true },
      { text: "CSV/XML export", included: false },
      { text: "Priority support", included: false },
    ],
    cta: "Get started",
    href: "/register",
  },
  {
    name: "Starter",
    price: 9,
    period: "/mo",
    highlight: false,
    icon: "zap",
    color:
      "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
    borderColor: "border-amber-200 dark:border-amber-500/20",
    requests: "50K",
    rate: "100",
    unit: "req/day",
    keys: "3 Keys",
    features: [
      { text: "JSON & CSV formats", included: true },
      { text: "4 hierarchy levels", included: true },
      { text: "Full-text search", included: true },
      { text: "Reverse geocode", included: true },
      { text: "Email support", included: true },
      { text: "CSV/XML export", included: false },
    ],
    cta: "Start free trial",
    href: "/register?plan=starter",
  },
  {
    name: "Pro",
    price: 29,
    period: "/mo",
    highlight: true,
    badge: "Most Popular",
    icon: "rocket",
    color:
      "from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30",
    borderColor: "border-cyan-200 dark:border-cyan-500/30",
    requests: "500K",
    rate: "600",
    unit: "req/day",
    keys: "10 Keys",
    features: [
      { text: "JSON, CSV & XML", included: true },
      { text: "4 hierarchy levels", included: true },
      { text: "Full-text search", included: true },
      { text: "Reverse geocode", included: true },
      { text: "Bulk export", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start free trial",
    href: "/register?plan=pro",
  },
  {
    name: "Enterprise",
    price: -1,
    period: "",
    highlight: false,
    icon: "crown",
    color:
      "from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
    borderColor: "border-purple-200 dark:border-purple-500/20",
    requests: "∞",
    rate: "∞",
    unit: "",
    keys: "∞ Keys",
    features: [
      { text: "All formats", included: true },
      { text: "All hierarchy levels", included: true },
      { text: "Custom data sources", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom integrations", included: true },
    ],
    cta: "Contact sales",
    href: "mailto:sales@geonest.io",
  },
];

const CODE_SAMPLES: Record<string, { lang: string; code: string }> = {
  cURL: {
    lang: "bash",
    code: `curl -X GET "https://api.geonest.io/v1/geo/bd/l2" \\
  -H "X-API-Key: gn_live_your_key_here"

# → Response
{
  "data": [
    {
      "id": 1001,
      "name": "Dhaka",
      "level": 2,
      "level_label": "district",
      "code": "26",
      "_links": {
        "children": "/v1/geo/bd/l2/1001/children"
      }
    }
  ],
  "count": 64
}`,
  },
  JavaScript: {
    lang: "js",
    code: `import axios from 'axios'

const geo = axios.create({
  baseURL: 'https://api.geonest.io/v1',
  headers: { 'X-API-Key': 'gn_live_your_key_here' },
})

// Get all districts in Bangladesh
const { data } = await geo.get('/geo/bd/l2')
console.log(\`Found \${data.count} districts\`)
// → Found 64 districts

// Full-text search
const results = await geo.get('/search', {
  params: { q: 'Dhaka', cc: 'bd' },
})
console.log(results.data.results[0].full_path)
// → Bangladesh › Dhaka District › Dhaka`,
  },
  Python: {
    lang: "python",
    code: `import requests

BASE = "https://api.geonest.io/v1"
KEY  = {"X-API-Key": "gn_live_your_key_here"}

# Get all prefectures in Japan
r = requests.get(f"{BASE}/geo/jp/l1", headers=KEY)
prefectures = r.json()["data"]
print(f"Found {len(prefectures)} prefectures")  # 47

# Get children of Tokyo (id=13)
r = requests.get(f"{BASE}/geo/jp/l1/13/children", headers=KEY)
wards = r.json()["data"]
print(f"Tokyo has {len(wards)} municipalities")`,
  },
  Go: {
    lang: "go",
    code: `package main

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
  },
};

const FEATURES = [
  {
    icon: Activity,
    title: "<5ms P99 Latency",
    desc: "Distributed edge points ensure sub-5ms responses globally.",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
    glow: "glow-cyan",
    size: "lg:col-span-2",
    visual: "latency",
  },
  {
    icon: Layers,
    title: "Multi-level Depth",
    desc: "From country down to village levels with nested relationships.",
    color: "from-amber-400/20 to-orange-400/10",
    border: "border-amber-500/20",
    glow: "glow-amber",
    size: "lg:col-span-1",
    visual: "hierarchy",
  },
  {
    icon: Search,
    title: "Full-text Search",
    desc: "Mistyped? Our fuzzy matching finds the area in milliseconds.",
    color: "from-violet-400/20 to-purple-400/10",
    border: "border-violet-500/20",
    glow: "glow-violet",
    size: "lg:col-span-1",
    visual: "search",
  },
  {
    icon: Terminal,
    title: "Developer Focused",
    desc: "Clean JSON, CSV exports, and GraphQL-ready API endpoints.",
    color: "from-green-400/20 to-emerald-400/10",
    border: "border-green-500/20",
    glow: "glow-green",
    size: "lg:col-span-1",
    visual: "formats",
  },
  {
    icon: Activity,
    title: "99.9% Uptime",
    desc: "Highly available clusters ensure your geodata is always ready.",
    color: "from-rose-400/20 to-pink-400/10",
    border: "border-rose-500/20",
    glow: "glow-rose",
    size: "lg:col-span-1",
    visual: "sparkline",
  },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

// ── Components ────────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-gray-800 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:text-cyan-600 dark:hover:text-white transition-all border border-transparent dark:border-white/[0.08]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}

function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/80 dark:bg-[#060612]/90 backdrop-blur-2xl border-b border-gray-200 dark:border-white/[0.06] shadow-xl shadow-black/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl blur-sm opacity-60 dark:opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Globe className="text-white w-5 h-5" />
              </div>
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
              GeoNest
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-white/50">
            <Link
              href="/docs"
              className="px-4 py-2 hover:text-cyan-600 dark:hover:text-white transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04]"
            >
              Docs
            </Link>
            <Link
              href="/#pricing"
              className="px-4 py-2 hover:text-cyan-600 dark:hover:text-white transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04]"
            >
              Pricing
            </Link>
            <Link
              href="/#countries"
              className="px-4 py-2 hover:text-cyan-600 dark:hover:text-white transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04]"
            >
              Coverage
            </Link>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 hover:text-cyan-600 dark:hover:text-white transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.04] flex items-center gap-1.5"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-white/[0.08]">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-bold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white transition-all"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-cyan-500/20 transition-all active:scale-[0.98]"
            >
              Get API Key →
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-xl border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-white/60 bg-white dark:bg-white/[0.03]"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden absolute top-full inset-x-0 bg-white dark:bg-[#080a1d] border-b border-gray-200 dark:border-white/[0.08] p-5 pt-2 transition-all duration-300 transform ${open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"}`}
      >
        <div className="space-y-1.5">
          {["Docs", "Pricing", "Coverage"].map((label) => (
            <Link
              key={label}
              href="#"
              className="block px-4 py-3.5 text-base font-bold text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl transition-all"
            >
              {label}
            </Link>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-white/[0.08] flex flex-col gap-3">
            <Link
              href="/login"
              className="flex items-center justify-center px-4 py-3.5 text-base font-bold text-gray-600 dark:text-white/60 hover:text-cyan-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center px-4 py-4 text-base font-black text-white bg-blue-600 dark:bg-cyan-500 rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-cyan-500/20"
            >
              Get API Key →
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const [copied, setCopied] = useState(false);
  const snippet =
    'curl -H "X-API-Key: $GN_KEY" https://api.geonest.io/v1/geo/bd/l1';

  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-[#060612] transition-colors duration-500">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,#060612_100%)]" />

      {/* Hero content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-5 pt-32 pb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-10 rounded-full border border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-500/10 backdrop-blur-sm text-cyan-600 dark:text-cyan-300 text-xs font-bold tracking-wide animate-hero-badge">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          Global coverage · High availability · 100% GraphQL/REST
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.04] mb-8 animate-hero-title">
          Scale Geographic <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 dark:from-cyan-300 dark:via-blue-400 dark:to-violet-400">
            Features Globally
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed animate-hero-sub">
          Accurate administrative hierarchy data for{" "}
          <span className="text-gray-900 dark:text-white/80 font-bold">
            South Asia, USA & Japan
          </span>
          . <br className="hidden md:block" />
          One API for every village, city, and zip code.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-hero-cta">
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center gap-2 px-10 py-4.5 text-base font-bold text-white rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-blue-500/25"
          >
            <span className="absolute inset-0 bg-blue-600 dark:bg-indigo-700 dark:from-cyan-500 dark:to-blue-600 transition-all group-hover:opacity-90 transition-colors" />
            <span className="relative">Start Building Free</span>
            <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/docs"
            className="group inline-flex items-center justify-center gap-2 px-10 py-4.5 text-base font-bold text-gray-600 dark:text-white/70 rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white transition-all backdrop-blur-sm"
          >
            <Code2 className="w-5 h-5" />
            API Explorer
          </Link>
        </div>

        <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] font-mono text-sm group animate-hero-cta transition-colors">
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">$</span>
          <span className="text-gray-600 dark:text-white/70 select-all">
            {snippet}
          </span>
          <button
            onClick={copy}
            className="ml-3 p-1.5 rounded-lg bg-gray-200 dark:bg-white/[0.06] hover:bg-gray-300 dark:hover:bg-white/[0.12] text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-all border border-transparent dark:border-white/[0.05]"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-1/4 flex items-center justify-center opacity-40 dark:opacity-60 pointer-events-none grayscale dark:grayscale-0 contrast-125 dark:contrast-100 transition-all duration-700">
        <div className="w-[800px] h-[800px]">
          <GlobeCanvas />
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce-slow opacity-40 dark:opacity-20 transition-opacity">
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-900 dark:via-white to-transparent" />
      </div>
    </section>
  );
}

function StatsBar() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="relative py-24 bg-gray-50 dark:bg-[#07091a] border-y border-gray-200 dark:border-white/[0.06] overflow-hidden transition-colors duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-600/5 opacity-30 dark:opacity-100" />
      <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 dark:bg-white/[0.05] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/[0.06] shadow-sm">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`relative p-10 md:p-14 text-center bg-white dark:bg-[#07091a] transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-3 tracking-tight text-gradient">
              {s.value}
              <span className="text-cyan-600 dark:text-cyan-400">
                {s.suffix}
              </span>
            </div>
            <div className="text-xs font-bold text-gray-400 dark:text-white/40 uppercase tracking-[0.2em]">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Countries() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      id="countries"
      ref={ref}
      className="py-32 px-5 bg-white dark:bg-[#060612] transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`text-center mb-24 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.3em] mb-5">
            Global Scale
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
            Geospatial Depth <br />{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-cyan-400 dark:to-blue-500">
              Without Boundaries
            </span>
          </h2>
          <p className="text-gray-600 dark:text-white/40 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
            Access million-row administrative hierarchies through a single
            optimized endpoint.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COUNTRIES.map((c, i) => (
            <div
              key={c.code}
              className={`group relative p-9 rounded-3xl border border-gray-100 dark:border-white/[0.07] bg-gray-50/50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-all duration-500 overflow-hidden cursor-default shadow-sm hover:shadow-xl ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/[0.03] to-transparent pointer-events-none" />

              <div className="flex items-start justify-between mb-8">
                <span className="text-5xl transition-transform duration-500 group-hover:scale-110 drop-shadow-sm">
                  {c.flag}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 text-[10px] font-black font-mono tracking-widest uppercase">
                  {c.code}
                </span>
              </div>

              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                {c.name}
              </h3>
              <p className="text-gray-500 dark:text-white/40 text-base leading-relaxed mb-8 font-medium">
                {c.desc}
              </p>

              <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-white/[0.06]">
                <div>
                  <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {c.areas}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-white/30 font-bold uppercase tracking-widest mt-1">
                    Areas Indexed
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-white/30 group-hover:text-cyan-500 transition-all font-bold group-hover:gap-3">
                  <span>{c.levels} Levels</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Safe token-based syntax highlighter
type SynToken = { t: "kw" | "str" | "cmt" | "num" | "url" | "txt"; v: string };

function tokenizeLine(raw: string): SynToken[] {
  const out: SynToken[] = [];
  let s = raw;
  while (s.length) {
    // URL
    let m = s.match(/^(https?:\/\/[^\s"'`\\]+)/);
    if (m) {
      out.push({ t: "url", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Comment
    m = s.match(/^(#.*|\/\/.*)/);
    if (m) {
      out.push({ t: "cmt", v: m[1] });
      break;
    }
    // Double-quoted
    m = s.match(/^("(?:[^"\\]|\\.)*")/);
    if (m) {
      out.push({ t: "str", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Single-quoted
    m = s.match(/^('(?:[^'\\]|\\.)*')/);
    if (m) {
      out.push({ t: "str", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Backtick
    m = s.match(/^(`(?:[^`\\]|\\.)*`)/);
    if (m) {
      out.push({ t: "str", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Keyword
    m = s.match(
      /^(import|from|const|let|var|async|await|func|package|return|defer|fmt|print|println)\b/,
    );
    if (m) {
      out.push({ t: "kw", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Number
    m = s.match(/^(\d+)/);
    if (m) {
      out.push({ t: "num", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    // Word
    m = s.match(/^([A-Za-z_]\w*)/);
    if (m) {
      out.push({ t: "txt", v: m[1] });
      s = s.slice(m[1].length);
      continue;
    }
    out.push({ t: "txt", v: s[0] });
    s = s.slice(1);
  }
  return out;
}

const SYN_COLOR: Record<SynToken["t"], string | undefined> = {
  kw: "#93c5fd",
  str: "#86efac",
  cmt: "#6b7280",
  num: "#fb923c",
  url: "#67e8f9",
  txt: undefined,
};

function CodeBlock({ code }: { code: string; lang: string }) {
  const lines = code.split("\n");
  return (
    <pre className="p-7 text-[14px] font-mono leading-7 overflow-x-auto text-gray-700 dark:text-white/70 min-h-[360px] bg-gray-50/50 dark:bg-transparent transition-colors duration-500">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-5">
          <span className="select-none text-gray-400 dark:text-white/20 text-right w-5 shrink-0">
            {i + 1}
          </span>
          <span>
            {tokenizeLine(line).map((tok, j) =>
              tok.t === "txt" ? (
                <span key={j}>{tok.v}</span>
              ) : (
                <span key={j} style={{ color: SYN_COLOR[tok.t] }}>
                  {tok.v}
                </span>
              ),
            )}
          </span>
        </div>
      ))}
    </pre>
  );
}

function CodeSamples() {
  const [active, setActive] = useState("cURL");
  const [copied, setCopied] = useState(false);
  const { ref, visible } = useScrollReveal();

  const copy = () => {
    navigator.clipboard.writeText(CODE_SAMPLES[active].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      ref={ref}
      className="py-40 px-5 bg-gray-50 dark:bg-[#07091a] transition-colors duration-500 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.05),transparent_50%)]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.3em] mb-5">
            Plug & Play
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
            Developer First <br />{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Integrations
            </span>
          </h2>
          <p className="text-gray-500 dark:text-white/40 text-lg font-medium">
            Native SDKs and standard REST architecture for every stack.
          </p>
        </div>

        <div
          className={`rounded-3xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0e22] shadow-2xl shadow-black/5 dark:shadow-black/60 transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-red-400/30" />
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400/30" />
              <div className="w-3.5 h-3.5 rounded-full bg-green-400/30" />
            </div>
            <div className="flex items-center gap-1.5">
              {Object.keys(CODE_SAMPLES).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActive(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
                    active === tab
                      ? "bg-blue-600 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-blue-500 dark:border-cyan-500/30 shadow-lg shadow-blue-500/20"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-white/30 hover:text-cyan-600 dark:hover:text-white transition-all px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-transparent dark:hover:border-white/10"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-transparent">
            <CodeBlock
              code={CODE_SAMPLES[active].code}
              lang={CODE_SAMPLES[active].lang}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "latency") {
    return (
      <div className="absolute inset-0 flex items-end justify-center px-10 pb-4 pointer-events-none opacity-20 dark:opacity-40 select-none">
        <div className="flex gap-2 h-24 items-end">
          {[40, 60, 30, 90, 50, 70, 85, 45].map((h, i) => (
            <div
              key={i}
              className="w-1.5 bg-cyan-400/50 rounded-t-sm bar-animate"
              style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (type === "hierarchy") {
    return (
      <div className="absolute right-0 top-0 p-4 opacity-10 dark:opacity-20 pointer-events-none select-none">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="60" cy="20" r="8" />
          <path d="M60 28 V50" />
          <path d="M20 50 H100" />
          <path d="M20 50 V70" />
          <path d="M60 50 V70" />
          <path d="M100 50 V70" />
        </svg>
      </div>
    );
  }
  if (type === "search") {
    return (
      <div className="absolute left-6 bottom-6 right-6 h-12 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl flex items-center px-4 gap-3 opacity-30 dark:opacity-50 select-none">
        <Search className="w-4 h-4 text-cyan-400" />
        <div className="text-gray-400 dark:text-white/30 text-xs font-mono">
          Searching "Dhaka"...
        </div>
      </div>
    );
  }
  if (type === "formats") {
    return (
      <div className="absolute -right-8 bottom-0 flex gap-2 opacity-10 dark:opacity-20 flex-col -rotate-12 select-none pointer-events-none">
        <div className="px-4 py-2 bg-gray-200 dark:bg-white/20 rounded-lg text-xs font-bold font-mono">
          JSON
        </div>
        <div className="px-4 py-2 bg-gray-200 dark:bg-white/20 rounded-lg text-xs font-bold font-mono">
          CSV
        </div>
        <div className="px-4 py-2 bg-gray-200 dark:bg-white/20 rounded-lg text-xs font-bold font-mono">
          GRAPHQL
        </div>
      </div>
    );
  }
  if (type === "sparkline") {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 dark:opacity-40 select-none">
        <svg
          width="140"
          height="50"
          viewBox="0 0 140 50"
          fill="none"
          className="text-cyan-400/50"
        >
          <path
            d="M0 35 Q20 30 35 25 T70 15 T105 20 T140 10"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M0 35 Q20 30 35 25 T70 15 T105 20 T140 10 V50 H0 Z"
            fill="currentColor"
            opacity="0.1"
          />
          {/* Pulse dot */}
          <circle
            cx="140"
            cy="10"
            r="4"
            fill="currentColor"
            className="animate-pulse"
          />
        </svg>
      </div>
    );
  }
  return null;
}

function Features() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="py-40 px-5 bg-white dark:bg-[#060612] transition-colors duration-500 overflow-hidden relative"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`text-center mb-24 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.3em] mb-5">
            Built for scale
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-8">
            Engineered for <br />{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Unmatched Power
            </span>
          </h2>
          <p className="text-gray-600 dark:text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
            Infrastructure that grows alongside your product. From development
            through enterprise deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[280px]">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-8 rounded-3xl dark:bg-gradient-to-br ${f.color} shadow-xl shadow-black/5 dark:shadow-none hover:shadow-2xl dark:hover:${f.glow} transition-all duration-700 overflow-hidden ${f.size} ${
                visible ? "translate-y-0" : "translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <FeatureVisual type={f.visual} />

              <div className="relative z-10 flex flex-col h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/[0.07] border border-gray-200 dark:border-white/[0.08] mb-6 shadow-sm">
                  <f.icon className="w-7 h-7 text-cyan-600 dark:text-white/70 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-gray-600 dark:text-white/50 text-base leading-relaxed max-w-sm">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Icon mapping helper
const PlanIcon = ({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) => {
  const icons: Record<string, JSX.Element> = {
    shield: <Shield className={className} />,
    zap: <Zap className={className} />,
    rocket: <Rocket className={className} />,
    crown: <Crown className={className} />,
  };
  return icons[icon] || <Shield className={className} />;
};

function Pricing() {
  const { ref, visible } = useScrollReveal();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  // Calculate yearly discount
  const getPrice = (price: number) => {
    if (price === -1) return "Custom";
    if (price === 0) return "$0";
    const finalPrice =
      billingCycle === "yearly" ? Math.round(price * 0.8) : price;
    return `$${finalPrice}`;
  };

  return (
    <section
      id="pricing"
      ref={ref}
      className="py-32 px-5 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-[#030308] dark:via-[#060612] dark:to-[#030308] transition-colors duration-500 relative overflow-hidden"
    >
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 dark:from-cyan-500/30 dark:to-purple-500/30 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-20 -left-32 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-full blur-[150px]" />

        {/* Floating geometric shapes */}
        <div className="absolute top-40 left-[15%] w-4 h-4 border-2 border-cyan-400/30 rotate-45 animate-float" />
        <div
          className="absolute top-60 right-[20%] w-6 h-6 border-2 border-purple-400/30 rounded-full animate-float"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute bottom-40 left-[25%] w-3 h-3 bg-gradient-to-r from-cyan-400/40 to-blue-400/40 rounded-full animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-purple-500/20 border border-cyan-500/20 dark:border-cyan-500/30 mb-6">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Simple Pricing
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
            Simple, Transparent
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 relative">
              Pricing
              <svg
                className="absolute -bottom-2 left-0 w-full h-3"
                viewBox="0 0 200 12"
                fill="none"
              >
                <path
                  d="M2 10C50 2 150 2 198 10"
                  stroke="url(#underline)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="underline" x1="0" y1="0" x2="200" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h2>
          <p className="text-gray-600 dark:text-white/50 text-lg max-w-2xl mx-auto font-medium leading-relaxed mb-12">
            Start with our generous free tier. Upgrade when you're ready.
            <br className="hidden md:block" />
            No credit card required. Cancel anytime.
          </p>

          {/* Billing Toggle - Modern pill style */}
          <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-white/80 dark:bg-white/[0.05] backdrop-blur-xl border border-gray-200/50 dark:border-white/[0.1] shadow-xl shadow-black/5 dark:shadow-cyan-500/5">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                billingCycle === "monthly"
                  ? "text-white"
                  : "text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {billingCycle === "monthly" && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/30" />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {billingCycle === "monthly" && <Zap className="w-4 h-4" />}
                Monthly
              </span>
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                billingCycle === "yearly"
                  ? "text-white"
                  : "text-gray-600 dark:text-white/50 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {billingCycle === "yearly" && (
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/30" />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {billingCycle === "yearly" && <Zap className="w-4 h-4" />}
                Yearly
                <span className="ml-1.5 text-[10px] px-2.5 py-1 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black shadow-lg">
                  -20%
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - Modern Glass Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              onMouseEnter={() => setHoveredPlan(plan.name)}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`relative group transition-all duration-700 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-12"
              } ${plan.highlight ? "lg:-mt-6 lg:mb-6" : ""}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Glow effect */}
              <div
                className={`absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-[1.5rem] blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${
                  plan.highlight ? "opacity-30 group-hover:opacity-50" : ""
                }`}
              />

              {/* Floating shine effect */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-b from-white/40 to-transparent rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div
                className={`relative h-full flex flex-col rounded-[1.5rem] overflow-hidden transition-all duration-500 group-hover:-translate-y-3 group-hover:scale-[1.02] ${
                  plan.highlight
                    ? `bg-gradient-to-br from-white via-gray-50 to-cyan-50/50 dark:from-cyan-950/80 dark:via-blue-950/50 dark:to-purple-950/50 ${plan.borderColor} shadow-2xl shadow-cyan-500/20 dark:shadow-cyan-500/15 border-2`
                    : `bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl ${plan.borderColor} shadow-lg shadow-black/5 dark:shadow-cyan-500/5 border border-gray-200/50 dark:border-white/[0.08] group-hover:border-cyan-500/30`
                }`}
              >
                {/* Top gradient accent bar */}
                <div
                  className={`h-1.5 w-full ${
                    plan.highlight
                      ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"
                      : "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 group-hover:from-cyan-300/50 group-hover:via-blue-400/50 group-hover:to-purple-400/50 transition-all duration-500"
                  }`}
                />

                {/* Badge - Floating ribbon */}
                {plan.badge && (
                  <div className="absolute -right-3 top-8 z-20">
                    <div className="relative">
                      <div className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-cyan-500/40 whitespace-nowrap rotate-0">
                        {plan.badge}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-600 rotate-45" />
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-7 flex-1 flex flex-col relative">
                  {/* Decorative corner accent */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full" />

                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center relative ${
                        plan.highlight
                          ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/30"
                          : `bg-gradient-to-br ${plan.color} border border-gray-200 dark:border-white/[0.1]`
                      }`}
                    >
                      {/* Icon glow for highlighted */}
                      {plan.highlight && (
                        <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-lg" />
                      )}
                      <div className="relative z-10">
                        <PlanIcon
                          icon={plan.icon}
                          className={`w-7 h-7 ${
                            plan.highlight
                              ? "text-cyan-500"
                              : "text-gray-600 dark:text-white/60"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-white/40">
                          {plan.name}
                        </p>
                        {plan.price === 0 && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full">
                            FREE
                          </span>
                        )}
                      </div>
                      {plan.price === 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">
                          No credit card needed
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price - Large & Bold */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-6xl font-black tracking-tighter leading-none ${
                          plan.highlight
                            ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {getPrice(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-gray-500 dark:text-white/40 font-medium mb-2">
                          /
                          {billingCycle === "yearly"
                            ? "mo"
                            : plan.period.replace("/", "")}
                        </span>
                      )}
                    </div>
                    {billingCycle === "yearly" && plan.price > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                        <p className="text-xs text-gray-500 dark:text-white/40">
                          <span className="font-bold text-gray-700 dark:text-white/60">
                            ${Math.round(plan.price * 0.8 * 12)}
                          </span>{" "}
                          billed yearly
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Usage Stats - Visual cards */}
                  <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-white/[0.03] dark:to-white/[0.01] border border-gray-100 dark:border-white/[0.05]">
                    <div className="text-center py-2">
                      <p className="text-xl font-black text-gray-900 dark:text-white">
                        {plan.requests}
                      </p>
                      <p className="text-[8px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-wider mt-1">
                        {plan.unit || "reqs"}
                      </p>
                    </div>
                    <div className="text-center py-2 border-x border-gray-200 dark:border-white/[0.08]">
                      <p className="text-xl font-black text-gray-900 dark:text-white">
                        {plan.rate}
                      </p>
                      <p className="text-[8px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-wider mt-1">
                        /sec
                      </p>
                    </div>
                    <div className="text-center py-2">
                      <p className="text-xl font-black text-gray-900 dark:text-white">
                        {plan.keys.split(" ")[0]}
                      </p>
                      <p className="text-[8px] text-gray-500 dark:text-white/40 font-bold uppercase tracking-wider mt-1">
                        Keys
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent mb-6" />

                  {/* Feature List - Clean & Modern */}
                  <ul className="flex-1 space-y-3.5 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <div
                          className={`shrink-0 w-6 h-6 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            feature.included
                              ? plan.highlight
                                ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-500"
                                : "bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50"
                              : "bg-red-50/80 dark:bg-red-500/10 text-red-400"
                          }`}
                        >
                          {feature.included ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span
                          className={
                            feature.included
                              ? "text-gray-700 dark:text-white/70 font-medium"
                              : "text-gray-400 dark:text-white/30 line-through"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button - Full width, bold */}
                  <Link
                    href={plan.href}
                    className={`relative w-full py-4 rounded-2xl font-bold text-sm text-center overflow-hidden transition-all duration-500 group/btn ${
                      plan.highlight
                        ? "text-white"
                        : "text-gray-700 dark:text-white/70"
                    }`}
                  >
                    {/* Button background */}
                    <div
                      className={`absolute inset-0 transition-all duration-500 ${
                        plan.highlight
                          ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-500 shadow-xl shadow-cyan-500/30 group-hover:shadow-2xl group-hover:shadow-cyan-500/40 group-hover:scale-[1.02]"
                          : "bg-gray-100 dark:bg-white/[0.08] border border-gray-200 dark:border-white/[0.1] group-hover:bg-gray-200 dark:group-hover:bg-white/[0.12] group-hover:border-gray-300 dark:group-hover:border-white/[0.2]"
                      }`}
                    />

                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 transition-all duration-300 group-hover/btn:translate-x-1.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Badges */}
        <div
          className={`mt-20 flex flex-wrap items-center justify-center gap-8 transition-all duration-1000 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {[
            { icon: Shield, text: "99.9% Uptime" },
            { icon: Lock, text: "SOC 2 Compliant" },
            { icon: Server, text: "GDPR Ready" },
            { icon: Headphones, text: "24/7 Support" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-gray-500 dark:text-white/40"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-white/40">
            Not satisfied? Get a full refund within{" "}
            <span className="font-bold text-gray-700 dark:text-white/70">
              30 days
            </span>{" "}
            · No questions asked.{" "}
            <Link
              href="/docs"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
            >
              View all features →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className="py-48 px-5 bg-white dark:bg-[#060612] transition-colors duration-500 overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08),transparent_70%)]" />

      <div
        className={`max-w-4xl mx-auto text-center relative z-10 transition-all duration-1000 delay-100 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-95"}`}
      >
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600/10 to-indigo-600/10 dark:from-cyan-400/20 dark:to-blue-600/20 border border-blue-500/20 dark:border-cyan-500/30 mb-12 shadow-2xl dark:shadow-cyan-500/10">
          <Globe className="w-10 h-10 text-blue-600 dark:text-cyan-400 animate-pulse-slow" />
        </div>

        <h2 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-8 leading-[1.1]">
          Map your future <br />{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600">
            with Precision
          </span>
        </h2>
        <p className="text-xl text-gray-500 dark:text-white/40 max-w-xl mx-auto mb-16 leading-relaxed font-medium">
          Start building production-ready geographic features today. 30 seconds
          to your first API call.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/register"
            className="group relative inline-flex items-center justify-center gap-3 px-12 py-5 text-lg font-black text-white rounded-[1.5rem] overflow-hidden shadow-2xl shadow-blue-500/30 dark:shadow-cyan-500/20 transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            <span className="absolute inset-0 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 transition-all group-hover:opacity-90" />
            <span className="relative">Join the Platform</span>
            <ArrowRight className="relative w-6 h-6 group-hover:translate-x-1.5 transition-transform duration-300" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-3 px-12 py-5 text-lg font-black text-gray-600 dark:text-white/60 rounded-[1.5rem] border border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white transition-all shadow-sm"
          >
            Explore API
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-[#03040e] border-t border-gray-200 dark:border-white/[0.05] pt-32 pb-16 px-5 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-16 mb-24">
          <div className="md:col-span-3 lg:col-span-5">
            <Link href="/" className="flex items-center gap-3 mb-8 group w-fit">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Globe className="text-white w-6 h-6" />
                </div>
              </div>
              <span className="font-black text-2xl text-gray-900 dark:text-white tracking-tighter transition-all group-hover:tracking-normal">
                GeoNest
              </span>
            </Link>
            <p className="text-gray-500 dark:text-white/35 text-lg leading-relaxed max-w-sm mb-10 font-medium">
              Geographic infrastructure for the next generation of digital
              products. Building better location experiences since 2024.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-11 h-11 rounded-2xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] flex items-center justify-center text-gray-400 dark:text-white/30 hover:text-cyan-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.10] hover:border-cyan-500/30 dark:hover:border-white/[0.14] transition-all shadow-sm"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-11 h-11 rounded-2xl bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] flex items-center justify-center text-gray-400 dark:text-white/30 hover:text-cyan-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.10] hover:border-cyan-500/30 dark:hover:border-white/[0.14] transition-all shadow-sm"
              >
                <Map className="w-5 h-5" />
              </a>
            </div>
          </div>

          {[
            {
              title: "Platform",
              links: [
                ["Documentation", "/docs"],
                ["Search API", "/docs/search"],
                ["Endpoints", "/docs/endpoints"],
                ["Status", "#"],
              ],
            },
            {
              title: "Company",
              links: [
                ["About", "#"],
                ["Pricing", "/#pricing"],
                ["Blog", "#"],
                ["Contact", "#"],
              ],
            },
            {
              title: "Legal",
              links: [
                ["Privacy", "#"],
                ["Terms", "#"],
                ["License", "#"],
              ],
            },
          ].map((col) => (
            <div key={col.title} className="md:col-span-1 lg:col-span-2">
              <h4 className="text-gray-900 dark:text-white/60 font-black text-xs uppercase tracking-[0.2em] mb-8">
                {col.title}
              </h4>
              <ul className="space-y-4">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-gray-500 dark:text-white/30 hover:text-cyan-600 dark:hover:text-white/70 text-base font-bold transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-12 border-t border-gray-200 dark:border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-8 text-gray-500 dark:text-white/20 text-sm font-semibold">
          <p>
            © {new Date().getFullYear()} GeoNest Platform. Engineered for
            developers globally.
          </p>
          <div className="flex gap-10">
            {["Changelog", "Security", "Support"].map((item) => (
              <Link
                key={item}
                href="#"
                className="hover:text-cyan-600 dark:hover:text-white/50 transition-colors uppercase tracking-widest text-[11px]"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#060612] text-gray-900 dark:text-white transition-colors duration-500">
      <NavBar />
      <main>
        <Hero />
        <StatsBar />
        <Countries />
        <CodeSamples />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
