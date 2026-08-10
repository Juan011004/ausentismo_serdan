# Despliegue de producción

## Google Cloud

- Google Sheets API habilitada en el proyecto correcto.
- Cuenta de servicio activa y ambos Sheets compartidos como Editor.
- JSON privado fuera del repositorio; en Vercel solo email y `GOOGLE_PRIVATE_KEY` con `\\n`.
- Verificar IDs y pestañas `Estructura Nacional`, `Registro Diario` y `Consolidado`.
- Aplicar alertas de errores/cuota de Google Sheets API.

## Supabase

- Aplicar las migraciones 001, 002 y 003 en orden.
- Confirmar RLS habilitado y RPC sin permisos para `anon`/`authenticated`.
- Crear identidad Auth y perfil `admin` activo con el mismo correo.
- Configurar backups y PITR según el plan contratado; realizar una restauración ensayada.
- Alertas: errores de Auth, uso de base, conexiones, almacenamiento y cola `dead`.
- Rotar cualquier `service_role` compartida fuera del gestor de secretos.

## Vercel

- Vincular proyecto (`.vercel/project.json`) y confirmar plan compatible con cron cada cinco minutos.
- Región `gru1`; framework Next.js; cron `/api/sync`.
- Cargar para Production/Preview: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CSRF_SECRET`, `SYNC_WORKER_SECRET`, `CRON_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, ambos spreadsheet IDs y nombres de pestañas.
- `CRON_SECRET` debe ser idéntico a `SYNC_WORKER_SECRET`; `CSRF_SECRET` debe ser diferente.
- Dominio HTTPS, DNS, protección de previews y logs/alertas configurados.
- No se requiere callback OAuth: el sistema usa Supabase email/contraseña.

## Secuencia

1. `pnpm preflight:production`.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
3. Obtener autorización escrita para desplegar.
4. Desplegar, anotar URL, commit y tag inmutable.
5. `pnpm smoke -- https://URL` y luego con `SMOKE_EMAIL`/`SMOKE_PASSWORD` de piloto.
6. Probar manualmente un lote idempotente aislado dos veces, consolidado, dashboard, cola y logs.

## Rollback

- Activar `MAINTENANCE_MODE=true` cuando esté conectado a las rutas de mutación o bloquear escrituras en Vercel/WAF.
- Promover el deployment anterior de Vercel.
- No borrar registros; conservar cola, historial y lotes.
- Reconciliar y reanudar el Apps Script solo con aprobación.
- El rollback de base está detallado en `supabase/ROLLBACK.md`.
