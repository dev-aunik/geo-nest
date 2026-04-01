import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Countries' }

const COUNTRY_DATA = [
  {
    flag: '🇧🇩', code: 'bd', name: 'Bangladesh', levels: 4,
    levelNames: ['division', 'district', 'upazila', 'union'],
    counts: ['8', '64', '495', '4,550+'],
    notes: 'Full 4-level hierarchy. Best data quality in the region.',
  },
  {
    flag: '🇱🇰', code: 'lk', name: 'Sri Lanka', levels: 4,
    levelNames: ['province', 'district', 'ds_division', 'gn_division'],
    counts: ['9', '25', '331', '14,021'],
    notes: 'Complete hierarchy through Grama Niladhari (GN) divisions.',
  },
  {
    flag: '🇳🇵', code: 'np', name: 'Nepal', levels: 4,
    levelNames: ['province', 'district', 'municipality', 'ward'],
    counts: ['7', '77', '753', '6,743'],
    notes: 'Post-2015 federal restructuring. Includes municipality types.',
  },
  {
    flag: '🇮🇳', code: 'in', name: 'India', levels: 3,
    levelNames: ['state', 'district', 'sub_district'],
    counts: ['36', '766', '~6,000'],
    notes: 'L4 (villages ~600K rows) deferred to Phase 2. States include all Union Territories.',
  },
  {
    flag: '🇺🇸', code: 'us', name: 'United States', levels: 4,
    levelNames: ['state', 'county', 'city', 'zip_code'],
    counts: ['51', '3,143', '~35K', '~42K'],
    notes: 'Includes DC and territories at L1. FIPS codes in metadata.',
  },
  {
    flag: '🇯🇵', code: 'jp', name: 'Japan', levels: 3,
    levelNames: ['prefecture', 'municipality', 'ward'],
    counts: ['47', '1,741', '~19K'],
    notes: 'JIS codes available. Data originally Shift-JIS, converted to UTF-8.',
  },
]

export default function CountriesPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-white mb-4">Supported Countries</h1>
      <p className="text-slate-400 mb-8 text-lg leading-relaxed">
        Phase 1 covers 6 countries with a total of 133,000+ geographic areas.
        Use <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-sm">GET /v1/geo/countries</code> to list them programmatically.
      </p>

      <div className="space-y-6">
        {COUNTRY_DATA.map((c) => (
          <div key={c.code} className="p-6 bg-white/3 border border-white/8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{c.flag}</span>
              <div>
                <h2 className="text-white font-bold text-lg">{c.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-blue-300 text-sm bg-blue-500/10 px-2 py-0.5 rounded">{c.code}</code>
                  <span className="text-slate-500 text-sm">{c.levels} levels</span>
                </div>
              </div>
            </div>

            {/* Level table */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {c.levelNames.map((name, i) => (
                <div key={name} className="p-3 bg-white/3 border border-white/8 rounded-xl text-center">
                  <div className="text-xs text-slate-500 mb-1">L{i + 1}</div>
                  <div className="text-white text-sm font-medium">{name}</div>
                  <div className="text-blue-400 text-sm font-bold mt-1">{c.counts[i]}</div>
                </div>
              ))}
              {/* Fill empty slots */}
              {Array.from({ length: 4 - c.levelNames.length }).map((_, i) => (
                <div key={i} className="p-3 bg-white/1 border border-dashed border-white/5 rounded-xl text-center">
                  <div className="text-slate-600 text-sm">N/A</div>
                </div>
              ))}
            </div>

            <p className="text-slate-400 text-sm">{c.notes}</p>

            {/* Usage example */}
            <div className="mt-4">
              <pre className="p-3 bg-[#0d1117] border border-white/8 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
                {`curl -H "X-API-Key: $KEY" https://api.geonest.io/v1/geo/${c.code}/l1`}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
