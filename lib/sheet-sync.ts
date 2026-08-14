import 'server-only'
import { appendValues,readValues,recordsSpreadsheetId,sheets } from '@/lib/google-sheets'
import { rpc,supabaseRequest } from '@/lib/supabase'
import { safeLog } from '@/lib/security'

type Job={id:number;record_id:string}
type Row={id:string;regional:string;gerencia:string;cedula:string;nombre:string;cargo:string;source_position:string;fecha_ingreso:string|null;operational_date:string;reported_value:string}
export type SyncResult={claimed:number;synced:number;failed:number}

export async function syncPendingRecords(limit=100):Promise<SyncResult>{
 const jobs=await rpc<Job[]>('take_sync_jobs',{p_limit:limit})
 if(!jobs.length)return{claimed:0,synced:0,failed:0}
 try{
  const tab=process.env.GOOGLE_CONSOLIDATED_SHEET??'Consolidado',sheetId=recordsSpreadsheetId(),ids=(await readValues(sheetId,`'${tab}'!J:J`)).flat().map(String),rowsById=new Map(ids.map((id,index)=>[id,index+1]))
  const requested=jobs.map(j=>j.record_id).join(','),records=await supabaseRequest<Row[]>(`daily_records?id=in.(${requested})&select=id,regional,gerencia,cedula,nombre,cargo,source_position,fecha_ingreso,operational_date,reported_value`),byId=new Map(records.map(r=>[r.id,r])),updates:{range:string;values:unknown[][]}[]=[],inserts:unknown[][]=[]
  for(const job of jobs){const r=byId.get(job.record_id);if(!r)throw new Error(`RECORD_NOT_FOUND:${job.record_id}`);const row=rowsById.get(job.record_id);if(row)updates.push({range:`'${tab}'!I${row}`,values:[[r.reported_value]]});else inserts.push([r.regional,r.gerencia,r.cedula,r.nombre,r.cargo,r.source_position,r.fecha_ingreso??'-',r.operational_date,r.reported_value,job.record_id])}
  if(updates.length)await sheets.spreadsheets.values.batchUpdate({spreadsheetId:sheetId,requestBody:{valueInputOption:'USER_ENTERED',data:updates}})
  if(inserts.length)await appendValues(sheetId,`'${tab}'!A:J`,inserts)
  await Promise.all(jobs.map(j=>rpc('finish_sync_job',{p_id:j.id,p_ok:true,p_error:null})))
  safeLog('sheet_sync_finished',{claimed:jobs.length,synced:jobs.length,failed:0})
  return{claimed:jobs.length,synced:jobs.length,failed:0}
 }catch(error){
  const message=error instanceof Error?error.message:'UNKNOWN'
  await Promise.all(jobs.map(j=>rpc('finish_sync_job',{p_id:j.id,p_ok:false,p_error:message})))
  safeLog('sheet_sync_finished',{claimed:jobs.length,synced:0,failed:jobs.length,code:message.split(':')[0]})
  throw error
 }
}
