import { z } from 'zod'

const safeText = z.string().trim().min(1).max(180)
export const dailyRecordSchema = z.object({
  regional: safeText, gerencia: safeText, cedula: z.string().trim().max(30), nombre: safeText,
  cargo: z.string().trim().max(180), sector: safeText, fechaIngreso: z.string().max(30),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), valorReportado: safeText
})
export const saveBatchSchema = z.object({
  requestId: z.string().uuid(),
  records: z.array(dailyRecordSchema).min(1).max(500)
})
export const updateRecordSchema = z.object({
  recordId: z.string().uuid(), version: z.number().int().positive(), newValue: safeText,
  reason: z.string().trim().min(5).max(300)
})
