# Prompts para terminar y desplegar Ausentismo Serdan

Ejecuta los prompts en orden dentro de esta misma carpeta. Cada prompt exige inspección, implementación, pruebas y un cierre verificable; no pegues credenciales en el chat.

## 1. Auditoría inicial y cierre de brechas

> Trabaja en `C:\Users\juanc\OneDrive\Documentos\ausentismo_serdan`. Lee `README.md`, `PROMPTS_CODEX.md`, los dos Excel originales y los tres scripts fuente compartidos. Audita el proyecto contra toda la lógica del Apps Script: detección de columnas, reglas ELITE/RE/SHARE/HSE, vacantes, supernumerarios, posiciones COM/MKP/NEG/COO/C00, registros del día, consolidado y estructura. Corrige cualquier diferencia. No copies secretos. Ejecuta typecheck, tests y build. Entrega una matriz requisito → implementación → prueba.

## 2. Modelo transaccional y concurrencia

> Implementa Supabase Postgres como sistema de registro para soportar concurrencia, auditoría e idempotencia. Crea migraciones para perfiles, permisos por regional/gerencia, registros diarios, historial de cambios, lotes idempotentes y cola de sincronización a Google Sheets. Define una restricción única adecuada para colaborador/posición/fecha, una RPC transaccional para guardar un lote completo y RLS por usuario/rol. Conserva Google Sheets como fuente de estructura y destino interoperable. Añade reintentos con backoff, estado de sincronización y pruebas de 20 usuarios concurrentes. Documenta rollback.

## 3. Roles y seguridad empresarial

> Endurece autenticación y autorización. Mantén Google OAuth restringido a `serdan.com.co`, añade roles `admin`, `regional`, `gerencia` y `consulta`, y aplica permisos tanto en interfaz como servidor/base de datos. Agrega sesión de 8 horas, cierre por inactividad, logs sin PII innecesaria, rate limiting distribuido, CSRF para mutaciones, CSP estricta, validación Zod y trazabilidad de quién creó/editó cada registro. Incluye pruebas negativas de acceso horizontal y vertical. No almacenes claves en el repositorio.

## 4. Registro diario completo

> Lleva Registro diario a calidad productiva con UX inspirada en `casa_cambio`: navegación compacta, tarjetas claras, responsive móvil, teclado accesible, estados de carga/error/vacío, búsqueda, progreso, guardado de borrador local y confirmación previa. Valida que cada posición maestra quede cubierta exactamente una vez, que un supernumerario no cubra dos posiciones, que las vacantes sean automáticas y que no haya duplicados del día. Permite reintentar sin duplicar mediante requestId. Añade pruebas unitarias y de componentes para todas las reglas.

## 5. Consolidado y edición segura

> Completa Consolidado con filtros dependientes Regional → Gerencia, rango de fechas, búsqueda, cabeceras/primera columna fijas, paginación o virtualización para grandes volúmenes, colores por novedad y exportación XLSX. Sustituye la edición por número de fila por identificadores estables de base de datos. Exige motivo de corrección, guarda antes/después/autor/fecha y maneja conflictos optimistas. Excluye gerencias ELITE/RE cuando el filtro sea solo regional, tal como hacía el sistema anterior. Prueba cargas grandes.

## 6. Dashboard y reportes

> Replica y mejora los resúmenes existentes usando datos transaccionales: cumplimiento por regional/gerencia, ausentismo por novedad, posiciones sin cobertura, tendencia diaria/mensual, vacantes, cumpleaños, ingresos y retiros. Agrega filtros compartidos, definiciones visibles de KPI, gráficos accesibles, tablas de detalle y exportación XLSX. Verifica cada KPI contra totales de los Excel suministrados y documenta las fórmulas.

## 7. Sincronización Google Sheets

> Implementa un worker seguro para sincronizar lotes pendientes desde Postgres a las pestañas correctas de Google Sheets usando service account. Debe usar batch writes, idempotencia, reintentos exponenciales, dead-letter queue, métricas y reconciliación diaria. Crea una pantalla admin con último sync, pendientes, errores y botón de reintento autorizado. Nunca borres `Registro Diario` después de consolidar; migra el concepto a vistas/materializaciones o procesos reversibles. Añade un comando de reconciliación dry-run.

## 8. Calidad, carga y observabilidad

> Añade Vitest, Testing Library y Playwright. Cubre reglas de negocio, APIs, permisos y flujo crítico completo. Ejecuta una prueba de carga realista de 20 usuarios simultáneos que consultan gerencias y guardan lotes; fija objetivos p95 y tasa de error. Integra logging estructurado, health endpoint, métricas y Sentry opcional sin exponer PII. Corrige problemas encontrados y entrega resultados antes/después.

## 9. Migración y validación paralela

> Construye scripts de importación dry-run para `Estructura Nacional.xlsx` y `Registro.xlsx`. Normaliza cédulas como texto, espacios no separables, acentos, fechas Bogotá y aliases de encabezados. Genera reportes de filas válidas, duplicadas, conflictivas y rechazadas sin modificar origen. Luego crea un procedimiento de ejecución autorizada y un comparador que reconcilie por fecha/gerencia/posición entre sistema nuevo y Sheets. Incluye plan de operación paralela y criterios de aceptación.

## 10. Despliegue Vercel de punta a punta

> Prepara producción: revisa `vercel.json`, variables, regiones, OAuth callback, service account, Supabase, dominios, políticas de seguridad, backups y alertas. Ejecuta lint, typecheck, tests, build y smoke test. Crea checklist exacto de Google Cloud, Supabase y Vercel. Despliega solo si las credenciales ya están configuradas y tengo autorización; si falta algo, detente indicando el campo exacto. Tras desplegar, valida login corporativo, lectura de estructura, guardado idempotente, consolidado, dashboard y logs. Entrega URL, commit/tag, resultado de pruebas y rollback.

## 11. Corte productivo

> Diseña y ejecuta el checklist de go-live: congelamiento temporal del Apps Script, backup de Sheets, importación incremental, reconciliación, usuarios piloto, monitoreo por dos mañanas pico y rollback ensayado. No retires el sistema anterior hasta lograr 100% de conciliación y aprobación del responsable de negocio. Entrega manual corto para usuario, administrador y soporte.
