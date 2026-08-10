begin;

-- Índices alineados con las consultas de fecha, alcance, consolidado y auditoría.
create index if not exists daily_records_date_scope_idx
  on public.daily_records (operational_date desc, regional, gerencia);
create index if not exists daily_records_management_date_idx
  on public.daily_records (gerencia, operational_date desc);
create index if not exists daily_records_collaborator_idx
  on public.daily_records (collaborator_key, operational_date desc);
create index if not exists record_history_record_changed_idx
  on public.record_history (record_id, changed_at desc);
create index if not exists idempotency_batches_created_idx
  on public.idempotency_batches (created_at desc);

-- Recupera trabajos cuyo worker murió después de reclamarlos. SKIP LOCKED evita
-- que dos workers procesen la misma fila y permite escalar horizontalmente.
create or replace function public.take_sync_jobs(p_limit int default 100)
returns setof public.sheet_sync_queue
language sql security definer set search_path=public,pg_temp as $$
 update sheet_sync_queue q set status='processing',locked_at=now(),attempts=attempts+1
 where id in (
   select id from sheet_sync_queue
   where (status in ('pending','failed') and available_at<=now())
      or (status='processing' and locked_at<now()-interval '10 minutes')
   order by id for update skip locked limit greatest(1,least(p_limit,500))
 ) returning q.*
$$;

-- Evita crecimiento ilimitado de contadores y lotes fallidos antiguos.
create or replace function public.cleanup_operational_state()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rate int; v_batches int;
begin
 delete from rate_limits where window_start<now()-interval '24 hours';
 get diagnostics v_rate=row_count;
 delete from idempotency_batches b where b.status='failed' and b.created_at<now()-interval '30 days'
   and not exists(select 1 from daily_records r where r.batch_id=b.id);
 get diagnostics v_batches=row_count;
 return jsonb_build_object('rateLimits',v_rate,'failedBatches',v_batches);
end $$;

alter table public.profiles force row level security;
alter table public.profile_scopes force row level security;
alter table public.daily_records force row level security;
alter table public.record_history force row level security;
alter table public.idempotency_batches force row level security;
alter table public.sheet_sync_queue force row level security;
alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;

revoke all on table public.profiles,public.profile_scopes,public.daily_records,
  public.record_history,public.idempotency_batches,public.sheet_sync_queue,
  public.rate_limits from public,anon,authenticated;
grant all on table public.profiles,public.profile_scopes,public.daily_records,
  public.record_history,public.idempotency_batches,public.sheet_sync_queue,
  public.rate_limits to service_role;

alter function public.current_profile_id() set search_path=public,pg_temp;
alter function public.can_access(text,text,boolean) set search_path=public,pg_temp;
alter function public.save_attendance_batch(uuid,text,text,jsonb) set search_path=public,pg_temp;
alter function public.update_attendance_record(uuid,int,text,text,text) set search_path=public,pg_temp;
alter function public.finish_sync_job(bigint,boolean,text) set search_path=public,pg_temp;
alter function public.consume_rate_limit(text,int,int) set search_path=public,pg_temp;

-- Las funciones nuevas no deben ser ejecutables por roles expuestos.
revoke execute on function public.take_sync_jobs(int) from public,anon,authenticated;
revoke execute on function public.cleanup_operational_state() from public,anon,authenticated;
grant execute on function public.take_sync_jobs(int) to service_role;
grant execute on function public.cleanup_operational_state() to service_role;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;

commit;
