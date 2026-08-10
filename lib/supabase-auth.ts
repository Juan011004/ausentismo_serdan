import { cookies } from 'next/headers'

const ACCESS_COOKIE = 'as_access_token'
const REFRESH_COOKIE = 'as_refresh_token'
const START_COOKIE = 'as_session_started'
const SESSION_SECONDS = 8 * 60 * 60

type AuthUser = { id: string; email?: string }
type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; user: AuthUser }

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('AUTH_NOT_CONFIGURED')
  return { url: url.replace(/\/$/, ''), key }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/', maxAge
})

function saveTokens(tokens: TokenResponse, preserveStart = false) {
  const jar = cookies()
  jar.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(Math.min(tokens.expires_in, SESSION_SECONDS)))
  jar.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(SESSION_SECONDS))
  if (!preserveStart) jar.set(START_COOKIE, String(Date.now()), cookieOptions(SESSION_SECONDS))
}

async function authFetch(path: string, init: RequestInit = {}) {
  const { url, key } = publicConfig()
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12_000)
  try{return await fetch(`${url}/auth/v1/${path}`, {
    ...init, signal:controller.signal, cache: 'no-store',
    headers: { apikey: key, 'content-type': 'application/json', ...init.headers }
  })}finally{clearTimeout(timer)}
}

export async function signInWithPassword(email: string, password: string) {
  const response = await authFetch('token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email: email.toLowerCase(), password })
  })
  if (!response.ok) throw new Error('INVALID_CREDENTIALS')
  const tokens = await response.json() as TokenResponse
  if (!tokens.user.email) throw new Error('INVALID_CREDENTIALS')
  saveTokens(tokens)
  return tokens.user
}

async function userForToken(token: string) {
  const response = await authFetch('user', { headers: { Authorization: `Bearer ${token}` } })
  return response.ok ? await response.json() as AuthUser : null
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const jar = cookies()
  const started = Number(jar.get(START_COOKIE)?.value ?? 0)
  if (!started || Date.now() - started > SESSION_SECONDS * 1000) { clearAuthCookies(); return null }
  const access = jar.get(ACCESS_COOKIE)?.value
  if (access) {
    const user = await userForToken(access)
    if (user?.email) return user
  }
  const refreshToken = jar.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return null
  const response = await authFetch('token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: refreshToken })
  })
  if (!response.ok) { clearAuthCookies(); return null }
  const tokens = await response.json() as TokenResponse
  saveTokens(tokens, true)
  return tokens.user.email ? tokens.user : null
}

export function clearAuthCookies() {
  const jar = cookies()
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, START_COOKIE]) jar.set(name, '', cookieOptions(0))
}
