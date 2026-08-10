import { NextResponse } from 'next/server'
import { requireUser, apiError } from '@/lib/api'
import { ABSENCE_OPTIONS } from '@/lib/constants'
import { getStructure } from '@/lib/attendance'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    const rows = (await getStructure()).filter(r => user.role==='admin'||user.role==='consulta'||user.scopes.some(s=>user.role==='regional'?s.regional===r.regional:s.gerencia===r.gerencia))
    return NextResponse.json({ gerencias: [...new Set(rows.map(r => r.gerencia).filter(Boolean))].sort(), regionales: [...new Set(rows.map(r => r.regional).filter(Boolean))].sort(), pares:[...new Map(rows.filter(r=>r.regional&&r.gerencia).map(r=>[`${r.regional}|${r.gerencia}`,{regional:r.regional,gerencia:r.gerencia}])).values()], novedades: ABSENCE_OPTIONS },{headers:{'Cache-Control':'private, max-age=60, stale-while-revalidate=300'}})
  } catch (error) { return apiError(error) }
}
