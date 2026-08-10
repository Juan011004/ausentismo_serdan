import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { updateRecord } from '@/lib/attendance'
import { updateRecordSchema } from '@/lib/schemas'
import { enforceMutation,safeLog } from '@/lib/security'

export async function PATCH(request: NextRequest) {
  try {
    const user=await requireUser();await enforceMutation(request,user.email)
    const parsed = updateRecordSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
    const result=await updateRecord(parsed.data.recordId,parsed.data.version,parsed.data.newValue,parsed.data.reason,user.email)
    safeLog('attendance_record_updated',{recordId:parsed.data.recordId,role:user.role})
    return NextResponse.json(result)
  } catch (error) { return apiError(error) }
}
