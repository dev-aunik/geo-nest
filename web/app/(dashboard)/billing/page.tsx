'use client'

import { useEffect, useState } from 'react'
import { Check, Zap, Loader2, ExternalLink, CreditCard, AlertCircle } from 'lucide-react'
import { getPlans, subscribe, getBillingPortal, type Plan } from '@/lib/api'
import { getUserFromToken } from '@/lib/auth'

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['500 req/day', '10 req/min', '1 API key', 'JSON format', '3 hierarchy levels'],
  starter: ['50,000 req/day', '100 req/min', '3 API keys', 'JSON & CSV', 'Full-text search', 'Reverse geocode'],
  pro: ['500,000 req/day', '600 req/min', '10 API keys', 'JSON, CSV & XML', 'Bulk export', 'Priority support'],
  enterprise: ['Unlimited requests', 'Unlimited rate', 'Unlimited keys', 'Custom data', 'SLA guarantee', 'Dedicated support'],
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const user = getUserFromToken()
  const currentPlanID = user?.plan_id ?? 1

  useEffect(() => {
    async function load() {
      try {
        const { plans } = await getPlans()
        setPlans(plans)
      } catch {
        setError('Failed to load plans.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubscribe(planName: 'starter' | 'pro') {
    setSubscribing(planName)
    setError('')
    try {
      const { checkout_url } = await subscribe(planName)
      window.location.href = checkout_url
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setError(msg || 'Checkout failed. Please try again.')
    } finally {
      setSubscribing(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const { portal_url } = await getBillingPortal()
      window.location.href = portal_url
    } catch {
      setError('Could not open billing portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  const planColors: Record<string, string> = {
    free: 'border-white/10',
    starter: 'border-blue-500/40',
    pro: 'border-violet-500/60 bg-violet-500/3',
    enterprise: 'border-white/10',
  }

  return (
    <div className="max-w-5xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
        <p className="text-slate-400">Manage your subscription and usage limits</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Current plan */}
      <div className="bg-gradient-to-r from-blue-600/10 to-violet-600/10 border border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm mb-1">Current plan</p>
            <h2 className="text-2xl font-bold text-white capitalize">
              {plans.find((p) => p.id === currentPlanID)?.name || 'Free'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {plans.find((p) => p.id === currentPlanID)?.daily_quota.toLocaleString() || '500'} requests/day
            </p>
          </div>
          {currentPlanID > 1 && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold border border-white/10 transition-all disabled:opacity-50"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Manage billing
            </button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanID
            const isPro = plan.name === 'pro'
            const features = PLAN_FEATURES[plan.name] || []

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 border flex flex-col ${planColors[plan.name] || 'border-white/10'} bg-white/3 ${isPro ? 'shadow-lg shadow-violet-500/10' : ''} transition-all hover:border-white/20`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-2 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-full">
                    Current
                  </div>
                )}

                <h3 className="text-white font-bold capitalize mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-3xl font-extrabold text-white">
                    {plan.price_cents === 0 ? '$0' : `$${plan.price_cents / 100}`}
                  </span>
                  {plan.price_cents > 0 && <span className="text-slate-400 text-sm pb-1">/mo</span>}
                  {plan.name === 'enterprise' && <span className="text-white text-xl font-bold">Custom</span>}
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.name === 'enterprise' ? (
                  <a
                    href="mailto:sales@geonest.io"
                    className="w-full py-2.5 text-center text-sm font-semibold text-white bg-white/8 hover:bg-white/15 border border-white/10 rounded-xl transition-all"
                  >
                    Contact sales
                  </a>
                ) : isCurrent ? (
                  <div className="w-full py-2.5 text-center text-sm font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl">
                    Current plan
                  </div>
                ) : plan.name !== 'free' ? (
                  <button
                    onClick={() => handleSubscribe(plan.name as 'starter' | 'pro')}
                    disabled={subscribing === plan.name}
                    className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {subscribing === plan.name && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <CreditCard className="w-3.5 h-3.5" />
                    Upgrade
                  </button>
                ) : (
                  <div className="w-full py-2.5 text-center text-sm text-slate-500">Free forever</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Features comparison note */}
      <div className="text-center text-slate-500 text-sm">
        All plans include access to all 6 countries. Upgrade anytime — downgrade at period end.
      </div>
    </div>
  )
}
