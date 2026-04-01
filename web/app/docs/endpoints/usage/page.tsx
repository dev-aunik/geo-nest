import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Usage Endpoints' }

export default function UsageEndpointsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Usage Endpoints</h1>
      <p className="text-slate-400 mb-8 text-lg">Check your API call usage and history.</p>
      {[
        {
          method: 'GET', path: '/v1/usage', auth: 'X-API-Key',
          desc: "Returns today's call count, remaining quota, and daily limit for the authenticated key.",
          resp: `{"calls_today":127,"remaining":373,"daily_quota":500}`,
        },
        {
          method: 'GET', path: '/v1/usage/history', auth: 'X-API-Key',
          desc: 'Returns daily call breakdown for the past N days (default 30, max 90).',
          params: [{ name: 'days', type: 'integer', required: false, desc: 'Number of days to return (1–90, default 30)' }],
          resp: `{
  "history": [
    {"date":"2026-03-30","calls":127,"cache_hits":43,"errors":2},
    {"date":"2026-03-29","calls":88,"cache_hits":21,"errors":0}
  ],
  "days": 30,
  "count": 30
}`,
        },
      ].map(ep=>(
        <section key={ep.path} className="mb-10 p-6 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded font-mono">{ep.method}</span>
            <code className="text-white font-mono text-sm">{ep.path}</code>
            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded">{ep.auth}</span>
          </div>
          <p className="text-slate-400 text-sm mb-4">{ep.desc}</p>
          <h4 className="text-white font-semibold text-sm mb-2">Response</h4>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">{ep.resp}</pre>
        </section>
      ))}
    </div>
  )
}
