import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Geo Endpoints' }

export default function GeoEndpointsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Geo Endpoints</h1>
      <p className="text-slate-400 mb-8 text-lg">
        All geo endpoints require a valid API key. Responses are cached in Redis for 24 hours.
      </p>

      {[
        {
          method: 'GET',
          path: '/v1/geo/countries',
          auth: 'None',
          desc: 'Returns all 6 supported countries with their level structure.',
          params: [],
          exampleResp: `{
  "countries": [
    {"code":"bd","name":"Bangladesh","levels":4,"level_labels":["division","district","upazila","union"]}
  ],
  "count": 6
}`,
        },
        {
          method: 'GET',
          path: '/v1/geo/:cc/l:n',
          auth: 'X-API-Key',
          desc: 'List all areas at level n for a country. Optionally filter by parent_id.',
          params: [
            { name: 'cc', type: 'string', required: true, desc: '2-letter country code (bd, lk, np, in, us, jp)' },
            { name: 'n', type: 'integer', required: true, desc: 'Hierarchy level 1–4' },
            { name: 'parent_id', type: 'integer', required: false, desc: 'Filter to children of this area ID' },
          ],
          exampleResp: `{
  "data": [
    {
      "id": 1, "country_code": "bd", "level": 1,
      "level_label": "division", "name": "Dhaka",
      "_links": {
        "self": "/v1/geo/bd/l1/1",
        "children": "/v1/geo/bd/l1/1/children",
        "ancestors": "/v1/geo/bd/l1/1/ancestors"
      }
    }
  ],
  "count": 8, "country_code": "bd", "level": 1
}`,
        },
        {
          method: 'GET',
          path: '/v1/geo/:cc/l:n/:id',
          auth: 'X-API-Key',
          desc: 'Get a single area by its numeric ID.',
          params: [
            { name: 'cc', type: 'string', required: true, desc: '2-letter country code' },
            { name: 'n', type: 'integer', required: true, desc: 'Level 1–4' },
            { name: 'id', type: 'integer', required: true, desc: 'Area ID' },
          ],
          exampleResp: `{
  "id": 1, "country_code": "bd", "level": 1,
  "level_label": "division", "name": "Dhaka", "code": "3",
  "_links": { "self": "/v1/geo/bd/l1/1", ... }
}`,
        },
        {
          method: 'GET',
          path: '/v1/geo/:cc/l:n/:id/children',
          auth: 'X-API-Key',
          desc: 'Get all direct children of an area.',
          params: [
            { name: 'cc', type: 'string', required: true, desc: '2-letter country code' },
            { name: 'n', type: 'integer', required: true, desc: 'Level of parent' },
            { name: 'id', type: 'integer', required: true, desc: 'Parent area ID' },
          ],
          exampleResp: `{"data": [{"id":101,"name":"Dhaka","level":2,...}], "count":13, "parent_id":1}`,
        },
        {
          method: 'GET',
          path: '/v1/geo/:cc/l:n/:id/ancestors',
          auth: 'X-API-Key',
          desc: 'Get all ancestors of an area using a recursive CTE, ordered by level ascending.',
          params: [
            { name: 'id', type: 'integer', required: true, desc: 'Area ID to find ancestors for' },
          ],
          exampleResp: `{"ancestors":[{"id":1,"level":1,"name":"Dhaka"},...],"count":3}`,
        },
      ].map((ep) => (
        <section key={ep.path} className="mb-10 p-6 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded font-mono">{ep.method}</span>
            <code className="text-white font-mono text-sm">{ep.path}</code>
            {ep.auth !== 'None' && (
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded font-medium">{ep.auth}</span>
            )}
          </div>

          <p className="text-slate-400 text-sm mb-4">{ep.desc}</p>

          {ep.params.length > 0 && (
            <>
              <h4 className="text-white font-semibold text-sm mb-2">Parameters</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border border-white/8 rounded-xl overflow-hidden">
                  <thead className="bg-white/5">
                    <tr>
                      {['Name', 'Type', 'Required', 'Description'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-slate-400 font-medium border-b border-white/8">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ep.params.map((p) => (
                      <tr key={p.name}>
                        <td className="py-2 px-3"><code className="text-blue-300">{p.name}</code></td>
                        <td className="py-2 px-3 text-slate-400">{p.type}</td>
                        <td className="py-2 px-3">
                          <span className={p.required ? 'text-red-400' : 'text-slate-500'}>{p.required ? 'Yes' : 'No'}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h4 className="text-white font-semibold text-sm mb-2">Response</h4>
          <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
            {ep.exampleResp}
          </pre>
        </section>
      ))}
    </div>
  )
}
