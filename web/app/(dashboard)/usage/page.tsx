'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { Loader2, TrendingUp, Database, AlertCircle } from 'lucide-react'
import { listKeys, authApi } from '@/lib/api'

interface DayData {
  date: string
  calls: number
  cache_hits: number
  errors: number
}

export default function UsagePage() {
  const [history, setHistory] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadHistory()
  }, [days])

  async function loadHistory() {
    setLoading(true)
    try {
      // Get all user keys, then get history for each
      const { keys } = await listKeys()
      const activeKey = keys.find((k) => !k.revoked)

      // In a real app, we'd call GET /v1/usage/history with the API key
      // For dashboard, aggregate across all keys or use a dashboard endpoint
      // Simulating with mock data for now
      setHistory(
        Array.from({ length: days }, (_, i) => ({
          date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
          calls: Math.floor(Math.random() * 300 + 50),
          cache_hits: Math.floor(Math.random() * 80),
          errors: Math.floor(Math.random() * 10),
        }))
      )
    } catch {
      // handle errors
    } finally {
      setLoading(false)
    }
  }

  const totalCalls = history.reduce((s, d) => s + d.calls, 0)
  const totalCacheHits = history.reduce((s, d) => s + d.cache_hits, 0)
  const totalErrors = history.reduce((s, d) => s + d.errors, 0)
  const cacheRate = totalCalls ? Math.round((totalCacheHits / totalCalls) * 100) : 0

  return (
    <div className="max-w-6xl space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Usage</h1>
          <p className="text-slate-400">API call statistics and history</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: 'Total calls', value: totalCalls.toLocaleString(), color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Database, label: 'Cache hit rate', value: `${cacheRate}%`, color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: AlertCircle, label: 'Total errors', value: totalErrors.toLocaleString(), color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-6">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">API Calls per Day</h3>
        <p className="text-slate-400 text-sm mb-6">Total requests and cache hits over time</p>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(days / 7)}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="calls" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Calls" />
              <Bar dataKey="cache_hits" fill="rgba(34,197,94,0.7)" radius={[3, 3, 0, 0]} name="Cache hits" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Error rate line */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Error Rate</h3>
        <p className="text-slate-400 text-sm mb-6">4xx/5xx responses per day</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(days / 7)}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={false} name="Errors" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* History table */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/8">
          <h3 className="text-white font-semibold">Daily breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Date', 'Calls', 'Cache hits', 'Errors', 'Cache rate'].map((h) => (
                  <th key={h} className="text-left py-3 px-6 text-slate-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((row) => (
                <tr key={row.date} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-6 text-slate-300">{row.date}</td>
                  <td className="py-3.5 px-6 text-white font-medium">{row.calls.toLocaleString()}</td>
                  <td className="py-3.5 px-6 text-green-400">{row.cache_hits}</td>
                  <td className="py-3.5 px-6 text-red-400">{row.errors}</td>
                  <td className="py-3.5 px-6 text-slate-400">
                    {row.calls ? `${Math.round((row.cache_hits / row.calls) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
