import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Errors' }

const ERROR_CODES = [
  { http: 400, code: 'BAD_REQUEST', desc: 'Malformed request body', fix: 'Check JSON syntax and Content-Type header.' },
  { http: 401, code: 'UNAUTHORIZED', desc: 'No API key provided', fix: 'Add X-API-Key header or api_key query param.' },
  { http: 401, code: 'INVALID_API_KEY', desc: 'Key not found or revoked', fix: 'Verify the key is correct and not revoked.' },
  { http: 401, code: 'INVALID_TOKEN', desc: 'JWT token invalid or expired', fix: 'Refresh the access token using /auth/refresh.' },
  { http: 401, code: 'INVALID_CREDENTIALS', desc: 'Wrong email or password', fix: 'Verify credentials and try again.' },
  { http: 403, code: 'FORBIDDEN', desc: 'No permission for this action', fix: 'Check your plan features.' },
  { http: 403, code: 'KEY_LIMIT_REACHED', desc: 'Plan max keys reached', fix: 'Revoke unused keys or upgrade your plan.' },
  { http: 404, code: 'NOT_FOUND', desc: 'Area ID does not exist', fix: 'Verify the ID exists using the list endpoint.' },
  { http: 422, code: 'INVALID_PARAMETER', desc: 'Bad path or query parameter', fix: 'Check country code (2 lowercase letters) and parameter types.' },
  { http: 422, code: 'UNSUPPORTED_COUNTRY', desc: 'Country not in Phase 1', fix: 'See /v1/geo/countries for the list of supported countries.' },
  { http: 422, code: 'EMAIL_EXISTS', desc: 'Account already exists', fix: 'Use the login endpoint instead.' },
  { http: 429, code: 'RATE_LIMIT_EXCEEDED', desc: 'Per-minute limit hit', fix: 'Read Retry-After header and wait before retrying.' },
  { http: 429, code: 'DAILY_QUOTA_EXCEEDED', desc: 'Daily quota used up', fix: 'Wait until midnight UTC or upgrade your plan.' },
  { http: 500, code: 'INTERNAL_ERROR', desc: 'Server error', fix: 'Retry with exponential backoff. Contact support if persistent.' },
]

export default function ErrorsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Error Codes</h1>
      <p className="text-slate-400 mb-8 text-lg leading-relaxed">
        All API errors use a consistent JSON envelope. Check the <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">error.code</code> field for programmatic handling.
      </p>

      {/* Error envelope example */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Error Response Format</h2>
        <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto">
          {`{
  "error": {
    "code":    "RATE_LIMIT_EXCEEDED",
    "message": "Per-minute limit of 10 requests exceeded. Retry after 47s.",
    "docs":    "https://docs.geonest.io/errors#rate_limit_exceeded"
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}`}
        </pre>
        <p className="text-slate-400 text-sm mt-3">
          The <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">request_id</code> is useful when contacting support.
        </p>
      </section>

      {/* Error table */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Complete Error Code Table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/8 rounded-xl overflow-hidden">
            <thead className="bg-white/5">
              <tr>
                {['HTTP', 'Code', 'Description', 'Fix'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-slate-400 font-medium border-b border-white/8">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ERROR_CODES.map((e) => (
                <tr key={e.code} className="hover:bg-white/2 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                      e.http >= 500 ? 'bg-red-500/20 text-red-400' :
                      e.http >= 400 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>{e.http}</span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-blue-300 text-xs">{e.code}</code>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{e.desc}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{e.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
