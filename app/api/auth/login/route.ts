import { NextResponse } from 'next/server'
import { z } from 'zod'
import { apiError } from '@/lib/api'
import { getAccessProfile } from '@/lib/permissions'
import { clearAuthCookies, signInWithPassword } from '@/lib/supabase-auth'
import { rpc } from '@/lib/supabase'
import { createHash } from 'crypto'

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(200) })

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json())
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown'
    const digest=(value:string)=>createHash('sha256').update(value).digest('hex')
    const [ipAllowed,accountAllowed]=await Promise.all([
      rpc<boolean>('consume_rate_limit',{p_key:`login-ip:${digest(ip)}`,p_limit:10,p_window_seconds:900}),
      rpc<boolean>('consume_rate_limit',{p_key:`login-account:${digest(input.email.toLowerCase())}`,p_limit:5,p_window_seconds:900})
    ])
    if(!ipAllowed||!accountAllowed)throw new Error('RATE_LIMIT')
    const user = await signInWithPassword(input.email, input.password)
    await getAccessProfile(user.email!)
    return NextResponse.json({ ok: true })
  } catch (error) {
    clearAuthCookies()
    return apiError(error)
  }
}
