begin;

alter table public.daily_records
  drop constraint if exists daily_records_operational_date_gerencia_source_position_key;

create unique index if not exists daily_records_normal_source_position_unique
  on public.daily_records (operational_date, gerencia, source_position)
  where not (gerencia ~* '(ELITE|SHARE|HSE)' or gerencia ~* '^RE[[:space:]]');

comment on index public.daily_records_normal_source_position_unique is
  'Una posición fuente por fecha/gerencia normal. ELITE/RE/SHARE/HSE se controlan por collaborator_key porque varias personas pueden compartir posición genérica.';

commit;
