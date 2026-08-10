import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { getStructure } from '@/lib/attendance'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user=await requireUser()
    const q = (request.nextUrl.searchParams.get('q') ?? '').toLowerCase()
    const regional = request.nextUrl.searchParams.get('regional') ?? ''
    const gerencia = request.nextUrl.searchParams.get('gerencia') ?? ''
    const estado = request.nextUrl.searchParams.get('estado') ?? ''
    const rows = (await getStructure()).filter(r => (user.role==='admin'||user.role==='consulta'||user.scopes.some(s=>user.role==='regional'?s.regional===r.regional:s.gerencia===r.gerencia))&&(!q || `${r.nombre} ${r.cedula} ${r.sector}`.toLowerCase().includes(q)) && (!regional || r.regional === regional) && (!gerencia || r.gerencia === gerencia) && (!estado || r.estado === estado))
    return NextResponse.json({ rows, total: rows.length })
  } catch (error) { return apiError(error) }
}
