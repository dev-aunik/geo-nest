import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rate Limits' }

export default function RateLimitsPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-4">Rate Limits</h1>
      <p className="text-slate-400 mb-8 text-lg leading-relaxed">
        GeoNest enforces two independent rate limits per API key: a per-minute sliding window and a daily quota.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Limits by plan</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/8 rounded-xl overflow-hidden">
            <thead className="bg-white/5">
              <tr>
                {['Plan', 'Daily quota', 'Per-minute limit'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-slate-400 font-medium border-b border-white/8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ['Free', '500', '10'],
                ['Starter', '50,000', '100'],
                ['Pro', '500,000', '600'],
                ['Enterprise', 'Unlimited', 'Unlimited'],
              ].map(([plan, daily, perMin]) => (
                <tr key={plan} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{plan}</td>
                  <td className="py-3 px-4 text-slate-300">{daily}</td>
                  <td className="py-3 px-4 text-slate-300">{perMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Rate limit headers</h2>
        <p className="text-slate-400 mb-4">Every response includes these headers:</p>
        <div className="space-y-2">
          {[
            ['X-RateLimit-Limit', 'Your plan\'s daily quota'],
            ['X-RateLimit-Remaining', 'Remaining requests today'],
            ['X-RateLimit-Reset', 'Unix timestamp when the daily counter resets (midnight UTC)'],
            ['Retry-After', 'Seconds to wait before retrying (only on 429 responses)'],
          ].map(([header, desc]) => (
            <div key={header} className="flex items-start gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
              <code className="text-blue-300 text-xs bg-blue-500/10 px-2 py-1 rounded flex-shrink-0">{header}</code>
              <span className="text-slate-400 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Handling 429 responses</h2>
        <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto mb-4">
          {`{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Per-minute limit of 10 requests exceeded. Retry after 47s.",
    "docs": "https://docs.geonest.io/errors#rate_limit_exceeded"
  },
  "request_id": "550e8400-e29b-41d4-..."
}`}
        </pre>
        <p className="text-slate-400 text-sm">
          Read the <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">Retry-After</code> header and wait that many seconds before retrying.
          Implement exponential backoff for repeated 429s.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-4">How the daily quota works</h2>
        <ul className="space-y-2 text-slate-400 text-sm">
          <li>• The counter resets at <strong className="text-white">midnight UTC</strong> every day.</li>
          <li>• Cached responses count toward your quota (they still pass through the rate limiter).</li>
          <li>• Failed requests (4xx/5xx) that never reached the geo handler do <strong className="text-white">not</strong> count.</li>
          <li>• Enterprise plans have no quota — the rate limiter middleware is skipped entirely.</li>
        </ul>
      </section>
    </div>
  )
}
