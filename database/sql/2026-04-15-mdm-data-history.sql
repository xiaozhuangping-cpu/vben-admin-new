begin;

create table if not exists public.mdm_data_history_versions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.mdm_model_definitions(id) on delete cascade,
  record_id text not null,
  version_no integer not null,
  effective_at timestamptz not null default now(),
  submitted_by uuid null references public.mdm_users(id),
  submitted_by_name varchar(100) null,
  status varchar(32) not null default 'published',
  snapshot_json text not null,
  created_at timestamptz not null default now()
);

alter table public.mdm_data_history_versions
  alter column record_id type text using record_id::text;

create index if not exists idx_mdm_data_history_versions_definition_record
  on public.mdm_data_history_versions(definition_id, record_id, effective_at desc, version_no desc);

create index if not exists idx_mdm_data_history_versions_record
  on public.mdm_data_history_versions(record_id, effective_at desc);

create unique index if not exists uk_mdm_data_history_versions_record_version
  on public.mdm_data_history_versions(definition_id, record_id, version_no);

comment on table public.mdm_data_history_versions is '主数据历史版本快照';
comment on column public.mdm_data_history_versions.snapshot_json is '主数据完整快照JSON字符串';

drop function if exists public.create_mdm_data_history_snapshot(uuid, uuid, timestamptz);
drop function if exists public.get_mdm_data_history_list(uuid, uuid, integer, integer);

create or replace function public.set_mdm_data_history_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_definition_id uuid;
  v_record_id text := coalesce(new.id::text, '');
  v_effective_at timestamptz := coalesce(new.updated_at, new.created_at, now());
begin
  if v_record_id = '' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.status, '') <> 'published' then
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if coalesce(new.status, '') <> 'published'
       or coalesce(old.status, '') = 'published' then
      return new;
    end if;
  else
    return new;
  end if;

  select id
  into v_definition_id
  from public.mdm_model_definitions
  where table_name = tg_table_name
  order by
    case when status = 'published' then 0 else 1 end,
    updated_at desc nulls last,
    created_at desc nulls last
  limit 1;

  if v_definition_id is null then
    return new;
  end if;

  perform public.create_mdm_data_history_snapshot(
    v_definition_id,
    v_record_id,
    v_effective_at
  );

  return new;
end;
$$;

create or replace function public.apply_mdm_business_history_snapshot_trigger(
  p_table_name text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_trigger_name text;
begin
  if p_table_name is null or btrim(p_table_name) = '' then
    return;
  end if;

  v_trigger_name := format('snapshot_%s_history_version', p_table_name);

  execute format(
    'drop trigger if exists %I on public.%I',
    v_trigger_name,
    p_table_name
  );

  execute format(
    'create trigger %I after insert or update of status on public.%I for each row execute function public.set_mdm_data_history_snapshot()',
    v_trigger_name,
    p_table_name
  );
end;
$$;

create or replace function public.create_mdm_data_history_snapshot(
  p_definition_id uuid,
  p_record_id text,
  p_effective_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_definition public.mdm_model_definitions%rowtype;
  v_snapshot jsonb;
  v_history_id uuid;
  v_version_no integer;
  v_submitted_by uuid := public.current_mdm_user_id();
  v_submitted_by_name text := '';
  v_status text := 'published';
begin
  select *
  into v_definition
  from public.mdm_model_definitions
  where id = p_definition_id
  limit 1;

  if not found or coalesce(v_definition.table_name, '') = '' then
    raise exception '模型不存在或未生成物理表';
  end if;

  execute format(
    'select to_jsonb(t) from public.%I t where t.id::text = $1 limit 1',
    v_definition.table_name
  )
  into v_snapshot
  using p_record_id;

  if v_snapshot is null then
    raise exception '主数据记录不存在';
  end if;

  v_status := coalesce(v_snapshot ->> 'status', 'published');

  select coalesce(max(version_no), 0) + 1
  into v_version_no
  from public.mdm_data_history_versions
  where definition_id = p_definition_id
    and record_id = p_record_id;

  if v_submitted_by is not null then
    select coalesce(nickname, username, auth_email, '')
    into v_submitted_by_name
    from public.mdm_users
    where id = v_submitted_by
    limit 1;
  end if;

  insert into public.mdm_data_history_versions (
    definition_id,
    record_id,
    version_no,
    effective_at,
    submitted_by,
    submitted_by_name,
    status,
    snapshot_json
  )
  values (
    p_definition_id,
    p_record_id,
    v_version_no,
    coalesce(p_effective_at, now()),
    v_submitted_by,
    nullif(v_submitted_by_name, ''),
    v_status,
    v_snapshot::text
  )
  returning id into v_history_id;

  return v_history_id;
end;
$$;

create or replace function public.get_mdm_data_history_list(
  p_definition_id uuid,
  p_record_id text,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
begin
  select count(*)
  into v_total
  from public.mdm_data_history_versions
  where definition_id = p_definition_id
    and record_id = p_record_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'versionNo', version_no,
        'effectiveAt', effective_at,
        'submittedBy', submitted_by,
        'submittedByName', submitted_by_name,
        'status', status,
        'createdAt', created_at
      )
      order by effective_at desc, version_no desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select *
    from public.mdm_data_history_versions
    where definition_id = p_definition_id
      and record_id = p_record_id
    order by effective_at desc, version_no desc
    limit greatest(coalesce(p_page_size, 10), 1)
    offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 10), 1)
  ) t;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'total', coalesce(v_total, 0)
  );
end;
$$;

create or replace function public.get_mdm_data_history_detail(
  p_history_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_item public.mdm_data_history_versions%rowtype;
begin
  select *
  into v_item
  from public.mdm_data_history_versions
  where id = p_history_id
  limit 1;

  if not found then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'id', v_item.id,
    'definitionId', v_item.definition_id,
    'recordId', v_item.record_id,
    'versionNo', v_item.version_no,
    'effectiveAt', v_item.effective_at,
    'submittedBy', v_item.submitted_by,
    'submittedByName', v_item.submitted_by_name,
    'status', v_item.status,
    'createdAt', v_item.created_at,
    'snapshotJson', v_item.snapshot_json,
    'snapshotObject', coalesce(v_item.snapshot_json::jsonb, '{}'::jsonb)
  );
end;
$$;

do $$
declare
  v_table_name text;
begin
  for v_table_name in
    select distinct table_name
    from public.mdm_model_definitions
    where table_name is not null
      and btrim(table_name) <> ''
      and status in ('published', 'history')
  loop
    perform public.apply_mdm_business_history_snapshot_trigger(v_table_name);
  end loop;
end;
$$;

commit;
