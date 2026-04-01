import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Search Endpoints' }

export default function SearchEndpointsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Search Endpoints</h1>
      <p className="text-slate-400 mb-8 text-lg">
        Typo-tolerant full-text search powered by Typesense. Available on Starter+ plans.
      </p>

      {[
        {
          method: 'GET', path: '/v1/search', auth: 'X-API-Key (Starter+)',
          desc: 'Full-text search across all geo areas with typo tolerance. Results ranked by relevance.',
          params: [
            { name: 'q', type: 'string', required: true, desc: 'Search query (min 2 characters)' },
            { name: 'cc', type: 'string', required: false, desc: 'Filter by country code (e.g., bd)' },
            { name: 'level', type: 'integer', required: false, desc: 'Filter by hierarchy level (1–4)' },
            { name: 'limit', type: 'integer', required: false, desc: 'Max results 1–50 (default: 10)' },
          ],
          example: `curl -H "X-API-Key: $KEY" \\
  "https://api.geonest.io/v1/search?q=dhaka&cc=bd&limit=5"`,
          resp: `{
  "results": [
    {
      "id": "1001",
      "country_code": "bd",
      "level": 2,
      "level_label": "district",
      "name": "Dhaka",
      "full_path": "Dhaka > Dhaka",
      "highlight": "<mark>Dhaka</mark>"
    }
  ],
  "found": 3,
  "query": "dhaka"
}`,
        },
        {
          method: 'GET', path: '/v1/search/autocomplete', auth: 'X-API-Key (Starter+)',
          desc: 'Autocomplete suggestions for typeahead UI. Returns compact results optimized for speed.',
          params: [
            { name: 'q', type: 'string', required: true, desc: 'Partial query (min 1 character)' },
            { name: 'cc', type: 'string', required: false, desc: 'Filter by country code' },
            { name: 'limit', type: 'integer', required: false, desc: 'Max results 1–10 (default: 5)' },
          ],
          example: `curl -H "X-API-Key: $KEY" \\
  "https://api.geonest.io/v1/search/autocomplete?q=tok&cc=jp"`,
          resp: `{
  "suggestions": [
    {"id":"13001","name":"Tokyo","full_path":"Tokyo","level":1,"country_code":"jp"}
  ],
  "query": "tok"
}`,
        },
      ].map((ep) => (
        <section key={ep.path} className="mb-10 p-6 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded font-mono">{ep.method}</span>
            <code className="text-white font-mono text-sm">{ep.path}</code>
          </div>
          <p className="text-slate-400 text-sm mb-4">{ep.desc}</p>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded mb-4">
            {ep.auth}
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Parameters</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs border border-white/8 rounded-xl overflow-hidden">
              <thead className="bg-white/5">
                <tr>{['Name','Type','Required','Description'].map(h=><th key={h} className="text-left py-2 px-3 text-slate-400 font-medium border-b border-white/8">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ep.params.map(p=>(
                  <tr key={p.name}>
                    <td className="py-2 px-3"><code className="text-blue-300">{p.name}</code></td>
                    <td className="py-2 px-3 text-slate-400">{p.type}</td>
                    <td className="py-2 px-3"><span className={p.required?'text-red-400':'text-slate-500'}>{p.required?'Yes':'No'}</span></td>
                    <td className="py-2 px-3 text-slate-400">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="text-white font-semibold text-sm mb-2">Example</h4>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto mb-4">{ep.example}</pre>
          <h4 className="text-white font-semibold text-sm mb-2">Response</h4>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">{ep.resp}</pre>
        </section>
      ))}
    </div>
  )
}
