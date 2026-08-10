import { describe,expect,it } from 'vitest'
import { canAccess,type AccessProfile } from './access'
import { validateRecordBatch } from './domain'
const profile=(role:AccessProfile['role'],scopes:AccessProfile['scopes']=[]):AccessProfile=>({id:'1',email:'user@serdan.com.co',role,scopes})
describe('autorización empresarial',()=>{
 it('bloquea acceso horizontal entre gerencias',()=>{const p=profile('gerencia',[{regional:'CO Centro',gerencia:'CO GC Bog Norte'}]);expect(canAccess(p,'CO Centro','CO GC Bog Norte',true)).toBe(true);expect(canAccess(p,'CO Centro','CO GC Bog Sur',true)).toBe(false)})
 it('bloquea escritura vertical para consulta',()=>{const p=profile('consulta');expect(canAccess(p,'CO Centro','CO GC Bog Norte')).toBe(true);expect(canAccess(p,'CO Centro','CO GC Bog Norte',true)).toBe(false)})
 it('permite alcance regional sin cruzar regionales',()=>{const p=profile('regional',[{regional:'CO Centro',gerencia:''}]);expect(canAccess(p,'CO Centro','X',true)).toBe(true);expect(canAccess(p,'CO Norte','X',true)).toBe(false)})
})
describe('concurrencia lógica de 20 usuarios',()=>{
 it('acepta 20 lotes independientes y rechaza colisiones dentro de cada transacción',async()=>{const jobs=Array.from({length:20},(_,i)=>Promise.resolve(validateRecordBatch([{gerencia:`G${i}`,fechaRegistro:'2026-08-05',cedula:`C${i}`,sector:`COM${i}`,valorReportado:`COM${i}`,nombre:`N${i}`}])));expect(await Promise.all(jobs)).toEqual(Array(20).fill(null));expect(validateRecordBatch([{gerencia:'G',fechaRegistro:'2026-08-05',cedula:'1',sector:'COM1',valorReportado:'COM1',nombre:'A'},{gerencia:'G',fechaRegistro:'2026-08-05',cedula:'2',sector:'COM2',valorReportado:'COM1',nombre:'B'}])).toContain('cubierta más de una vez')})
 it('permite ausencia y supernumerario cubriendo esa posición',()=>{expect(validateRecordBatch([{gerencia:'G',fechaRegistro:'2026-08-05',cedula:'1',sector:'COM1',valorReportado:'Enfermedad Común',nombre:'A'},{gerencia:'G',fechaRegistro:'2026-08-05',cedula:'2',sector:'SUP1',valorReportado:'COM1',nombre:'B'}])).toBeNull()})
})
