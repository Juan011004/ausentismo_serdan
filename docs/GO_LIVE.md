# Go-live y operación paralela

## Antes del corte

- Responsable de negocio, administrador y soporte identificados.
- Congelamiento del Apps Script aprobado para una ventana concreta; no ejecutarlo todavía.
- Backup con timestamp de ambos Sheets y exportación XLSX local verificada.
- PITR/backup Supabase comprobado y rollback ensayado.
- Migración incremental con dry-run limpio y conciliación al 100%.
- Pilotos creados con alcance mínimo; capacitación y canal de soporte activos.

## Operación paralela

1. Mantener Apps Script disponible como contingencia, sin retirarlo.
2. Durante 5 días hábiles, registrar oficialmente en el sistema nuevo y comparar diariamente con Sheets.
3. No hacer doble escritura manual. Sheets recibe la proyección del worker.
4. Revisar por fecha/gerencia/posición: totales, novedades, vacantes, cubrimientos y duplicados.
5. Dos mañanas pico consecutivas: observar 20 usuarios, latencia, errores, rate limit, cola pendiente/dead y cuota Sheets.
6. Cualquier diferencia detiene el corte y abre incidente; corregir y repetir dos mañanas.

## Criterio de corte

- 100% de conciliación diaria y acumulada.
- Cero trabajos `dead`; pendientes dentro del SLA acordado.
- Login, lectura, guardado idempotente, consolidado y dashboard aprobados por pilotos.
- Rollback ejecutado en ensayo y evidencia conservada.
- Aprobación escrita del responsable de negocio.

Solo entonces se congela el Apps Script. No se elimina durante al menos un ciclo de retención acordado.

## Monitoreo y rollback

- Revisar a las 06:30, 07:30, 08:30 y 10:00 durante las dos mañanas pico.
- Si hay pérdida, duplicación, acceso indebido o cola `dead`: detener escrituras, conservar evidencia, promover deployment anterior y reactivar Apps Script con aprobación.
- Después, reconciliar; nunca borrar ni sobrescribir masivamente para “cuadrar”.
