# Rollback del modelo transaccional

1. Deshabilitar temporalmente escrituras en Vercel (`MAINTENANCE_MODE=true`).
2. Esperar que `sheet_sync_queue` no tenga trabajos `processing`; exportar `daily_records`, `record_history`, `idempotency_batches` y la cola.
3. Reconciliar los lotes `committed` con Google Sheets usando `batch_id` y `record_id` antes de volver al flujo anterior.
4. Revertir la aplicación a la versión previa. No borrar tablas durante el rollback operativo.
5. Si se requiere rollback físico, ejecutar en una ventana aprobada: eliminar políticas/funciones, luego tablas en orden inverso y finalmente los tipos. Conservar antes un backup PITR.

La migración es aditiva. El rollback recomendado es de aplicación, no destructivo, para preservar auditoría e idempotencia.
