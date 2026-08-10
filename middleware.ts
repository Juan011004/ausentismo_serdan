import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function middleware(request: NextRequest){
  const isLogin=request.nextUrl.pathname==='/login'
  const hasSession=Boolean(request.cookies.get('as_access_token')||request.cookies.get('as_refresh_token'))
  if(!isLogin&&!hasSession)return NextResponse.redirect(new URL('/login',request.url))
  if(isLogin&&hasSession)return NextResponse.redirect(new URL('/',request.url))
  const nonce=btoa(crypto.randomUUID()),headers=new Headers(request.headers)
  headers.set('x-nonce',nonce)
  const response=NextResponse.next({request:{headers}})
  // React Refresh usa eval únicamente durante `next dev`. Producción conserva
  // la política estricta y no permite evaluaciones dinámicas.
  const devScript=process.env.NODE_ENV==='development'?" 'unsafe-eval'":''
  response.headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devScript}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`)
  return response
}
export const config={matcher:['/((?!api/auth/login|api/auth/logout|api/sync|_next/static|_next/image|favicon.ico).*)']}
