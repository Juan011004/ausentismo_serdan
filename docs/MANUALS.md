# Manuales cortos

## Usuario

1. Ingresar con correo y contraseña asignados.
2. Elegir gerencia y fecha; revisar progreso y vacantes automáticas.
3. Completar cada posición una sola vez y confirmar el lote.
4. Si aparece error, reintentar el mismo borrador; el requestId evita duplicados.
5. Reportar diferencias sin editar directamente Sheets.

## Administrador

1. Crear/bloquear cuentas y asignar roles en `/admin/usuarios`.
2. Asignar alcances regional/gerencia en Supabase hasta disponer de UI específica.
3. Revisar `/admin/sync`, cola pendiente, fallida y dead-letter.
4. Ejecutar reconciliación dry-run; exigir motivo para correcciones.
5. Rotar secretos y coordinar backups, alertas, imports y rollback.

## Soporte

1. Registrar hora, usuario, ruta, requestId y código HTTP; evitar cédula/nombre en tickets.
2. Comprobar Vercel, Supabase, Google API y cola sin modificar datos.
3. Reintentar trabajos fallidos desde admin solo tras identificar la causa.
4. Escalar diferencias de datos; no corregir con escrituras directas.
5. Aplicar rollback documentado ante severidad alta y conservar evidencia.
