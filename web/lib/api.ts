import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'

// ── Axios instances ──────────────────────────────────────────────────────────

/** Public client for unauthenticated requests */
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

/** JWT-authenticated client for dashboard requests */
export const authApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token from localStorage on each request
authApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auto-refresh on 401
authApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return authApi(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password })
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  return data
}

// ── Geo ─────────────────────────────────────────────────────────────────────

export interface Country {
  code: string
  name: string
  levels: number
  level_labels: string[]
  _links: { l1: string }
}

export async function getCountries(): Promise<{ countries: Country[]; count: number }> {
  const { data } = await api.get('/geo/countries')
  return data
}

export interface GeoArea {
  id: number
  country_code: string
  level: number
  level_label: string
  parent_id?: number
  name: string
  code?: string
  metadata?: Record<string, unknown>
  _links: {
    self: string
    parent?: string
    children?: string
    ancestors: string
  }
}

export interface GeoListResponse {
  data: GeoArea[]
  count: number
  country_code: string
  level: number
}

// ── Keys ─────────────────────────────────────────────────────────────────────

export interface APIKey {
  id: string
  name: string
  key_prefix: string
  last_used_at?: string
  expires_at?: string
  created_at: string
  revoked: boolean
}

export interface CreateKeyResponse {
  key: string
  id: string
  prefix: string
  name: string
  warning: string
}

export async function listKeys(): Promise<{ keys: APIKey[]; count: number }> {
  const { data } = await authApi.get('/keys')
  return data
}

export async function createKey(name?: string): Promise<CreateKeyResponse> {
  const { data } = await authApi.post<CreateKeyResponse>('/keys', { name })
  return data
}

export async function rotateKey(id: string): Promise<CreateKeyResponse> {
  const { data } = await authApi.post<CreateKeyResponse>(`/keys/${id}/rotate`)
  return data
}

export async function revokeKey(id: string): Promise<void> {
  await authApi.delete(`/keys/${id}`)
}

// ── Usage ────────────────────────────────────────────────────────────────────

export interface UsageResponse {
  calls_today: number
  remaining: number
  daily_quota: number
}

export interface UsageHistoryResponse {
  history: Array<{
    date: string
    calls: number
    cache_hits: number
    errors: number
  }>
  days: number
  count: number
}

// ── Billing ──────────────────────────────────────────────────────────────────

export interface Plan {
  id: number
  name: string
  price_cents: number
  daily_quota: number
  per_min_limit: number
  max_keys: number
  features: {
    formats?: string[]
    search?: boolean
    reverse_geocode?: boolean
    bulk_export?: boolean
    custom?: boolean
  }
}

export async function getPlans(): Promise<{ plans: Plan[] }> {
  const { data } = await authApi.get('/billing/plans')
  return data
}

export async function subscribe(plan: 'starter' | 'pro'): Promise<{ checkout_url: string }> {
  const { data } = await authApi.post('/billing/subscribe', { plan })
  return data
}

export async function getBillingPortal(): Promise<{ portal_url: string }> {
  const { data } = await authApi.get('/billing/portal')
  return data
}

// ── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string
  country_code: string
  level: number
  level_label: string
  name: string
  full_path: string
  code?: string
  highlight?: string
}

export interface SearchResponse {
  results: SearchResult[]
  found: number
  query: string
}
