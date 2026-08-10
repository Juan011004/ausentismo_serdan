import { POSITION_PREFIXES } from './constants'
import { normalizeHeader, normalizeText } from './normalize'

export const SPECIAL_MANAGEMENT = /(?:ELITE|SHARE|HSE)|^RE\s/i

export function isSpecialManagement(value: string) { return SPECIAL_MANAGEMENT.test(normalizeText(value)) }

export function isCollaboratorManagement(value: string) {
  const gerencia = normalizeText(value).toUpperCase()
  return gerencia.includes('CO GC SHARE') || gerencia.includes('HSE') || gerencia.startsWith('RE ')
}

export function isMasterPosition(sector: string, gerencia = '') {
  const normalized = normalizeText(sector).toUpperCase()
  return POSITION_PREFIXES.some(prefix => normalized.startsWith(prefix)) || /SHARE/i.test(gerencia)
}

export function isSupernumerary(row: { unidad: string }) {
  const unidad = normalizeText(row.unidad).toUpperCase()
  return unidad.includes('SUPER') || unidad === 'NO APLICA'
}

export function isVacancy(row: { estado: string; nombre: string; cedula: string }) {
  return !normalizeText(row.cedula) || normalizeText(row.estado).toUpperCase() === 'VACANTE' || normalizeText(row.nombre).toUpperCase() === 'VACANTE'
}

export function automaticNovelty(gerencia: string, cargo: string) {
  const g = normalizeText(gerencia).toUpperCase(), c = normalizeText(cargo).toUpperCase()
  if (g.startsWith('RE ')) {
    if (c.includes('LIDER OPERATIVO II')) return 'LABOR JO'
    if (c.includes('ENTRENADOR COMERCIAL')) return 'LABOR ENT'
    if (c.includes('GESTOR REGIONAL')) return 'LABOR GES'
    if (c.includes('IMPLEMENTADOR DE VENTAS')) return 'LABOR IMP'
    if (c.includes('REPRESENTANTE FOOD LEED') || c.includes('TRADE MARKETING')) return 'LABOR FD'
    return 'LABOR NORMAL'
  }
  if (g.includes('HSE')) {
    if (c.includes('LIDER DE SEGURIDAD VIAL')) return 'Labor sg'
    if (c.includes('SUPERVISOR HSE SENIOR')) return 'Labor SP'
    return 'LABOR NORMAL'
  }
  return ''
}

export function findHeaderRow(rows: unknown[][], required: string[][], limit = 20) {
  let best = { index: -1, score: 0 }
  rows.slice(0, limit).forEach((row, index) => {
    const values = row.map(normalizeHeader)
    const score = required.filter(group => group.some(alias => values.includes(alias))).length
    if (score > best.score) best = { index, score }
  })
  return best.score >= Math.min(2, required.length) ? best.index : 0
}

export function mapColumnAliases(headers: unknown[], aliases: Record<string, string[]>) {
  const normalized = headers.map(normalizeHeader)
  return Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, normalized.findIndex(value => names.includes(value))])) as Record<string, number>
}

type BatchRecord={gerencia:string;fechaRegistro:string;cedula:string;sector:string;valorReportado:string;nombre:string}
export function validateRecordBatch(records:BatchRecord[]){
  if(!records.length)return 'El lote está vacío.'
  const context=new Set(records.map(r=>`${r.gerencia}|${r.fechaRegistro}`));if(context.size!==1)return 'El lote debe corresponder a una sola gerencia y fecha.'
  const special=isSpecialManagement(records[0].gerencia)
  const source=new Set<string>(),covered=new Set<string>(),people=new Set<string>()
  for(const r of records){
    // El sistema original admite posiciones fuente genéricas compartidas en
    // ELITE/RE/SHARE/HSE; la migración 003 aplica la misma excepción.
    if(!special&&source.has(r.sector))return `La posición ${r.sector} aparece más de una vez.`;source.add(r.sector)
    const person=r.cedula||`VACANTE:${r.sector}`;if(people.has(person))return `El colaborador ${person} aparece más de una vez.`;people.add(person)
    const target=isMasterPosition(r.valorReportado)?r.valorReportado:''
    if(target&&covered.has(target))return `La posición ${target} está cubierta más de una vez.`;if(target)covered.add(target)
    if(r.nombre.toUpperCase()==='VACANTE'&&r.valorReportado!=='Vacante')return `La vacante ${r.sector} debe registrarse automáticamente como Vacante.`
  }
  return null
}
