/**
 * Auth helpers — store/read tokens, check authentication state.
 * All localStorage operations are guarded for SSR compatibility.
 */

export function saveTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

/** Decode JWT payload without verifying signature (client-side only). */
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function getUserFromToken(): { user_id?: string; email?: string; plan_id?: number } | null {
  const token = getAccessToken()
  if (!token) return null
  const payload = decodeJWT(token)
  if (!payload) return null
  return {
    user_id: payload.user_id as string,
    email: payload.email as string,
    plan_id: payload.plan_id as number,
  }
}
