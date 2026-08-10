# Seguridad, concurrencia y conectividad débil

## Modelo de concurrencia

La aplicación no crea hilos residentes: Vercel ejecuta instancias efímeras y escala horizontalmente. La coordinación correcta vive en PostgreSQL mediante transacciones, restricciones únicas, bloqueo de filas, idempotencia y `FOR UPDATE SKIP LOCKED`.

- Cada lote usa un `requestId` UUID y un hash de contenido.
- Un reintento con el mismo contenido devuelve el resultado confirmado sin duplicar.
- Las ediciones usan `version` para detectar conflictos optimistas.
- La cola permite varios workers y recupera trabajos abandonados después de diez minutos.
- Los índices de la migración 004 cubren fecha, regional, gerencia, colaborador, historial y lotes.

## Conectividad débil

- Las lecturas GET tienen timeout, dos reintentos con backoff y jitter, y deduplicación de solicitudes simultáneas.
- La carga inicial usa caché privada con `stale-while-revalidate`.
- Cambiar rápidamente de gerencia cancela la consulta anterior y evita estados fuera de orden.
- El borrador conserva únicamente selecciones asociadas a identificadores HMAC opacos; no usa cédulas como claves locales.
- Guardar un lote admite tres reintentos porque el `requestId` hace la operación idempotente.
- Si no hay red, el borrador permanece local y el usuario reintenta al recuperar señal.

## Controles de seguridad

- Cookies `HttpOnly`, `Secure` en producción y `SameSite=Strict`.
- Límite absoluto de sesión de ocho horas.
- CSRF firmado, validación de `Origin`, Zod y autorización servidor/RPC/RLS.
- Roles y alcances regional/gerencia verificados antes de cada mutación.
- CSP con nonce; `unsafe-eval` se habilita solamente en desarrollo para React Refresh.
- Rate limit distribuido en Postgres y segunda capa recomendada en Vercel WAF.
- Logs técnicos sin nombres, cédulas, contraseñas ni tokens.
- Cuenta de servicio y `service_role` exclusivamente en servidor.

## Operación obligatoria

1. Aplicar `202608100004_resilience_security.sql` en Supabase.
2. Programar `select public.cleanup_operational_state();` una vez al día con Supabase Cron.
3. En Vercel WAF, limitar `/api/auth/login` y `/api/*`; comenzar en modo Log y luego activar 429.
4. Activar alertas de Auth, errores 5xx, latencia p95, cola `dead` y crecimiento de base.
5. Activar backups y PITR acorde con el RTO/RPO aprobado por negocio.
6. Rotar inmediatamente cualquier secreto que alguna vez haya sido pegado en chat, correo o repositorio.

Este endurecimiento se alinea con OWASP ASVS/API Security, pero no constituye por sí solo una certificación. El cumplimiento formal requiere inventario, análisis de riesgos, gestión de proveedores, respuesta a incidentes, pruebas de penetración y evidencia operativa.
