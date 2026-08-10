import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { getAssignments } from '@/lib/attendance'
import { operationalDate } from '@/lib/normalize'
import { getStructure } from '@/lib/attendance'
import { canAccess } from '@/lib/permissions'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user=await requireUser()
    const gerencia = request.nextUrl.searchParams.get('gerencia')?.trim()
    const date = request.nextUrl.searchParams.get('date') ?? operationalDate()
    if (!gerencia) return NextResponse.json({ error: 'Gerencia requerida' }, { status: 400 })
    const context=(await getStructure()).find(r=>r.gerencia===gerencia);if(!context||!canAccess(user,context.regional,gerencia,user.role!=='consulta'))throw new Error('FORBIDDEN')
    return NextResponse.json(await getAssignments(gerencia, date),{headers:{'Cache-Control':'private, no-cache'}})
  } catch (error) { return apiError(error) }
}
