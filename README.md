# Ausentismo Serdan · Bavaria

Aplicación Next.js/TypeScript para registrar, consultar y corregir novedades de la operación TAT usando Google Sheets como fuente integrada.

## Incluye

- Acceso con Supabase Auth mediante cuentas de correo y contraseña administradas internamente.
- Registro diario agrupado por unidad, con vacantes, supernumerarios y control de posiciones ocupadas.
- Estructura nacional con búsqueda y normalización de encabezados.
- Consolidado editable con control optimista de conflictos.
- Dashboard operativo básico.
- Validación de entradas con Zod, secretos solo en servidor y encabezados de seguridad.
- Caché de estructura por 5 minutos y escrituras por lote para reducir consumo de Google API.

## Preparación local

1. Copia `.env.example` como `.env.local` y completa las variables.
2. En Google Cloud habilita Google Sheets API.
3. Comparte ambos Google Sheets con `GOOGLE_SERVICE_ACCOUNT_EMAIL` como editor.
4. Crea el primer usuario en Supabase Authentication y un perfil activo con el mismo correo y rol `admin`.
5. Ejecuta `pnpm install`, `pnpm test`, `pnpm typecheck` y `pnpm dev`.

## Despliegue en Vercel

Importa el repositorio, registra las mismas variables de entorno para Production/Preview y despliega. Nunca subas `.env`, `.env.local` ni el JSON de la cuenta de servicio.

## Decisiones de datos

La aplicación reconoce los encabezados reales de `Estructura Nacional.xlsx`, incluidos `SECTOR /POSICIÓN`, `Cargo Aprobado`, `CARGO AVANCYS` y `FECHA INGRESO`. Las cédulas se mantienen como texto. `vale`/`Inasistencia` del archivo histórico se interpretan como `fecha_registro`/`valor_reportado` por posición.

## Modelo transaccional y seguridad

1. Crear un proyecto Supabase con backups/PITR y ejecutar `supabase/migrations/202608050001_transactional_attendance.sql`.
2. Insertar previamente los perfiles corporativos y sus alcances en `profiles` y `profile_scopes`. El primer administrador debe existir también en Supabase Authentication con el mismo correo; no existe autoelevación.
3. Configurar `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CSRF_SECRET` y `SYNC_WORKER_SECRET` sólo en el entorno servidor. En Vercel, configurar `CRON_SECRET` con el mismo valor del worker.
4. Mantener Google Sheets como fuente de estructura. Los registros se guardan atómicamente en Postgres y entran a `sheet_sync_queue`; `/api/sync` los proyecta al consolidado con ID estable en la columna J.

Roles: `admin` tiene alcance total; `regional` sólo sus regionales; `gerencia` sólo sus gerencias; `consulta` puede leer pero no mutar. Las comprobaciones existen en API, RPC y RLS. La sesión dura ocho horas y la interfaz cierra sesión después de treinta minutos sin actividad.

La cola reintenta con backoff exponencial desde 10 segundos hasta un máximo efectivo de 640 segundos y mueve el trabajo a `dead` tras ocho intentos. Los logs contienen IDs técnicos, rol y conteos, no nombres, cédulas ni correos.

### Prueba concurrente

`npm run load:test` envía 20 solicitudes simultáneas contra un entorno aislado. Requiere `LOAD_TEST_URL`, `LOAD_TEST_CSRF` y `LOAD_TEST_COOKIE`; nunca guardar esos valores. La prueba unitaria paralela corre siempre con `npm test`. El ensayo HTTP debe ejecutarse únicamente con gerencias de prueba y limpiarse mediante un procedimiento aprobado.

El procedimiento de reversión está en `supabase/ROLLBACK.md`.

## Reportes, consolidado y sincronización

El consolidado agrupa y pagina en PostgreSQL mediante `get_consolidated_page`; nunca carga el histórico completo en el servidor web. Permite filtros dependientes, rango de fechas, búsqueda y exportación XLSX. Cuando sólo se selecciona Regional, excluye gerencias ELITE y RE.

Las fórmulas del dashboard y la línea base verificada se encuentran en `docs/KPI_FORMULAS.md`. `npm run verify:source-kpis` vuelve a calcular la comparación desde los Excel originales.

El worker `/api/sync` reclama hasta 100 trabajos con `SKIP LOCKED`, consulta los registros en un lote, actualiza Sheets con `batchUpdate` y agrega filas nuevas con una sola operación append. La columna J conserva el UUID transaccional para idempotencia. La pantalla `/admin/sync` sólo está disponible para administradores.

`npm run reconcile:dry-run` compara UUID y valor reportado entre Postgres y Sheets sin escribir ni borrar datos. `Registro Diario` nunca se limpia; Postgres conserva el histórico y Sheets actúa como proyección reversible.

Para una fase de producción con auditoría fuerte e idempotencia distribuida, se recomienda que una base transaccional (Postgres/Supabase) sea el sistema de registro y que Google Sheets sea una proyección sincronizada. Google Sheets por sí solo funciona para la concurrencia prevista, pero no ofrece transacciones ni restricciones únicas.
