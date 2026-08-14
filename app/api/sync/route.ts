import { NextRequest,NextResponse } from 'next/server'
import { syncPendingRecords } from '@/lib/sheet-sync'
export async function POST(request:NextRequest){
 if(request.headers.get('authorization')!==`Bearer ${process.env.SYNC_WORKER_SECRET}`)return NextResponse.json({error:'No autorizado'},{status:401})
 try{return NextResponse.json(await syncPendingRecords())}catch{return NextResponse.json({error:'No fue posible sincronizar Google Sheets.'},{status:500})}
}
export const GET=POST
