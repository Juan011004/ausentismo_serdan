import { NextRequest,NextResponse } from 'next/server'
import { apiError,requireUser } from '@/lib/api'
import { enforceMutation,safeLog } from '@/lib/security'
import { rpc,supabaseRequest } from '@/lib/supabase'
import { syncPendingRecords } from '@/lib/sheet-sync'
export async function GET(){try{const user=await requireUser();if(user.role!=='admin')throw new Error('FORBIDDEN');const [metrics,errors]=await Promise.all([rpc<Record<string,unknown>>('sync_metrics',{}),supabaseRequest<unknown[]>('sheet_sync_queue?status=in.(failed,dead)&select=id,record_id,status,attempts,available_at,last_error&order=id.desc&limit=50')]);return NextResponse.json({metrics,errors})}catch(error){return apiError(error)}}
export async function POST(request:NextRequest){try{const user=await requireUser();if(user.role!=='admin')throw new Error('FORBIDDEN');await enforceMutation(request,user.email);const body=await request.json().catch(()=>({}));if(body.action==='sync'){const result=await syncPendingRecords();safeLog('admin_sheet_sync',{...result});return NextResponse.json({ok:true,...result})}const count=await rpc<number>('retry_sync_jobs',{p_email:user.email,p_ids:Array.isArray(body.ids)?body.ids:null});safeLog('sync_jobs_retried',{count});return NextResponse.json({ok:true,count})}catch(error){return apiError(error)}}
