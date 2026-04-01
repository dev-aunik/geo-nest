'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Activity, Key, TrendingUp, Zap, ArrowUpRight } from 'lucide-react'
import { authApi } from '@/lib/api'
import Link from 'next/link'

interface UsageData {
  calls_today: number
  remaining: number
  daily_quota: number
}

interface HistoryItem {
  date: string
  calls: number
  cache_hits: number
  errors: number
}

interface KeyInfo {
  id: string
  name: string
  key_prefix: string
  last_used_at?: string
  created_at: string
  revoked: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: typeof Activity
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'violet' | 'orange'
}) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    violet: 'bg-violet-500/10 text-violet-400',
    orange: 'bg-orange-500/10 text-orange-400',
  }
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-600" />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm font-medium text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function OverviewPage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // These would normally use the API key (api_key_row) not JWT, but for dashboard overview
        // we use a special endpoint or aggregate. In practice the dashboard calls JWT-protected
        // endpoints that aggregate data across all user keys.
        const [keysRes, plansRes] = await Promise.all([
          authApi.get('/keys'),
          authApi.get('/billing/plans'),
        ])
        setKeys(keysRes.data.keys || [])

        // Mock usage data for now (real app would aggregate per-user usage)
        setUsage({ calls_today: 0, remaining: 500, daily_quota: 500 })
        setHistory(
          Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
            calls: Math.floor(Math.random() * 200),
            cache_hits: Math.floor(Math.random() * 50),
            errors: Math.floor(Math.random() * 5),
          }))
        )
      } catch {
        // Redirect if not authenticated
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeKeys = keys.filter((k) => !k.revoked)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-slate-400">Your API usage at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Activity}
          label="Calls today"
          value={usage?.calls_today ?? 0}
          sub="API requests in the last 24h"
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Remaining quota"
          value={usage?.remaining ?? 0}
          sub={`of ${usage?.daily_quota ?? 0} daily limit`}
          color="green"
        />
        <StatCard
          icon={Key}
          label="Active API keys"
          value={activeKeys.length}
          sub="non-revoked keys"
          color="violet"
        />
      </div>

      {/* Chart */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white font-semibold">Daily call volume</h3>
            <p className="text-slate-400 text-sm">Last 30 days</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Calls</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />Cache hits</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cache_hits" fill="rgba(34,197,94,0.7)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keys table */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/8">
          <h3 className="text-white font-semibold">API Keys</h3>
          <Link
            href="/dashboard/keys"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Manage <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-6 text-slate-400 font-medium">Name</th>
                <th className="text-left py-3 px-6 text-slate-400 font-medium">Key prefix</th>
                <th className="text-left py-3 px-6 text-slate-400 font-medium">Last used</th>
                <th className="text-left py-3 px-6 text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No API keys yet.{' '}
                    <Link href="/dashboard/keys" className="text-blue-400 hover:underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                activeKeys.slice(0, 5).map((key) => (
                  <tr key={key.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="py-3.5 px-6 text-white font-medium">{key.name}</td>
                    <td className="py-3.5 px-6">
                      <code className="text-blue-300 font-mono text-xs bg-blue-500/10 px-2 py-1 rounded">
                        {key.key_prefix}…
                      </code>
                    </td>
                    <td className="py-3.5 px-6 text-slate-400">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full font-medium">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
