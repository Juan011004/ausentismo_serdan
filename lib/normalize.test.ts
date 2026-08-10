import { describe, expect, it } from 'vitest'
import { isoDate, normalizeHeader, normalizeId, normalizeText } from './normalize'
import { automaticNovelty, isMasterPosition, isSpecialManagement, isSupernumerary, isVacancy, mapColumnAliases, validateRecordBatch } from './domain'
describe('normalización de datos', () => {
  it('normaliza encabezados y espacios', () => { expect(normalizeHeader(' SECTOR /POSICIÓN ')).toBe('SECTOR /POSICION'); expect(normalizeText('CO\u00a0 GC  Cali')).toBe('CO GC Cali') })
  it('conserva identificadores como texto', () => { expect(normalizeId(1085938521)).toBe('1085938521'); expect(normalizeId('1085938521.0')).toBe('1085938521') })
  it('normaliza fechas de Excel ya interpretadas', () => { expect(isoDate('2026-08-05 00:00:00')).toBe('2026-08-05'); expect(isoDate('-')).toBe('-') })
  it('convierte seriales Excel/Sheets y fechas colombianas', () => { expect(isoDate(46239)).toBe('2026-08-05'); expect(isoDate('05/08/2026')).toBe('2026-08-05') })
  it('detecta columnas por alias, no por posición', () => { expect(mapColumnAliases(['Inasistencia', 'vale'], { fecha: ['VALE'], valor: ['INASISTENCIA'] })).toEqual({ fecha: 1, valor: 0 }) })
  it('reconoce posiciones y gerencias especiales', () => { for (const p of ['COM1', 'MKP2', 'NEG3', 'COO4', 'C005']) expect(isMasterPosition(p)).toBe(true); for (const g of ['Elite Centro', 'RE Norte', 'CO GC Share', 'HSE']) expect(isSpecialManagement(g)).toBe(true) })
  it('distingue supernumerarios por unidad, no aplica y vacantes', () => { expect(isSupernumerary({ unidad: 'SUPERNUMERARIOS' })).toBe(true); expect(isSupernumerary({ unidad: 'NO APLICA' })).toBe(true); expect(isSupernumerary({ unidad: 'OPERACIÓN' })).toBe(false); expect(isVacancy({ estado: '', nombre: '', cedula: '' })).toBe(true) })
  it('asigna automáticamente labores RE y HSE por cargo', () => { expect(automaticNovelty('RE Norte', 'Entrenador Comercial')).toBe('LABOR ENT'); expect(automaticNovelty('HSE', 'Supervisor HSE Senior')).toBe('Labor SP'); expect(automaticNovelty('CO GC Cali', 'Asesor')).toBe('') })
  it('permite posiciones fuente compartidas en gerencias especiales', () => {
    const base={fechaRegistro:'2026-08-10',sector:'NO APLICA',valorReportado:'LABOR NORMAL'}
    expect(validateRecordBatch([
      {...base,gerencia:'RE Norte',cedula:'1',nombre:'Uno'},
      {...base,gerencia:'RE Norte',cedula:'2',nombre:'Dos'}
    ])).toBeNull()
    expect(validateRecordBatch([
      {...base,gerencia:'CO GC Norte',cedula:'1',nombre:'Uno'},
      {...base,gerencia:'CO GC Norte',cedula:'2',nombre:'Dos'}
    ])).toContain('aparece más de una vez')
  })
})
