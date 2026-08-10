# Importación y reconciliación

## Dry-run obligatorio

```powershell
pnpm import:dry-run -- --output=reports/import/revision
```

El proceso abre `Estructura Nacional.xlsx` y `Registro.xlsx` en modo lectura, calcula SHA-256 y produce `summary.json` y archivos JSONL para válidas, duplicadas, conflictivas, rechazadas y advertencias. Normaliza cédulas como texto, Unicode/NBSP, aliases sin acentos y fechas calendario de Bogotá. Nunca modifica los originales.

Clave normal: `fecha|gerencia|posición`. En ELITE/RE/SHARE/HSE se usa colaborador/fecha para unicidad porque varias personas pueden compartir posición genérica; la reconciliación conserva la clave solicitada como multiconjunto para no ocultar repeticiones.

## Resultado de la línea base

- Estructura: 1.485 válidas; 0 duplicadas, conflictos o rechazadas.
- Registro: 5.625 válidas, 38 duplicadas exactas, 6 conflictivas, 0 rechazadas y 40 advertencias por posiciones históricas ausentes de la estructura actual.
- Las seis filas conflictivas corresponden a tres claves y deben ser resueltas por negocio. No se permite escoger automáticamente cuál conservar.

## Ejecución autorizada

1. Aplicar `supabase/migrations/202608050003_special_management_uniqueness.sql`.
2. Resolver las seis filas y volver a generar un Excel aprobado o una fuente corregida inmutable.
3. Repetir dry-run; conflictos y rechazados deben ser cero.
4. Guardar backup/PITR y exportar tablas transaccionales.
5. Usar el código de confirmación emitido por ese dry-run:

```powershell
pnpm import:execute -- --execute=true --actor=administrador@serdan.com.co --confirm=IMPORT:CODIGO --structure="C:/ruta/Estructura Nacional.xlsx" --records="C:/ruta/Registro.xlsx"
```

La ejecución agrupa por fecha/gerencia, usa requestId determinista y la RPC transaccional. Repetir el mismo archivo reproduce los requestId y no duplica lotes. La estructura no se copia a Postgres: Google Sheets continúa como fuente maestra.

## Reconciliación

```powershell
pnpm reconcile:dry-run -- --output=reports/reconciliation/revision.json
```

Compara Postgres y la pestaña Consolidado como multiconjuntos por fecha/gerencia/posición y reporta faltantes, extras, valores distintos y claves repetidas. El estado actual es Postgres 0, Sheets 5.629: no cumple aceptación.

## Criterios de aceptación

- SHA-256 de los archivos aprobados coincide con el dry-run autorizado.
- Cero rechazados y cero conflictos.
- Duplicados exactos tienen decisión documentada y no se importan dos veces.
- 100% de grupos transaccionales confirmados; cero lotes `failed`.
- Reconciliación: cero faltantes, cero extras y cero discrepancias de valores.
- Conteos por fecha, gerencia y posición coinciden al 100%.
- Aprobación firmada del responsable de negocio antes de cualquier corte.
