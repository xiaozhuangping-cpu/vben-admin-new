begin;

create or replace function public.set_mdm_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_at is null then
      new.created_at := now();
    end if;
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create table if not exists public.mdm_dicts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  sort_no integer not null default 0,
  status boolean not null default true,
  system_flag boolean not null default false,
  remark text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_dicts_code_key unique (code)
);

create table if not exists public.mdm_dict_items (
  id uuid primary key default gen_random_uuid(),
  dict_id uuid not null references public.mdm_dicts(id) on delete cascade,
  name text not null,
  code text not null,
  value text not null,
  sort_no integer not null default 0,
  status boolean not null default true,
  remark text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_dict_items_dict_code_key unique (dict_id, code),
  constraint mdm_dict_items_dict_value_key unique (dict_id, value)
);

create table if not exists public.mdm_validation_rules (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references public.mdm_themes(id) on delete set null,
  name text not null,
  code text not null,
  rule_type text not null,
  expression text,
  error_message text,
  sort_no integer not null default 0,
  status boolean not null default true,
  remark text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_validation_rules_code_key unique (code),
  constraint mdm_validation_rules_rule_type_check check (
    rule_type = any (array['regex', 'unique', 'range', 'length', 'expression'])
  )
);

create table if not exists public.mdm_model_display_groups (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.mdm_model_definitions(id) on delete cascade,
  name text not null,
  sort_no integer not null default 0,
  status boolean not null default true,
  remark text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_model_display_groups_definition_name_key unique (definition_id, name)
);

create table if not exists public.mdm_model_display_group_fields (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.mdm_model_display_groups(id) on delete cascade,
  field_id uuid not null references public.mdm_model_fields(id) on delete cascade,
  sort_no integer not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_model_display_group_fields_field_id_key unique (field_id)
);

alter table public.mdm_model_definitions
  add column if not exists model_type text,
  add column if not exists sort_no integer not null default 0,
  add column if not exists enabled boolean not null default true,
  add column if not exists need_audit boolean not null default false,
  add column if not exists audit_group_id uuid,
  add column if not exists group_id uuid,
  add column if not exists remark text,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_by uuid default auth.uid();

update public.mdm_model_definitions d
set model_type = coalesce(d.model_type, 'normal'),
    remark = coalesce(d.remark, d.description),
    audit_group_id = coalesce(d.audit_group_id, t.user_group_id),
    group_id = coalesce(d.group_id, t.user_group_id),
    updated_by = coalesce(d.updated_by, auth.uid())
from public.mdm_themes t
where d.theme_id = t.id;

update public.mdm_model_definitions
set model_type = coalesce(model_type, 'normal'),
    updated_by = coalesce(updated_by, auth.uid())
where model_type is null or updated_by is null;

alter table public.mdm_model_definitions
  alter column model_type set default 'normal',
  alter column model_type set not null;

alter table public.mdm_model_definitions
  drop constraint if exists mdm_model_definitions_status_check;

alter table public.mdm_model_definitions
  add constraint mdm_model_definitions_status_check
  check (status = any (array['draft', 'published', 'history', 'revised']));

alter table public.mdm_model_definitions
  drop constraint if exists mdm_model_definitions_audit_group_id_fkey;

alter table public.mdm_model_definitions
  add constraint mdm_model_definitions_audit_group_id_fkey
  foreign key (audit_group_id) references public.mdm_user_groups(id) on delete set null;

alter table public.mdm_model_definitions
  drop constraint if exists mdm_model_definitions_group_id_fkey;

alter table public.mdm_model_definitions
  add constraint mdm_model_definitions_group_id_fkey
  foreign key (group_id) references public.mdm_user_groups(id) on delete set null;

create index if not exists idx_mdm_model_definitions_model_type on public.mdm_model_definitions(model_type);
create index if not exists idx_mdm_model_definitions_enabled on public.mdm_model_definitions(enabled);
create index if not exists idx_mdm_model_definitions_audit_group_id on public.mdm_model_definitions(audit_group_id);
create index if not exists idx_mdm_model_definitions_group_id on public.mdm_model_definitions(group_id);

alter table public.mdm_model_fields
  add column if not exists is_multiple boolean not null default false,
  add column if not exists validation_rule_id uuid;

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_validation_rule_id_fkey;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_validation_rule_id_fkey
  foreign key (validation_rule_id) references public.mdm_validation_rules(id) on delete set null;

create index if not exists idx_mdm_model_fields_validation_rule_id on public.mdm_model_fields(validation_rule_id);

insert into public.mdm_dicts (name, code, sort_no, status, system_flag, remark)
values ('模型类型', 'mdm_model_type', 0, true, true, '数据模型类型字典')
on conflict (code) do update
set name = excluded.name,
    status = excluded.status,
    system_flag = excluded.system_flag,
    remark = excluded.remark,
    updated_at = now();

insert into public.mdm_dict_items (dict_id, name, code, value, sort_no, status, remark)
select d.id, v.name, v.code, v.value, v.sort_no, true, v.remark
from public.mdm_dicts d
cross join (
  values
    ('普通模型', 'normal', 'normal', 0, '标准单体模型'),
    ('组合模型', 'composite', 'composite', 1, '由多个子模型或结构组合而成')
) as v(name, code, value, sort_no, remark)
where d.code = 'mdm_model_type'
on conflict (dict_id, code) do update
set name = excluded.name,
    value = excluded.value,
    sort_no = excluded.sort_no,
    status = excluded.status,
    remark = excluded.remark,
    updated_at = now();

alter table public.mdm_dicts enable row level security;
alter table public.mdm_dict_items enable row level security;
alter table public.mdm_validation_rules enable row level security;
alter table public.mdm_model_display_groups enable row level security;
alter table public.mdm_model_display_group_fields enable row level security;

drop policy if exists authenticated_crud_mdm_dicts on public.mdm_dicts;
create policy authenticated_crud_mdm_dicts on public.mdm_dicts
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists authenticated_crud_mdm_dict_items on public.mdm_dict_items;
create policy authenticated_crud_mdm_dict_items on public.mdm_dict_items
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists authenticated_crud_mdm_validation_rules on public.mdm_validation_rules;
create policy authenticated_crud_mdm_validation_rules on public.mdm_validation_rules
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists authenticated_crud_mdm_model_display_groups on public.mdm_model_display_groups;
create policy authenticated_crud_mdm_model_display_groups on public.mdm_model_display_groups
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists authenticated_crud_mdm_model_display_group_fields on public.mdm_model_display_group_fields;
create policy authenticated_crud_mdm_model_display_group_fields on public.mdm_model_display_group_fields
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop trigger if exists trg_mdm_model_definitions_audit_fields on public.mdm_model_definitions;
create trigger trg_mdm_model_definitions_audit_fields
before insert or update on public.mdm_model_definitions
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_dicts_audit_fields on public.mdm_dicts;
create trigger trg_mdm_dicts_audit_fields
before insert or update on public.mdm_dicts
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_dict_items_audit_fields on public.mdm_dict_items;
create trigger trg_mdm_dict_items_audit_fields
before insert or update on public.mdm_dict_items
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_validation_rules_audit_fields on public.mdm_validation_rules;
create trigger trg_mdm_validation_rules_audit_fields
before insert or update on public.mdm_validation_rules
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_model_display_groups_audit_fields on public.mdm_model_display_groups;
create trigger trg_mdm_model_display_groups_audit_fields
before insert or update on public.mdm_model_display_groups
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_model_display_group_fields_audit_fields on public.mdm_model_display_group_fields;
create trigger trg_mdm_model_display_group_fields_audit_fields
before insert or update on public.mdm_model_display_group_fields
for each row execute function public.set_mdm_audit_fields();

create or replace function public.publish_model_definition(p_definition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_definition public.mdm_model_definitions%rowtype;
  v_fields jsonb := '[]'::jsonb;
  v_field record;
  v_table_name text;
  v_sanitized_code text;
  v_column_name text;
  v_sql text;
  v_type_sql text;
  v_default_sql text;
  v_executed_sql text[] := '{}';
  v_existing_column record;
  v_should_exist boolean;
  v_unique_index_name text;
  v_root_id uuid;
begin
  select *
  into v_definition
  from public.mdm_model_definitions
  where id = p_definition_id;

  if not found then
    raise exception '数据模型不存在';
  end if;

  if v_definition.status not in ('draft', 'revised') then
    raise exception '只有草稿或修订状态模型才能发布';
  end if;

  select jsonb_agg(to_jsonb(f) order by f.sort asc, f.created_at asc)
  into v_fields
  from public.mdm_model_fields f
  where f.definition_id = p_definition_id;

  if v_fields is null or jsonb_array_length(v_fields) = 0 then
    raise exception '请先配置模型字段后再发布';
  end if;

  v_sanitized_code := regexp_replace(lower(v_definition.code), '[^a-z0-9_]+', '_', 'g');
  if v_sanitized_code ~ '^[0-9]' then
    v_sanitized_code := format('m_%s', v_sanitized_code);
  end if;
  v_table_name := format('mdm_data_%s', v_sanitized_code);
  v_root_id := coalesce(v_definition.root_definition_id, v_definition.id);

  v_sql := format(
    'create table if not exists public.%I (id uuid not null default gen_random_uuid() primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now())',
    v_table_name
  );
  execute v_sql;
  v_executed_sql := array_append(v_executed_sql, v_sql);

  for v_field in
    select *
    from public.mdm_model_fields
    where definition_id = p_definition_id and status = true
    order by sort asc, created_at asc
  loop
    v_column_name := regexp_replace(lower(v_field.code), '[^a-z0-9_]+', '_', 'g');
    if v_column_name ~ '^[0-9]' then
      v_column_name := format('f_%s', v_column_name);
    end if;

    v_type_sql := case v_field.data_type
      when 'varchar' then format('varchar(%s)', coalesce(nullif(v_field.length, 0), 255))
      when 'numeric' then format('numeric(%s,%s)', coalesce(nullif(v_field.length, 0), 18), coalesce(v_field.precision, 2))
      when 'int4' then 'integer'
      when 'boolean' then 'boolean'
      when 'date' then 'date'
      when 'timestamptz' then 'timestamp with time zone'
      when 'attachment' then 'jsonb'
      when 'dict' then 'varchar(255)'
      when 'relation_master' then 'uuid'
      else 'text'
    end;

    select c.column_name, c.is_nullable, c.data_type, c.udt_name
    into v_existing_column
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_table_name
      and c.column_name = v_column_name;

    if not found then
      v_sql := format(
        'alter table public.%I add column %I %s',
        v_table_name,
        v_column_name,
        v_type_sql
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    else
      v_sql := format(
        'alter table public.%I alter column %I type %s using %I::%s',
        v_table_name,
        v_column_name,
        v_type_sql,
        v_column_name,
        v_type_sql
      );
      begin
        execute v_sql;
        v_executed_sql := array_append(v_executed_sql, v_sql);
      exception
        when others then
          null;
      end;
    end if;

    if v_field.default_value is not null and btrim(v_field.default_value) <> '' then
      v_default_sql := case
        when v_field.data_type in ('int4', 'numeric', 'boolean') then v_field.default_value
        else quote_literal(v_field.default_value)
      end;
      v_sql := format(
        'alter table public.%I alter column %I set default %s',
        v_table_name,
        v_column_name,
        v_default_sql
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    else
      v_sql := format(
        'alter table public.%I alter column %I drop default',
        v_table_name,
        v_column_name
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    end if;

    v_sql := format(
      'alter table public.%I alter column %I %s not null',
      v_table_name,
      v_column_name,
      case when v_field.is_required or v_field.is_primary then 'set' else 'drop' end
    );
    execute v_sql;
    v_executed_sql := array_append(v_executed_sql, v_sql);

    v_unique_index_name := format('uk_%s_%s', v_table_name, v_column_name);
    execute format('drop index if exists public.%I', v_unique_index_name);

    if v_field.is_unique or v_field.is_primary then
      v_sql := format(
        'create unique index %I on public.%I (%I)',
        v_unique_index_name,
        v_table_name,
        v_column_name
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    end if;
  end loop;

  for v_existing_column in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_table_name
      and c.column_name not in ('id', 'created_at', 'updated_at')
  loop
    select exists (
      select 1
      from public.mdm_model_fields f
      where f.definition_id = p_definition_id
        and f.status = true
        and regexp_replace(lower(f.code), '[^a-z0-9_]+', '_', 'g') = regexp_replace(v_existing_column.column_name, '^f_', '')
    ) into v_should_exist;

    if not v_should_exist then
      execute format(
        'drop index if exists public.%I',
        format('uk_%s_%s', v_table_name, v_existing_column.column_name)
      );

      v_sql := format(
        'alter table public.%I drop column if exists %I',
        v_table_name,
        v_existing_column.column_name
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    end if;
  end loop;

  execute format(
    'drop trigger if exists set_%I_updated_at on public.%I',
    v_table_name,
    v_table_name
  );

  execute format(
    'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_current_timestamp_updated_at()',
    v_table_name,
    v_table_name
  );
  v_executed_sql := array_append(
    v_executed_sql,
    format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_current_timestamp_updated_at()',
      v_table_name,
      v_table_name
    )
  );

  v_sql := format('alter table public.%I enable row level security', v_table_name);
  execute v_sql;
  v_executed_sql := array_append(v_executed_sql, v_sql);

  v_sql := format(
    'grant select, insert, update, delete on table public.%I to authenticated',
    v_table_name
  );
  execute v_sql;
  v_executed_sql := array_append(v_executed_sql, v_sql);

  v_sql := format(
    'drop policy if exists %I on public.%I',
    format('authenticated_crud_%s', v_table_name),
    v_table_name
  );
  execute v_sql;
  v_executed_sql := array_append(v_executed_sql, v_sql);

  v_sql := format(
    'create policy %I on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
    format('authenticated_crud_%s', v_table_name),
    v_table_name
  );
  execute v_sql;
  v_executed_sql := array_append(v_executed_sql, v_sql);

  update public.mdm_model_definitions
  set status = 'history',
      updated_at = now()
  where id <> p_definition_id
    and status = 'published'
    and coalesce(root_definition_id, id) = v_root_id;

  insert into public.mdm_model_versions (
    definition_id,
    version_no,
    version_label,
    status,
    action_type,
    table_name,
    definition_snapshot,
    field_snapshot
  )
  values (
    v_definition.id,
    v_definition.version_no,
    format('v%s.0', v_definition.version_no),
    'published',
    case when v_definition.status = 'revised' then 'republish' else 'publish' end,
    v_table_name,
    to_jsonb(v_definition),
    v_fields
  );

  insert into public.mdm_model_migrations (
    definition_id,
    version_no,
    table_name,
    executed_sql,
    status
  )
  values (
    v_definition.id,
    v_definition.version_no,
    v_table_name,
    v_executed_sql,
    'success'
  );

  update public.mdm_model_definitions
  set status = 'published',
      table_name = v_table_name,
      updated_at = now()
  where id = p_definition_id;

  return jsonb_build_object(
    'definition_id', p_definition_id,
    'status', 'published',
    'table_name', v_table_name
  );
end;
$$;

create or replace function public.unpublish_model_definition(p_definition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.mdm_model_definitions
  set status = 'history',
      enabled = false,
      updated_at = now()
  where id = p_definition_id
    and status = 'published';

  if not found then
    raise exception '只有已发布状态模型才能归档';
  end if;

  return jsonb_build_object(
    'definition_id', p_definition_id,
    'status', 'history'
  );
end;
$$;

create or replace function public.upgrade_model_definition(p_definition_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_source public.mdm_model_definitions%rowtype;
  v_new_id uuid;
  v_root_id uuid;
begin
  select *
  into v_source
  from public.mdm_model_definitions
  where id = p_definition_id;

  if not found then
    raise exception '数据模型不存在';
  end if;

  if v_source.status <> 'published' then
    raise exception '只有已发布模型才能修订';
  end if;

  v_root_id := coalesce(v_source.root_definition_id, v_source.id);

  insert into public.mdm_model_definitions (
    root_definition_id,
    source_definition_id,
    theme_id,
    name,
    code,
    model_type,
    status,
    version_no,
    sort_no,
    table_name,
    enabled,
    need_audit,
    audit_group_id,
    group_id,
    description,
    remark
  )
  values (
    v_root_id,
    v_source.id,
    v_source.theme_id,
    v_source.name,
    v_source.code,
    v_source.model_type,
    'revised',
    v_source.version_no + 1,
    v_source.sort_no,
    v_source.table_name,
    v_source.enabled,
    v_source.need_audit,
    v_source.audit_group_id,
    v_source.group_id,
    v_source.description,
    v_source.remark
  )
  returning id into v_new_id;

  insert into public.mdm_model_fields (
    definition_id,
    name,
    code,
    data_type,
    length,
    precision,
    is_required,
    is_primary,
    is_unique,
    default_value,
    sort,
    status,
    remarks,
    is_multiple,
    validation_rule_id
  )
  select
    v_new_id,
    name,
    code,
    data_type,
    length,
    precision,
    is_required,
    is_primary,
    is_unique,
    default_value,
    sort,
    status,
    remarks,
    is_multiple,
    validation_rule_id
  from public.mdm_model_fields
  where definition_id = p_definition_id
  order by sort asc, created_at asc;

  return v_new_id;
end;
$$;

commit;
