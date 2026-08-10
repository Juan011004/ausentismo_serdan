begin;

alter table public.sheet_sync_queue add column if not exists created_at timestamptz not null default now();

create or replace function public.get_consolidated_page(
  p_email text,p_regional text default '',p_gerencia text default '',p_from date default null,p_to date default null,
  p_search text default '',p_page int default 1,p_page_size int default 50)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile profiles; v_total bigint; v_rows jsonb; v_dates jsonb;
begin
 select * into v_profile from profiles where email=lower(p_email) and active;
 if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if v_profile.role='regional' and (p_regional='' or not exists(select 1 from profile_scopes s where s.profile_id=v_profile.id and s.regional=p_regional)) then raise exception 'SCOPE_FORBIDDEN' using errcode='42501'; end if;
 if v_profile.role='gerencia' and (p_gerencia='' or not exists(select 1 from profile_scopes s where s.profile_id=v_profile.id and s.gerencia=p_gerencia)) then raise exception 'SCOPE_FORBIDDEN' using errcode='42501'; end if;
 with filtered as (
  select * from daily_records r where (p_regional='' or r.regional=p_regional) and (p_gerencia='' or r.gerencia=p_gerencia)
   and (p_from is null or r.operational_date>=p_from) and (p_to is null or r.operational_date<=p_to)
   and (p_search='' or concat_ws(' ',r.nombre,r.cedula,r.source_position) ilike '%'||p_search||'%')
   and not (p_regional<>'' and p_gerencia='' and (upper(r.gerencia) like '%ELITE%' or upper(r.gerencia) like 'RE %'))
 ), people as (select cedula,nombre,source_position,min(regional) regional,min(gerencia) gerencia,
   jsonb_object_agg(operational_date::text,jsonb_build_object('value',reported_value,'recordId',id,'version',version)) records
   from filtered group by cedula,nombre,source_position)
 select count(*) into v_total from people;
 with filtered as (
  select * from daily_records r where (p_regional='' or r.regional=p_regional) and (p_gerencia='' or r.gerencia=p_gerencia)
   and (p_from is null or r.operational_date>=p_from) and (p_to is null or r.operational_date<=p_to)
   and (p_search='' or concat_ws(' ',r.nombre,r.cedula,r.source_position) ilike '%'||p_search||'%')
   and not (p_regional<>'' and p_gerencia='' and (upper(r.gerencia) like '%ELITE%' or upper(r.gerencia) like 'RE %'))
 ), people as (select cedula,nombre,source_position,min(regional) regional,min(gerencia) gerencia,
   jsonb_object_agg(operational_date::text,jsonb_build_object('value',reported_value,'recordId',id,'version',version)) records
   from filtered group by cedula,nombre,source_position order by nombre,cedula,source_position
   limit greatest(1,least(p_page_size,200)) offset greatest(0,(p_page-1)*p_page_size))
 select coalesce(jsonb_agg(jsonb_build_object('cedula',cedula,'nombre',nombre,'sector',source_position,'regional',regional,'gerencia',gerencia,'records',records)),'[]') into v_rows from people;
 select coalesce(jsonb_agg(d order by d),'[]') into v_dates from (select distinct operational_date::text d from daily_records r where
  (p_regional='' or r.regional=p_regional) and (p_gerencia='' or r.gerencia=p_gerencia) and (p_from is null or r.operational_date>=p_from) and (p_to is null or r.operational_date<=p_to)
  and not (p_regional<>'' and p_gerencia='' and (upper(r.gerencia) like '%ELITE%' or upper(r.gerencia) like 'RE %'))) x;
 return jsonb_build_object('dates',v_dates,'employees',v_rows,'total',v_total,'page',p_page,'pageSize',least(p_page_size,200));
end $$;

create or replace function public.sync_metrics() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('pending',count(*) filter(where status='pending'),'processing',count(*) filter(where status='processing'),
 'failed',count(*) filter(where status='failed'),'dead',count(*) filter(where status='dead'),'synced',count(*) filter(where status='synced'),
 'lastSync',max(synced_at),'oldestPending',min(created_at) filter(where status in ('pending','failed')))
 from sheet_sync_queue $$;
create or replace function public.retry_sync_jobs(p_email text,p_ids bigint[] default null) returns int language plpgsql security definer set search_path=public as $$
declare v_count int; begin if not exists(select 1 from profiles where email=lower(p_email) and active and role='admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 update sheet_sync_queue set status='pending',attempts=0,available_at=now(),last_error=null where status in ('failed','dead') and (p_ids is null or id=any(p_ids));get diagnostics v_count=row_count;return v_count;end $$;
revoke all on function get_consolidated_page(text,text,text,date,date,text,int,int) from public,anon,authenticated;
revoke all on function sync_metrics() from public,anon,authenticated;
revoke all on function retry_sync_jobs(text,bigint[]) from public,anon,authenticated;
grant execute on function get_consolidated_page(text,text,text,date,date,text,int,int) to service_role;
grant execute on function sync_metrics() to service_role;
grant execute on function retry_sync_jobs(text,bigint[]) to service_role;
commit;
