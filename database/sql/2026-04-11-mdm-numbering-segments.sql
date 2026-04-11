begin;

create or replace function public.mdm_numbering_pg_format(p_format text)
returns text
language plpgsql
immutable
as $$
begin
  case p_format
    when 'yyyy' then return 'YYYY';
    when 'yyyyMM' then return 'YYYYMM';
    when 'yyyyMMdd' then return 'YYYYMMDD';
    when 'yyyyMMddHH' then return 'YYYYMMDDHH24';
    when 'yyyyMMddHHmm' then return 'YYYYMMDDHH24MI';
    when 'yyyyMMddHHmmss' then return 'YYYYMMDDHH24MISS';
    when 'yyMM' then return 'YYMM';
    when 'yyMMdd' then return 'YYMMDD';
    else
      raise exception '不支持的日期格式: %', p_format;
  end case;
end;
$$;

create or replace function public.mdm_numbering_reset_key(
  p_reset_policy text,
  p_biz_time timestamptz
)
returns text
language plpgsql
immutable
as $$
begin
  case p_reset_policy
    when 'year' then return to_char(p_biz_time, 'YYYY');
    when 'month' then return to_char(p_biz_time, 'YYYYMM');
    when 'day' then return to_char(p_biz_time, 'YYYYMMDD');
    else return null;
  end case;
end;
$$;

create or replace function public.mdm_build_numbering_code(
  p_numbering_type text,
  p_prefix text,
  p_suffix text,
  p_date_format text,
  p_seq_length integer,
  p_seq_value bigint,
  p_biz_time timestamptz
)
returns text
language plpgsql
immutable
as $$
declare
  v_date_part text := '';
  v_seq_part text := '';
begin
  if p_numbering_type in ('date', 'date_sequence') then
    v_date_part := to_char(p_biz_time, public.mdm_numbering_pg_format(p_date_format));
  end if;

  if p_numbering_type in ('sequence', 'date_sequence') then
    v_seq_part := lpad(coalesce(p_seq_value, 0)::text, greatest(coalesce(p_seq_length, 1), 1), '0');
  end if;

  return coalesce(p_prefix, '') || v_date_part || v_seq_part || coalesce(p_suffix, '');
end;
$$;

create table if not exists public.mdm_numbering_segments (
  id uuid primary key default gen_random_uuid(),
  segment_name text not null,
  segment_code text not null,
  numbering_type text not null,
  prefix text not null default '',
  suffix text not null default '',
  date_format text,
  seq_length integer,
  start_value bigint not null default 1,
  step integer not null default 1,
  current_value bigint not null default 0,
  reset_policy text not null default 'none',
  last_reset_key text,
  enabled boolean not null default true,
  remark text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_numbering_segments_code_key unique (segment_code),
  constraint mdm_numbering_segments_type_check
    check (numbering_type = any (array['sequence', 'date', 'date_sequence'])),
  constraint mdm_numbering_segments_date_format_check
    check (
      date_format is null
      or date_format = any (
        array[
          'yyyy',
          'yyyyMM',
          'yyyyMMdd',
          'yyyyMMddHH',
          'yyyyMMddHHmm',
          'yyyyMMddHHmmss',
          'yyMM',
          'yyMMdd'
        ]
      )
    ),
  constraint mdm_numbering_segments_reset_policy_check
    check (reset_policy = any (array['none', 'year', 'month', 'day'])),
  constraint mdm_numbering_segments_prefix_check
    check (prefix ~ '^[A-Za-z0-9_-]*$'),
  constraint mdm_numbering_segments_suffix_check
    check (suffix ~ '^[A-Za-z0-9_-]*$'),
  constraint mdm_numbering_segments_start_value_check
    check (start_value >= 1),
  constraint mdm_numbering_segments_step_check
    check (step >= 1),
  constraint mdm_numbering_segments_seq_length_check
    check (seq_length is null or seq_length >= 1),
  constraint mdm_numbering_segments_type_fields_check
    check (
      (numbering_type = 'sequence' and date_format is null and seq_length is not null)
      or (numbering_type = 'date' and date_format is not null)
      or (numbering_type = 'date_sequence' and date_format is not null and seq_length is not null)
    )
);

create index if not exists idx_mdm_numbering_segments_enabled
  on public.mdm_numbering_segments(enabled);

create index if not exists idx_mdm_numbering_segments_updated_at
  on public.mdm_numbering_segments(updated_at desc);

drop trigger if exists trg_mdm_numbering_segments_audit_fields on public.mdm_numbering_segments;
create trigger trg_mdm_numbering_segments_audit_fields
before insert or update on public.mdm_numbering_segments
for each row execute function public.set_mdm_audit_fields();

alter table public.mdm_numbering_segments enable row level security;

drop policy if exists authenticated_crud_mdm_numbering_segments on public.mdm_numbering_segments;
create policy authenticated_crud_mdm_numbering_segments on public.mdm_numbering_segments
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create or replace function public.preview_numbering_segment(
  p_segment_id uuid,
  p_biz_time timestamptz default now()
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_segment public.mdm_numbering_segments%rowtype;
  v_reset_key text;
  v_preview_value bigint;
  v_code text;
begin
  select *
  into v_segment
  from public.mdm_numbering_segments
  where id = p_segment_id;

  if not found then
    raise exception '码段不存在';
  end if;

  v_reset_key := public.mdm_numbering_reset_key(v_segment.reset_policy, p_biz_time);

  if v_segment.numbering_type = 'date' then
    v_preview_value := null;
  elsif v_segment.reset_policy <> 'none'
    and coalesce(v_segment.last_reset_key, '') <> coalesce(v_reset_key, '') then
    v_preview_value := v_segment.start_value;
  elsif v_segment.current_value < v_segment.start_value then
    v_preview_value := v_segment.start_value;
  else
    v_preview_value := v_segment.current_value + v_segment.step;
  end if;

  v_code := public.mdm_build_numbering_code(
    v_segment.numbering_type,
    v_segment.prefix,
    v_segment.suffix,
    v_segment.date_format,
    v_segment.seq_length,
    v_preview_value,
    p_biz_time
  );

  return jsonb_build_object(
    'code', v_code,
    'currentValue', v_segment.current_value,
    'previewValue', v_preview_value,
    'resetKey', v_reset_key
  );
end;
$$;

create or replace function public.generate_numbering_segment(
  p_segment_id uuid,
  p_biz_time timestamptz default now()
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_segment public.mdm_numbering_segments%rowtype;
  v_reset_key text;
  v_next_value bigint;
  v_code text;
begin
  select *
  into v_segment
  from public.mdm_numbering_segments
  where id = p_segment_id
  for update;

  if not found then
    raise exception '码段不存在';
  end if;

  if not coalesce(v_segment.enabled, false) then
    raise exception '当前码段已禁用，无法生成编码';
  end if;

  v_reset_key := public.mdm_numbering_reset_key(v_segment.reset_policy, p_biz_time);

  if v_segment.numbering_type = 'date' then
    v_next_value := null;
  elsif v_segment.reset_policy <> 'none'
    and coalesce(v_segment.last_reset_key, '') <> coalesce(v_reset_key, '') then
    v_next_value := v_segment.start_value;
  elsif v_segment.current_value < v_segment.start_value then
    v_next_value := v_segment.start_value;
  else
    v_next_value := v_segment.current_value + v_segment.step;
  end if;

  if v_segment.numbering_type <> 'date' then
    update public.mdm_numbering_segments
    set current_value = v_next_value,
        last_reset_key = v_reset_key
    where id = p_segment_id;
  end if;

  v_code := public.mdm_build_numbering_code(
    v_segment.numbering_type,
    v_segment.prefix,
    v_segment.suffix,
    v_segment.date_format,
    v_segment.seq_length,
    v_next_value,
    p_biz_time
  );

  return jsonb_build_object(
    'code', v_code,
    'currentValue', coalesce(v_next_value, v_segment.current_value),
    'resetKey', v_reset_key,
    'segmentId', p_segment_id
  );
end;
$$;

create or replace function public.reset_numbering_segment(p_segment_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_segment public.mdm_numbering_segments%rowtype;
begin
  update public.mdm_numbering_segments
  set current_value = 0,
      last_reset_key = null
  where id = p_segment_id
  returning *
  into v_segment;

  if not found then
    raise exception '码段不存在';
  end if;

  return jsonb_build_object(
    'segmentId', v_segment.id,
    'currentValue', v_segment.current_value
  );
end;
$$;

grant execute on function public.preview_numbering_segment(uuid, timestamptz) to authenticated;
grant execute on function public.generate_numbering_segment(uuid, timestamptz) to authenticated;
grant execute on function public.reset_numbering_segment(uuid) to authenticated;

commit;
