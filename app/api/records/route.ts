import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { saveRecords } from '@/lib/attendance'
import { saveBatchSchema } from '@/lib/schemas'
import { enforceMutation, safeLog } from '@/lib/security'
import { canAccess } from '@/lib/permissions'
import { validateRecordBatch } from '@/lib/domain'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    await enforceMutation(request,user.email)
    const parsed = saveBatchSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 422 })
    if(parsed.data.records.some(r=>!canAccess(user,r.regional,r.gerencia,true))) throw new Error('FORBIDDEN')
    const problem=validateRecordBatch(parsed.data.records); if(problem)return NextResponse.json({error:problem},{status:422})
    const result=await saveRecords(parsed.data.requestId,user.email,parsed.data.records)
    safeLog('attendance_batch_saved',{requestId:parsed.data.requestId,count:result.count,replayed:result.replayed,role:user.role})
    return NextResponse.json(result)
  } catch (error) { return apiError(error) }
}
