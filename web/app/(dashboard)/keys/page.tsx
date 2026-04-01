'use client'

import { useEffect, useState } from 'react'
import { Plus, RotateCcw, Trash2, Copy, Check, AlertTriangle, X, Loader2 } from 'lucide-react'
import { listKeys, createKey, rotateKey, revokeKey, type APIKey, type CreateKeyResponse } from '@/lib/api'

// ── One-time key reveal modal ────────────────────────────────────────────────

function KeyRevealModal({ data, onClose }: { data: CreateKeyResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(data.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur">
      <div className="bg-[#0d1324] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-fade-in">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Save your API key</h3>
            <p className="text-slate-400 text-sm mt-1">{data.warning}</p>
          </div>
        </div>

        <div className="relative mb-6">
          <code className="block w-full p-4 bg-[#070b14] border border-white/10 rounded-xl text-blue-300 font-mono text-sm break-all leading-relaxed">
            {data.key}
          </code>
          <button
            onClick={copy}
            className="absolute right-3 top-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copy}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy key</>}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm border border-white/10 transition-all"
          >
            I've saved it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Create key modal ──────────────────────────────────────────────────────────

function CreateKeyModal({ onCreate, onClose }: { onCreate: (name: string) => void; onClose: () => void; loading: boolean }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur">
      <div className="bg-[#0d1324] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Create API Key</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Name <span className="text-slate-500">(optional)</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production key"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && onCreate(name)}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm border border-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(name)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all"
          >
            Create key
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [revealed, setRevealed] = useState<CreateKeyResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    try {
      const { keys } = await listKeys()
      setKeys(keys)
    } catch {
      setError('Failed to load keys.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(name: string) {
    setCreating(true)
    try {
      const resp = await createKey(name || undefined)
      setRevealed(resp)
      setShowCreate(false)
      await loadKeys()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setError(msg || 'Failed to create key.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate this key? The old key will stop working immediately.')) return
    try {
      const resp = await rotateKey(id)
      setRevealed(resp)
      await loadKeys()
    } catch {
      setError('Failed to rotate key.')
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? This cannot be undone.')) return
    try {
      await revokeKey(id)
      await loadKeys()
    } catch {
      setError('Failed to revoke key.')
    }
  }

  const activeKeys = keys.filter((k) => !k.revoked)

  return (
    <>
      {revealed && <KeyRevealModal data={revealed} onClose={() => setRevealed(null)} />}
      {showCreate && <CreateKeyModal onCreate={handleCreate} onClose={() => setShowCreate(false)} loading={creating} />}

      <div className="max-w-5xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">API Keys</h1>
            <p className="text-slate-400">Manage your API keys. Never share your full key.</p>
          </div>
          <button
            id="create-key-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Create key
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-white font-semibold mb-1">No API keys yet</p>
              <p className="text-slate-400 text-sm mb-4">Create your first key to start making API requests.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all"
              >
                Create your first key
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3.5 px-6 text-slate-400 font-medium">Name</th>
                    <th className="text-left py-3.5 px-6 text-slate-400 font-medium">Key prefix</th>
                    <th className="text-left py-3.5 px-6 text-slate-400 font-medium">Created</th>
                    <th className="text-left py-3.5 px-6 text-slate-400 font-medium">Last used</th>
                    <th className="text-right py-3.5 px-6 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeKeys.map((key) => (
                    <tr key={key.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="py-4 px-6 text-white font-medium">{key.name}</td>
                      <td className="py-4 px-6">
                        <code className="text-blue-300 font-mono text-xs bg-blue-500/10 px-2 py-1 rounded">
                          {key.key_prefix}…
                        </code>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRotate(key.id)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Rotate key"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Revoke key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-blue-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Your API keys are shown by prefix only after creation. Never share your full key.
            If a key is compromised, rotate it immediately.
          </p>
        </div>
      </div>
    </>
  )
}
