# Fórmulas y conciliación de KPI

## Definiciones

- **Posiciones esperadas:** filas visibles de estructura cuyo sector empieza por `COM`, `MKP`, `NEG`, `COO` o `C00`; SHARE conserva todas sus posiciones.
- **Posiciones registradas:** claves únicas `gerencia|source_position` presentes en la última fecha del filtro y existentes en el conjunto esperado.
- **Cumplimiento:** `posiciones registradas / posiciones esperadas`. Si no hay esperadas, se muestra 0.
- **Ausentismo:** registros cuyo valor reportado no es posición maestra, no empieza por `LABOR` y no es `Vacante`.
- **Sin cobertura:** posiciones maestras cuyo sector no aparece en `covered_position` en la última fecha.
- **Vacantes:** filas de estructura con `ESTADO=VACANTE` o nombre `VACANTE`.
- **Ingresos:** estructura con `fecha_ingreso` dentro del rango.
- **Retiros:** filas de la pestaña `Retiro` cuya `FECHA RETIRO` está dentro del rango.
- **Cumpleaños:** filas de la pestaña `Cumpleaños` cuya fecha de registro está dentro del rango.

Todos los KPI respetan el alcance del usuario y los filtros Regional, Gerencia y fechas.

## Línea base de los Excel suministrados

Ejecutado con `npm run verify:source-kpis` sobre `Estructura Nacional.xlsx` y `Registro.xlsx`:

| Indicador | Resultado |
|---|---:|
| Última fecha del consolidado | 2026-08-04 |
| Filas útiles de estructura | 1.485 |
| Posiciones maestras esperadas | 1.096 |
| Posiciones maestras registradas | 1.096 |
| Cumplimiento | 100,0 % |
| Registros de la última fecha | 1.453 |
| Ausencias de la última fecha | 210 |
| Vacantes de estructura | 98 |
| Posiciones sin cobertura | 35 |

La comparación de producción debe hacerse para el mismo corte de fecha y después de importar/reconciliar los datos históricos en Postgres.
