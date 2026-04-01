'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Globe, Loader2, Eye, EyeOff, Check } from 'lucide-react'
import { register } from '@/lib/api'
import { saveTokens } from '@/lib/auth'

const BENEFITS = [
  '500 free requests/day, forever',
  'No credit card required',
  '133,000+ geographic areas indexed',
  'Access all 6 countries instantly',
]

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const data = await register(email, password)
      saveTokens(data.access_token, data.refresh_token)
      router.push('/overview')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-48 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left — Benefits */}
        <div className="hidden md:block">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-white mb-8">
            <Globe className="w-7 h-7 text-blue-400" />
            GeoNest
          </Link>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-snug">
            Start building with<br />
            <span className="text-blue-400">Geo data today</span>
          </h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Get your free API key in under 30 seconds. No credit card. No hidden limits.
          </p>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-slate-200">
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Form */}
        <div>
          <div className="text-center mb-6 md:hidden">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-white">
              <Globe className="w-7 h-7 text-blue-400" />
              GeoNest
            </Link>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-slate-400 text-sm mb-6">Free forever. Upgrade anytime.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password <span className="text-slate-500">(min. 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Creating account…' : 'Create free account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-slate-500">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-slate-300">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="underline hover:text-slate-300">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
