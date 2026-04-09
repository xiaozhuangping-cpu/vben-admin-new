-- MDM 附件字段支持（Supabase 纯 URL 方案）
-- 用法：直接执行本文件
-- 说明：
-- 1. 模型字段 data_type 新增 attachment
-- 2. 模型字段新增 is_multiple，支持单附件/多附件
-- 3. 动态业务表发布时 attachment 映射为 jsonb
-- 4. 业务表中直接存 Supabase Storage 文件 URL 数组

alter table public.mdm_model_fields
  add column if not exists is_multiple boolean not null default false;

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_data_type_check;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_data_type_check
  check (data_type in ('text', 'varchar', 'int4', 'numeric', 'boolean', 'date', 'timestamptz', 'attachment'));

create or replace function public.publish_model_definition(p_definition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_definition public.mdm_model_definitions%rowtype;
  v_fields jsonb := '[]'::jsonb;
  v_field record;
  v_table_name text;
  v_sanitized_code text;
  v_sql text;
  v_type_sql text;
  v_default_sql text;
  v_executed_sql text[] := '{}';
  v_column_name text;
  v_should_exist boolean;
  v_existing_column record;
  v_unique_index_name text;
begin
  select *
  into v_definition
  from public.mdm_model_definitions
  where id = p_definition_id;

  if not found then
    raise exception '数据模型不存在';
  end if;

  if v_definition.status <> 'draft' then
    raise exception '只有草稿状态模型才能发布';
  end if;

  select jsonb_agg(to_jsonb(f) order by f.sort asc, f.created_at asc)
  into v_fields
  from public.mdm_model_fields f
  where f.definition_id = p_definition_id;

  if v_fields is null or jsonb_array_length(v_fields) = 0 then
    raise exception '请先配置模型字段后再发布';
  end if;

  v_sanitized_code := regexp_replace(lower(v_definition.code), '[^a-z0-9_]+', '_', 'g');
  v_table_name := coalesce(nullif(v_definition.table_name, ''), format('mdm_data_%s', v_sanitized_code));

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
    v_column_name := lower(v_field.code);
    v_type_sql := case v_field.data_type
      when 'varchar' then format('varchar(%s)', coalesce(nullif(v_field.length, 0), 255))
      when 'numeric' then format('numeric(%s,%s)', coalesce(nullif(v_field.length, 0), 18), coalesce(v_field.precision, 2))
      when 'int4' then 'integer'
      when 'boolean' then 'boolean'
      when 'date' then 'date'
      when 'timestamptz' then 'timestamp with time zone'
      when 'attachment' then 'jsonb'
      else 'text'
    end;

    select
      c.column_name,
      c.is_nullable,
      c.data_type,
      c.udt_name
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
        and lower(f.code) = v_existing_column.column_name
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

  execute format('alter table public.%I enable row level security', v_table_name);
  execute format('drop policy if exists "authenticated crud" on public.%I', v_table_name);
  execute format(
    'create policy "authenticated crud" on public.%I for all to authenticated using (true) with check (true)',
    v_table_name
  );

  update public.mdm_model_definitions
  set status = 'published',
      table_name = v_table_name,
      updated_at = now()
  where id = p_definition_id;

  update public.mdm_model_definitions
  set status = 'unpublished',
      updated_at = now()
  where root_definition_id = coalesce(v_definition.root_definition_id, v_definition.id)
    and id <> p_definition_id
    and status = 'published';

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
    p_definition_id,
    v_definition.version_no,
    format('v%s', v_definition.version_no),
    'published',
    'publish',
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
    p_definition_id,
    v_definition.version_no,
    v_table_name,
    v_executed_sql,
    'success'
  );

  return jsonb_build_object(
    'definition_id', p_definition_id,
    'status', 'published',
    'table_name', v_table_name
  );
end;
$$;

grant execute on function public.publish_model_definition(uuid) to authenticated;
