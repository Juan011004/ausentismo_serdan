import { NextResponse } from 'next/server'
import { getAccessProfile } from '@/lib/permissions'
import { getAuthenticatedUser } from '@/lib/supabase-auth'
import { ZodError } from 'zod'

export async function requireUser() {
  const user = await getAuthenticatedUser()
  if (!user?.email) throw new Error('UNAUTHORIZED')
  return getAccessProfile(user.email)
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN'
  if (message.includes('Dynamic server usage')) throw error
  if (error instanceof ZodError) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (message === 'INVALID_CREDENTIALS') return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  if (message === 'CONFLICT') return NextResponse.json({ error: 'El registro cambió desde que fue cargado. Actualiza la página.' }, { status: 409 })
  if (message === 'FORBIDDEN' || message.includes('SCOPE_FORBIDDEN')) return NextResponse.json({ error: 'Sin permisos para este alcance.' }, { status: 403 })
  if (message === 'CSRF') return NextResponse.json({ error: 'Solicitud de seguridad inválida. Recarga la página.' }, { status: 403 })
  if (message === 'RATE_LIMIT') return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' }, { status: 429 })
  if (message === 'MAINTENANCE') return NextResponse.json({ error: 'El sistema está temporalmente en modo de mantenimiento.' }, { status: 503 })
  if (message === 'PAYLOAD_TOO_LARGE') return NextResponse.json({ error: 'La solicitud supera el tamaño permitido.' }, { status: 413 })
  if (message === 'UNSUPPORTED_MEDIA') return NextResponse.json({ error: 'El contenido debe enviarse como JSON.' }, { status: 415 })
  if (message.startsWith('AUTH_ADMIN_422')) return NextResponse.json({ error: 'No se pudo crear el usuario. El correo probablemente ya está registrado.' }, { status: 409 })
  if (message.includes('23505') || message.includes('IDEMPOTENCY_CONFLICT')) return NextResponse.json({ error: 'Registro duplicado o requestId reutilizado con datos diferentes.' }, { status: 409 })
  console.error('api_error', { code: message.split(':')[0] })
  return NextResponse.json({ error: 'No fue posible completar la operación.' }, { status: 500 })
}
