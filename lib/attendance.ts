import 'server-only'
import { unstable_cache } from 'next/cache'
import { ABSENCE_OPTIONS, POSITION_PREFIXES } from '@/lib/constants'
import { appendValues, readValues, recordsSpreadsheetId, sheets, structureSpreadsheetId } from '@/lib/google-sheets'
import { isoDate, normalizeId, normalizeText, operationalDate } from '@/lib/normalize'
import { automaticNovelty, findHeaderRow, isCollaboratorManagement, isMasterPosition, isSupernumerary, isVacancy, mapColumnAliases } from '@/lib/domain'
import type { Assignment, DailyRecord, StructureRow } from '@/lib/types'
import { rpc, supabaseRequest } from '@/lib/supabase'
import { createHash,createHmac } from 'crypto'
import type { AccessProfile } from '@/lib/access'
import { canAccess } from '@/lib/access'

const aliases: Record<keyof StructureRow, string[]> = {
  regional: ['REGIONAL'], gerencia: ['GERENCIA'], sector: ['SECTOR /POSICION', 'SECTOR/POSICION', 'SECTOR'],
  estado: ['ESTADO'], cedula: ['CEDULA'], nombre: ['NOMBRE'], cargo: ['CARGO APROBADO', 'CARGO'],
  cargoAvancys: ['CARGO AVANCYS'], tipo: ['TIPO'], fechaIngreso: ['FECHA INGRESO'],
  unidad: ['UNIDAD', 'UNIDAD DE NEGOCIO'], numeroPersonal: ['NUMERO PERSONAL'], correo: ['CORREO PERSONAL', 'CORREO']
}
const assignmentSecret=()=>{const value=process.env.CSRF_SECRET;if(!value)throw new Error('CSRF_NOT_CONFIGURED');return value}

function findHeader(rows: unknown[][]) {
  return findHeaderRow(rows, [aliases.regional, aliases.gerencia, aliases.sector])
}

function mapHeaders(headers: unknown[]) {
  return mapColumnAliases(headers, aliases) as Record<keyof StructureRow, number>
}

export const getStructure = unstable_cache(async (): Promise<StructureRow[]> => {
  const tab = process.env.GOOGLE_STRUCTURE_SHEET ?? 'Estructura Nacional'
  const rows = await readValues(structureSpreadsheetId(), `'${tab}'!A:Z`)
  const headerIndex = findHeader(rows)
  const columns = mapHeaders(rows[headerIndex] ?? [])
  const value = (row: unknown[], key: keyof StructureRow) => columns[key] >= 0 ? row[columns[key]] : ''
  return rows.slice(headerIndex + 1).map(row => ({
    regional: normalizeText(value(row, 'regional')), gerencia: normalizeText(value(row, 'gerencia')),
    sector: normalizeText(value(row, 'sector')), estado: normalizeText(value(row, 'estado')).toUpperCase(),
    cedula: normalizeId(value(row, 'cedula')), nombre: normalizeText(value(row, 'nombre')) || 'VACANTE',
    cargo: normalizeText(value(row, 'cargo')), cargoAvancys: normalizeText(value(row, 'cargoAvancys')),
    tipo: normalizeText(value(row, 'tipo')), fechaIngreso: isoDate(value(row, 'fechaIngreso')),
    unidad: normalizeText(value(row, 'unidad')), numeroPersonal: normalizeText(value(row, 'numeroPersonal')),
    correo: normalizeText(value(row, 'correo'))
  })).filter(row => row.gerencia || row.sector)
}, ['structure-v2'], { revalidate: 300, tags: ['structure'] })

export async function getDailyRecords(): Promise<(DailyRecord & { rowNumber: number })[]> {
  return getTransactionalRecords()
}

type DbRecord={id:string;operational_date:string;regional:string;gerencia:string;cedula:string;nombre:string;cargo:string;source_position:string;covered_position:string|null;fecha_ingreso:string|null;reported_value:string;version:number}
export async function getTransactionalRecords(date?:string) {
  const query=`daily_records?select=id,operational_date,regional,gerencia,cedula,nombre,cargo,source_position,covered_position,fecha_ingreso,reported_value,version${date?`&operational_date=eq.${date}`:''}`
  const rows=await supabaseRequest<DbRecord[]>(query)
  return rows.map((r,index)=>({id:r.id,regional:r.regional,gerencia:r.gerencia,cedula:r.cedula,nombre:r.nombre,cargo:r.cargo,sector:r.source_position,coveredPosition:r.covered_position,fechaIngreso:r.fecha_ingreso??'-',fechaRegistro:r.operational_date,valorReportado:r.reported_value,rowNumber:index+2,version:r.version}))
}

async function getTransactionalRange(from:string,to:string,regional='',gerencia=''){const all:DbRecord[]=[];for(let offset=0;;offset+=1000){const filters=[from&&`operational_date=gte.${from}`,to&&`operational_date=lte.${to}`,regional&&`regional=eq.${encodeURIComponent(regional)}`,gerencia&&`gerencia=eq.${encodeURIComponent(gerencia)}`].filter(Boolean).join('&');const page=await supabaseRequest<DbRecord[]>(`daily_records?select=id,operational_date,regional,gerencia,cedula,nombre,cargo,source_position,covered_position,fecha_ingreso,reported_value,version&${filters}${filters?'&':''}limit=1000&offset=${offset}&order=operational_date.asc`);all.push(...page);if(page.length<1000)break}return all.map(r=>({id:r.id,regional:r.regional,gerencia:r.gerencia,cedula:r.cedula,nombre:r.nombre,cargo:r.cargo,sector:r.source_position,coveredPosition:r.covered_position,fechaIngreso:r.fecha_ingreso??'-',fechaRegistro:r.operational_date,valorReportado:r.reported_value,version:r.version}))}

const recordAliases = {
  regional: ['REGIONAL'], gerencia: ['GERENCIA'], cedula: ['CEDULA'], nombre: ['NOMBRE'], cargo: ['CARGO'],
  sector: ['SECTOR', 'SECTOR /POSICION', 'SECTOR/POSICION'], fechaIngreso: ['FECHA_INGRESO', 'FECHA INGRESO'],
  fechaRegistro: ['FECHA_REGISTRO', 'FECHA REGISTRO', 'VALE'], valorReportado: ['VALOR_REPORTADO', 'VALOR REPORTADO', 'INASISTENCIA']
}

export function mapRecordRows(rows: unknown[][]) {
  const headerIndex = findHeaderRow(rows, [recordAliases.regional, recordAliases.gerencia, recordAliases.sector, recordAliases.fechaRegistro])
  const columns = mapColumnAliases(rows[headerIndex] ?? [], recordAliases)
  const value = (row: unknown[], key: keyof typeof recordAliases) => columns[key] >= 0 ? row[columns[key]] : ''
  return rows.slice(headerIndex + 1).map((row, index) => ({
    regional: normalizeText(value(row, 'regional')), gerencia: normalizeText(value(row, 'gerencia')),
    cedula: normalizeId(value(row, 'cedula')), nombre: normalizeText(value(row, 'nombre')),
    cargo: normalizeText(value(row, 'cargo')), sector: normalizeText(value(row, 'sector')),
    fechaIngreso: isoDate(value(row, 'fechaIngreso')), fechaRegistro: isoDate(value(row, 'fechaRegistro')),
    valorReportado: normalizeText(value(row, 'valorReportado')), rowNumber: headerIndex + index + 2
  })).filter(row => row.gerencia || row.sector || row.fechaRegistro)
}

export async function getAssignments(gerencia: string, date = operationalDate()) {
  const [structure, daily] = await Promise.all([getStructure(), getTransactionalRecords(date)])
  const today = daily.filter(r => r.gerencia === gerencia && r.fechaRegistro === date)
  const selected = structure.filter(r => r.gerencia === gerencia)
  const regional = selected[0]?.regional ?? ''
  const elite = gerencia.toUpperCase().includes('ELITE')
  const collaboratorGroup = isCollaboratorManagement(gerencia)
  const availablePositions = structure.filter(r => (elite ? r.regional === regional : r.gerencia === gerencia) && isMasterPosition(r.sector, gerencia)).map(r => r.sector)
  const groups: Record<string, Assignment[]> = {}
  for (const row of selected) {
    const supernumerary = isSupernumerary(row)
    const vacancy = isVacancy(row)
    if (!isMasterPosition(row.sector, gerencia) && !supernumerary) continue
    if (vacancy && !isMasterPosition(row.sector, gerencia)) continue
    const cedula = vacancy ? `VACANTE-${row.sector}` : row.cedula
    if (today.some(r => r.sector === row.sector || (r.cedula && r.cedula === cedula))) continue
    const flexible = supernumerary
    const group = supernumerary ? (collaboratorGroup ? 'COLABORADORES' : elite ? 'ÉLITES' : 'SUPERNUMERARIOS') : row.unidad || 'OPERACIÓN'
    const auto = automaticNovelty(gerencia, row.cargo)
    const assignmentId=createHmac('sha256',assignmentSecret()).update(`${date}|${gerencia}|${cedula}|${row.sector}`).digest('base64url').slice(0,24)
    ;(groups[group] ??= []).push({ id: assignmentId, regional: row.regional, gerencia, cedula, nombre: vacancy ? 'VACANTE' : row.nombre, cargo: row.cargo, sector: row.sector, fechaIngreso: row.fechaIngreso, fechaRegistro: date, valorReportado: vacancy ? 'Vacante' : flexible ? '' : auto || row.sector, esSuper: flexible, autoVacante: vacancy })
  }
  return { groups, availablePositions: [...new Set(availablePositions)].sort(), options: ABSENCE_OPTIONS, stats: { expected: selected.filter(r => isMasterPosition(r.sector, gerencia)).length, registered: today.length, covered: today.filter(r => !r.valorReportado.toUpperCase().includes('VACANTE')).length }, completed: today.length > 0 && Object.keys(groups).length === 0 }
}

export async function saveRecords(requestId:string,email:string,records:DailyRecord[]) {
  const payloadHash=createHash('sha256').update(JSON.stringify(records)).digest('hex')
  return rpc<{ok:boolean;replayed:boolean;count:number}>('save_attendance_batch',{p_request_id:requestId,p_email:email,p_payload_hash:payloadHash,p_records:records})
}

export async function updateRecord(recordId:string,version:number,newValue:string,reason:string,email:string) {
  return rpc<{ok:boolean;version:number}>('update_attendance_record',{p_id:recordId,p_version:version,p_email:email,p_value:newValue,p_reason:reason})
}

export async function getConsolidated(email:string,filters:{regional:string;gerencia:string;from:string;to:string;search:string;page:number;pageSize:number}) {
  type ConsolidatedEmployee={records:Record<string,{value:string}>}
  const result=await rpc<{dates:string[];employees:ConsolidatedEmployee[];total:number;page:number;pageSize:number}>('get_consolidated_page',{p_email:email,p_regional:filters.regional,p_gerencia:filters.gerencia,p_from:filters.from||null,p_to:filters.to||null,p_search:filters.search,p_page:filters.page,p_page_size:filters.pageSize})
  // El Apps Script incorporaba también los valores existentes en Consolidado.
  // Esto evita que una posición histórica (COM/MKP/etc.) aparezca vacía al editar.
  const existing=result.employees.flatMap(employee=>Object.values(employee.records).map(record=>record.value)).filter(Boolean)
  return {...result,options:[...new Set([...ABSENCE_OPTIONS,...existing])].sort()}
}

export async function getDashboard(profile?:AccessProfile) {
  const date = operationalDate()
  const [structure, daily] = await Promise.all([getStructure(), getTransactionalRecords(date)])
  const visibleStructure=profile?structure.filter(r=>canAccess(profile,r.regional,r.gerencia)):structure
  const today = daily.filter(r => r.fechaRegistro === date&&(!profile||canAccess(profile,r.regional,r.gerencia)))
  const absences = today.filter(r => !POSITION_PREFIXES.some(p => r.valorReportado.toUpperCase().startsWith(p)) && !r.valorReportado.toUpperCase().startsWith('LABOR'))
  const byNovelty = Object.entries(absences.reduce<Record<string, number>>((a, r) => { a[r.valorReportado] = (a[r.valorReportado] ?? 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])
  return { date, approved: visibleStructure.length, hired: visibleStructure.filter(r => r.estado === 'CONTRATADO').length, vacancies: visibleStructure.filter(r => r.estado === 'VACANTE' || r.nombre === 'VACANTE').length, todayRecords: today.length, todayAbsences: absences.length, byNovelty }
}

export async function getReport(profile:AccessProfile,filters:{regional:string;gerencia:string;from:string;to:string}){
  const [structure,raw]=await Promise.all([getStructure(),getTransactionalRange(filters.from,filters.to,filters.regional,filters.gerencia)])
  const visibleStructure=structure.filter(r=>canAccess(profile,r.regional,r.gerencia)&&(!filters.regional||r.regional===filters.regional)&&(!filters.gerencia||r.gerencia===filters.gerencia))
  const records=raw.filter(r=>canAccess(profile,r.regional,r.gerencia)&&(!filters.regional||r.regional===filters.regional)&&(!filters.gerencia||r.gerencia===filters.gerencia))
  const dates=[...new Set(records.map(r=>r.fechaRegistro))].sort(),latest=dates.at(-1)??operationalDate(),latestRows=records.filter(r=>r.fechaRegistro===latest)
  const masters=visibleStructure.filter(r=>isMasterPosition(r.sector,r.gerencia)),masterKeys=new Set(masters.map(r=>`${r.gerencia}|${r.sector}`)),registeredKeys=new Set(latestRows.filter(r=>masterKeys.has(`${r.gerencia}|${r.sector}`)).map(r=>`${r.gerencia}|${r.sector}`))
  const absence=(value:string)=>!isMasterPosition(value)&&!value.toUpperCase().startsWith('LABOR')&&value.toUpperCase()!=='VACANTE'
  const absences=records.filter(r=>absence(r.valorReportado)),byNovelty=Object.entries(absences.reduce<Record<string,number>>((a,r)=>(a[r.valorReportado]=(a[r.valorReportado]??0)+1,a),{})).sort((a,b)=>b[1]-a[1])
  const group=(key:'regional'|'gerencia')=>Object.values(masters.reduce<Record<string,{name:string;expected:number;registered:number}>>((a,r)=>{const name=r[key];a[name]??={name,expected:0,registered:0};a[name].expected++;if(registeredKeys.has(`${r.gerencia}|${r.sector}`))a[name].registered++;return a},{})).map(x=>({...x,compliance:x.expected?x.registered/x.expected:0})).sort((a,b)=>a.name.localeCompare(b.name))
  const daily=dates.map(date=>{const rows=records.filter(r=>r.fechaRegistro===date);return{date,records:rows.length,absences:rows.filter(r=>absence(r.valorReportado)).length,vacancies:rows.filter(r=>r.valorReportado.toUpperCase()==='VACANTE').length}})
  const monthly=Object.values(daily.reduce<Record<string,{month:string;records:number;absences:number;vacancies:number}>>((a,r)=>{const month=r.date.slice(0,7);a[month]??={month,records:0,absences:0,vacancies:0};a[month].records+=r.records;a[month].absences+=r.absences;a[month].vacancies+=r.vacancies;return a},{}))
  const covered=new Set(latestRows.filter(r=>r.coveredPosition).map(r=>`${r.gerencia}|${r.coveredPosition}`)),allUncovered=masters.filter(r=>!covered.has(`${r.gerencia}|${r.sector}`)),uncovered=allUncovered.slice(0,200)
  const birthdays=await auxiliaryEvents('Cumpleaños',['FECHA_REGISTRO','VALE'],filters,profile)
  const entries=visibleStructure.filter(r=>r.fechaIngreso&&r.fechaIngreso!=='-'&&(!filters.from||r.fechaIngreso>=filters.from)&&(!filters.to||r.fechaIngreso<=filters.to)).slice(0,200)
  const exits=await auxiliaryEvents('Retiro',['FECHA RETIRO'],filters,profile)
  return{latest,filters,kpis:{expected:masters.length,registered:registeredKeys.size,compliance:masters.length?registeredKeys.size/masters.length:0,absences:absences.length,vacancies:visibleStructure.filter(isVacancy).length,uncovered:allUncovered.length,birthdays:birthdays.length,entries:entries.length,exits:exits.length},byRegional:group('regional'),byManagement:group('gerencia'),byNovelty,daily,monthly,uncovered,details:{birthdays,entries,exits},definitions:{compliance:'Posiciones maestras registradas / posiciones maestras esperadas en la última fecha del filtro.',absence:'Registros cuyo valor no es posición maestra, LABOR ni Vacante.',uncovered:'Posiciones maestras sin covered_position en la última fecha.',vacancy:'Filas de estructura con ESTADO=VACANTE o nombre VACANTE.'}}
}

async function auxiliaryEvents(tab:string,dateAliases:string[],filters:{regional:string;gerencia:string;from:string;to:string},profile:AccessProfile){try{const rows=await readValues(structureSpreadsheetId(),`'${tab}'!A:Z`),headerIndex=findHeaderRow(rows,[['REGIONAL'],['GERENCIA'],dateAliases]),columns=mapColumnAliases(rows[headerIndex]??[],{regional:['REGIONAL'],gerencia:['GERENCIA'],cedula:['CEDULA'],nombre:['NOMBRE'],date:dateAliases});return rows.slice(headerIndex+1).map(r=>({regional:normalizeText(r[columns.regional]),gerencia:normalizeText(r[columns.gerencia]),cedula:normalizeId(r[columns.cedula]),nombre:normalizeText(r[columns.nombre]),date:isoDate(r[columns.date])})).filter(r=>r.date&&canAccess(profile,r.regional,r.gerencia)&&(!filters.regional||r.regional===filters.regional)&&(!filters.gerencia||r.gerencia===filters.gerencia)&&(!filters.from||r.date>=filters.from)&&(!filters.to||r.date<=filters.to)).slice(0,200)}catch{return[]}}
