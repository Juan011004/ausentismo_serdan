begin;

create extension if not exists pgcrypto;
create type public.app_role as enum ('admin', 'regional', 'gerencia', 'consulta');
create type public.sync_status as enum ('pending', 'processing', 'synced', 'failed', 'dead');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email like '%@serdan.com.co'),
  role public.app_role not null default 'consulta',
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profile_scopes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  regional text not null default '', gerencia text not null default '',
  primary key (profile_id, regional, gerencia), check (regional <> '' or gerencia <> '')
);
create table public.idempotency_batches (
  id uuid primary key, profile_id uuid not null references public.profiles(id),
  payload_hash text not null, status text not null check (status in ('processing','committed','failed')),
  record_count integer not null default 0, error_code text, created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.daily_records (
  id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.idempotency_batches(id),
  operational_date date not null, regional text not null, gerencia text not null,
  collaborator_key text not null, cedula text not null default '', nombre text not null,
  cargo text not null default '', source_position text not null, covered_position text,
  fecha_ingreso date, reported_value text not null, is_vacancy boolean not null default false,
  created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
  unique (operational_date, gerencia, source_position),
  unique (operational_date, gerencia, covered_position),
  unique (operational_date, gerencia, collaborator_key)
);
create table public.record_history (
  id bigint generated always as identity primary key, record_id uuid not null references public.daily_records(id),
  action text not null check (action in ('insert','update','delete')), before_data jsonb, after_data jsonb,
  actor_id uuid references public.profiles(id), reason text, changed_at timestamptz not null default now()
);
create table public.sheet_sync_queue (
  id bigint generated always as identity primary key, batch_id uuid not null references public.idempotency_batches(id),
  record_id uuid not null references public.daily_records(id), status public.sync_status not null default 'pending',
  attempts integer not null default 0, available_at timestamptz not null default now(), locked_at timestamptz,
  last_error text, synced_at timestamptz, unique(record_id)
);
create index sync_ready_idx on public.sheet_sync_queue(status, available_at);
create table public.rate_limits (key text primary key, window_start timestamptz not null, hits integer not null);

create or replace function public.current_profile_id() returns uuid language sql stable security definer set search_path=public
as $$ select id from profiles where email=lower(coalesce(auth.jwt()->>'email','')) and active $$;
create or replace function public.can_access(p_regional text, p_gerencia text, p_write boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles p where p.id=current_profile_id() and p.active and
  (p.role='admin' or (not p_write and p.role='consulta') or
   (p.role='regional' and exists(select 1 from profile_scopes s where s.profile_id=p.id and s.regional=p_regional)) or
   (p.role='gerencia' and exists(select 1 from profile_scopes s where s.profile_id=p.id and s.gerencia=p_gerencia))))
$$;

create or replace function public.save_attendance_batch(p_request_id uuid, p_email text, p_payload_hash text, p_records jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile profiles; v_existing idempotency_batches; v_count integer; r jsonb; v_id uuid;
begin
 select * into v_profile from profiles where email=lower(p_email) and active for update;
 if not found or v_profile.role='consulta' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into v_existing from idempotency_batches where id=p_request_id;
 if found then
   if v_existing.payload_hash<>p_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
   if v_existing.status='committed' then return jsonb_build_object('ok',true,'replayed',true,'count',v_existing.record_count); end if;
   raise exception 'BATCH_IN_PROGRESS' using errcode='40001';
 end if;
 insert into idempotency_batches(id,profile_id,payload_hash,status) values(p_request_id,v_profile.id,p_payload_hash,'processing');
 for r in select * from jsonb_array_elements(p_records) loop
   if not (v_profile.role='admin' or exists(select 1 from profile_scopes s where s.profile_id=v_profile.id and
      ((v_profile.role='regional' and s.regional=r->>'regional') or (v_profile.role='gerencia' and s.gerencia=r->>'gerencia'))))
   then raise exception 'SCOPE_FORBIDDEN' using errcode='42501'; end if;
   insert into daily_records(batch_id,operational_date,regional,gerencia,collaborator_key,cedula,nombre,cargo,source_position,covered_position,fecha_ingreso,reported_value,is_vacancy,created_by,updated_by)
   values(p_request_id,(r->>'fechaRegistro')::date,r->>'regional',r->>'gerencia',coalesce(nullif(r->>'cedula',''),r->>'sector'),coalesce(r->>'cedula',''),r->>'nombre',coalesce(r->>'cargo',''),r->>'sector',
     case when upper(r->>'valorReportado') ~ '^(COM|MKP|NEG|COO|C00)' then r->>'valorReportado' else null end,
     nullif(r->>'fechaIngreso','-')::date,r->>'valorReportado',upper(r->>'valorReportado')='VACANTE',v_profile.id,v_profile.id)
   returning id into v_id;
   insert into sheet_sync_queue(batch_id,record_id) values(p_request_id,v_id);
 end loop;
 v_count:=jsonb_array_length(p_records);
 update idempotency_batches set status='committed',record_count=v_count,completed_at=now() where id=p_request_id;
 return jsonb_build_object('ok',true,'replayed',false,'count',v_count);
end $$;

create or replace function public.audit_record() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into record_history(record_id,action,before_data,after_data,actor_id)
 values(coalesce(new.id,old.id),lower(tg_op),case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end,coalesce(new.updated_by,old.updated_by)); return coalesce(new,old); end $$;
create trigger daily_records_audit after insert or update or delete on public.daily_records for each row execute function public.audit_record();

create or replace function public.update_attendance_record(p_id uuid,p_version int,p_email text,p_value text,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_profile profiles; v_record daily_records; begin
 select * into v_profile from profiles where email=lower(p_email) and active;
 select * into v_record from daily_records where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if v_profile.role='consulta' or not (v_profile.role='admin' or exists(select 1 from profile_scopes s where s.profile_id=v_profile.id and ((v_profile.role='regional' and s.regional=v_record.regional) or (v_profile.role='gerencia' and s.gerencia=v_record.gerencia)))) then raise exception 'SCOPE_FORBIDDEN' using errcode='42501'; end if;
 if v_record.version<>p_version then raise exception 'CONFLICT' using errcode='40001'; end if;
 update daily_records set reported_value=p_value,
 covered_position=case when upper(p_value) ~ '^(COM|MKP|NEG|COO|C00)' then p_value else null end,
 is_vacancy=upper(p_value)='VACANTE',updated_by=v_profile.id,updated_at=now(),version=version+1 where id=p_id;
 update record_history set reason=p_reason where id=(select max(id) from record_history where record_id=p_id);
 update sheet_sync_queue set status='pending',attempts=0,available_at=now(),last_error=null where record_id=p_id;
 return jsonb_build_object('ok',true,'version',p_version+1);
end $$;

create or replace function public.take_sync_jobs(p_limit int default 100) returns setof public.sheet_sync_queue
language sql security definer set search_path=public as $$
 update sheet_sync_queue q set status='processing',locked_at=now(),attempts=attempts+1
 where id in (select id from sheet_sync_queue where status in ('pending','failed') and available_at<=now() order by id for update skip locked limit p_limit)
 returning q.* $$;
create or replace function public.finish_sync_job(p_id bigint,p_ok boolean,p_error text default null) returns void
language sql security definer set search_path=public as $$
 update sheet_sync_queue set status=case when p_ok then 'synced'::sync_status when attempts>=8 then 'dead'::sync_status else 'failed'::sync_status end,
 synced_at=case when p_ok then now() end,last_error=case when p_ok then null else left(p_error,500) end,
 available_at=case when p_ok then available_at else now()+(interval '5 seconds'*power(2,least(attempts,7))) end where id=p_id $$;
create or replace function public.consume_rate_limit(p_key text,p_limit int,p_window_seconds int) returns boolean
language plpgsql security definer set search_path=public as $$ declare v rate_limits; begin
 insert into rate_limits(key,window_start,hits) values(p_key,now(),1) on conflict(key) do update set
 window_start=case when rate_limits.window_start<now()-make_interval(secs=>p_window_seconds) then now() else rate_limits.window_start end,
 hits=case when rate_limits.window_start<now()-make_interval(secs=>p_window_seconds) then 1 else rate_limits.hits+1 end returning * into v;
 return v.hits<=p_limit; end $$;

alter table profiles enable row level security; alter table profile_scopes enable row level security;
alter table daily_records enable row level security; alter table record_history enable row level security;
alter table idempotency_batches enable row level security; alter table sheet_sync_queue enable row level security;
create policy profile_self on profiles for select using(id=current_profile_id());
create policy scopes_self on profile_scopes for select using(profile_id=current_profile_id());
create policy records_scoped_select on daily_records for select using(can_access(regional,gerencia,false));
create policy records_scoped_write on daily_records for all using(can_access(regional,gerencia,true)) with check(can_access(regional,gerencia,true));
create policy history_scoped on record_history for select using(exists(select 1 from daily_records r where r.id=record_id and can_access(r.regional,r.gerencia,false)));
revoke all on function save_attendance_batch(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function update_attendance_record(uuid,int,text,text,text) from public,anon,authenticated;
revoke all on function take_sync_jobs(int) from public,anon,authenticated;
revoke all on function finish_sync_job(bigint,boolean,text) from public,anon,authenticated;
revoke all on function consume_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function save_attendance_batch(uuid,text,text,jsonb) to service_role;
grant execute on function update_attendance_record(uuid,int,text,text,text) to service_role;
grant execute on function take_sync_jobs(int) to service_role;
grant execute on function finish_sync_job(bigint,boolean,text) to service_role;
grant execute on function consume_rate_limit(text,int,int) to service_role;
commit;
