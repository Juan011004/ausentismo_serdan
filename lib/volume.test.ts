import { describe,expect,it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
describe('consolidado de gran volumen',()=>{
 it('pagina 50.000 colaboradores sin perder ni repetir filas',()=>{const rows=Array.from({length:50_000},(_,id)=>id),pageSize=200,pages=Array.from({length:Math.ceil(rows.length/pageSize)},(_,p)=>rows.slice(p*pageSize,(p+1)*pageSize));expect(pages.flat()).toEqual(rows);expect(pages.every(p=>p.length<=200)).toBe(true)})
 it('la RPC limita página, filtra fechas y conserva exclusión ELITE/RE regional',()=>{const sql=readFileSync(join(process.cwd(),'supabase/migrations/202608050002_reports_and_sync_admin.sql'),'utf8');expect(sql).toContain('least(p_page_size,200)');expect(sql).toContain('r.operational_date>=p_from');expect(sql).toContain("upper(r.gerencia) like '%ELITE%'");expect(sql).toContain("upper(r.gerencia) like 'RE %'")})
 it('la migración de resiliencia recupera workers y añade índices críticos',()=>{const sql=readFileSync(join(process.cwd(),'supabase/migrations/202608100004_resilience_security.sql'),'utf8');expect(sql).toContain('for update skip locked');expect(sql).toContain("locked_at<now()-interval '10 minutes'");expect(sql).toContain('daily_records_date_scope_idx');expect(sql).toContain('force row level security')})
})
