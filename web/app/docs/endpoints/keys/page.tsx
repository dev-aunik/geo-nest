import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Keys Endpoints' }

export default function KeysEndpointsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Key Management Endpoints</h1>
      <p className="text-slate-400 mb-8 text-lg">
        JWT-authenticated endpoints for managing your API keys from the dashboard.
      </p>
      {[
        { method:'GET', path:'/v1/keys', desc:'List all API keys for the authenticated user.', resp:`{"keys":[{"id":"uuid","name":"Default","key_prefix":"gn_live_abcd","last_used_at":"2026-03-30T12:00:00Z","created_at":"2026-01-01T00:00:00Z","revoked":false}],"count":1}` },
        { method:'POST', path:'/v1/keys', desc:'Create a new API key. Returns the full key once — save it immediately.', resp:`{"key":"gn_live_full_key_shown_once","id":"uuid","prefix":"gn_live_ab","name":"Key 1","warning":"Save this key now. It will not be shown again."}` },
        { method:'POST', path:'/v1/keys/:id/rotate', desc:'Revoke the existing key and create a replacement. Returns the new full key.', resp:`{"key":"gn_live_new_key","id":"new-uuid","prefix":"gn_live_cd","name":"Rotated key","warning":"Save this key now."}` },
        { method:'DELETE', path:'/v1/keys/:id', desc:'Permanently revoke a key. Returns 204 No Content.', resp:`(empty body, HTTP 204)` },
      ].map(ep=>(
        <section key={ep.path} className="mb-8 p-6 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2.5 py-1 text-xs font-bold rounded font-mono ${
              ep.method==='GET'?'bg-blue-500/20 text-blue-400':
              ep.method==='POST'?'bg-green-500/20 text-green-400':
              'bg-red-500/20 text-red-400'
            }`}>{ep.method}</span>
            <code className="text-white font-mono text-sm">{ep.path}</code>
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs rounded">JWT Bearer</span>
          </div>
          <p className="text-slate-400 text-sm mb-3">{ep.desc}</p>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">{ep.resp}</pre>
        </section>
      ))}
    </div>
  )
}
