import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireUser } from '@/lib/api'
import { getConsolidated } from '@/lib/attendance'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) { try { const user=await requireUser(),s=request.nextUrl.searchParams;const regional=s.get('regional')??'',gerencia=s.get('gerencia')??'';if(user.role==='regional'&&(!regional||!user.scopes.some(x=>x.regional===regional)))throw new Error('FORBIDDEN');if(user.role==='gerencia'&&(!gerencia||!user.scopes.some(x=>x.gerencia===gerencia)))throw new Error('FORBIDDEN');return NextResponse.json(await getConsolidated(user.email,{regional,gerencia,from:s.get('from')??'',to:s.get('to')??'',search:(s.get('q')??'').slice(0,100),page:Math.max(1,Number(s.get('page'))||1),pageSize:Math.min(200,Math.max(10,Number(s.get('pageSize'))||50))})) } catch (error) { return apiError(error) } }
