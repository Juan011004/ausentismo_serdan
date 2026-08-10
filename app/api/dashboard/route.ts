import { NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { getReport } from '@/lib/attendance'
export const dynamic = 'force-dynamic'
export async function GET(request:Request) { try { const user=await requireUser(),s=new URL(request.url).searchParams; return NextResponse.json(await getReport(user,{regional:s.get('regional')??'',gerencia:s.get('gerencia')??'',from:s.get('from')??'',to:s.get('to')??''})) } catch (error) { return apiError(error) } }
