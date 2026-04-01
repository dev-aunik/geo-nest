import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Authentication' }

export default function AuthenticationPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-4">Authentication</h1>
      <p className="text-slate-400 mb-8 text-lg leading-relaxed">
        GeoNest uses API keys to authenticate requests. Include your key on every request to a protected endpoint.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Sending your API key</h2>
        <p className="text-slate-400 mb-4">Use the <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">X-API-Key</code> header (recommended):</p>
        <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto mb-4">
          {`curl -H "X-API-Key: gn_live_your_key_here" \\
  https://api.geonest.io/v1/geo/bd/l1`}
        </pre>
        <p className="text-slate-400 mb-4">Or use the <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">api_key</code> query parameter:</p>
        <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300 overflow-x-auto">
          {`curl "https://api.geonest.io/v1/geo/bd/l1?api_key=gn_live_your_key_here"`}
        </pre>
        <p className="text-slate-500 text-sm mt-2">Note: The header is preferred in production as query params may appear in server logs.</p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Key format</h2>
        <p className="text-slate-400 mb-3">
          API keys always start with <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">gn_live_</code> followed by a 52-character base32-encoded random string.
        </p>
        <pre className="p-4 bg-[#0d1117] border border-white/8 rounded-xl text-sm font-mono text-slate-300">
          gn_live_abcdefghij2klmnopqrstu3vwxyz456789abcdefghij2klmnopq
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Security</h2>
        <ul className="space-y-2 text-slate-400 text-sm">
          <li>• Keys are shown <strong className="text-white">once</strong> upon creation. GeoNest never stores raw keys — only SHA-256 hashes.</li>
          <li>• If a key is compromised, revoke it immediately from the dashboard and create a new one.</li>
          <li>• Never commit API keys to source control. Use environment variables.</li>
          <li>• On server-side code, use the <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">X-API-Key</code> header — it never appears in browser history or URL logs.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-white mb-4">Error responses</h2>
        <div className="space-y-3 text-sm">
          {[
            { code: 401, name: 'UNAUTHORIZED', desc: 'No X-API-Key header or api_key parameter provided.' },
            { code: 401, name: 'INVALID_API_KEY', desc: 'Key not found in database or has been revoked.' },
          ].map((e) => (
            <div key={e.name} className="flex items-start gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-bold rounded font-mono flex-shrink-0">{e.code}</span>
              <div>
                <code className="text-yellow-400 text-xs">{e.name}</code>
                <p className="text-slate-400 text-xs mt-0.5">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
