begin;

alter table public.mdm_model_fields
  add column if not exists list_visible boolean not null default false,
  add column if not exists searchable boolean not null default false;

update public.mdm_model_fields
set list_visible = case
  when lower(code) in ('status', 'created_at', 'updated_at') then true
  else coalesce(list_visible, false)
end,
searchable = case
  when lower(code) in ('status', 'created_at', 'updated_at') then true
  else coalesce(searchable, false)
end;

update public.mdm_model_fields
set searchable = false
where data_type in ('attachment', 'relation_master');

update public.mdm_model_fields
set list_visible = false,
    searchable = false
where lower(code) = 'id';

create or replace function public.get_mdm_authorized_records(
  p_definition_id uuid,
  p_page integer default 1,
  p_page_size integer default 10,
  p_filters jsonb default '{}'::jsonb,
  p_order text default 'updated_at.desc,created_at.desc'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_definition public.mdm_model_definitions%rowtype;
  v_config public.mdm_model_data_auth_configs%rowtype;
  v_has_config boolean := false;
  v_is_authorized boolean := true;
  v_items jsonb := '[]'::jsonb;
  v_order_clause text := 'updated_at desc, created_at desc';
  v_order_item text;
  v_total bigint := 0;
  v_where_clause text := 'true';
  v_filter_key text;
  v_filter_column text;
  v_filter_value text;
  v_group_ids uuid[] := public.current_mdm_user_group_ids();
  v_sql text;
begin
  select *
  into v_definition
  from public.mdm_model_definitions
  where id = p_definition_id
  limit 1;

  if not found or coalesce(v_definition.table_name, '') = '' then
    return jsonb_build_object('items', '[]'::jsonb, 'total', 0);
  end if;

  select *
  into v_config
  from public.mdm_model_data_auth_configs
  where definition_id = p_definition_id
    and status = true
  limit 1;

  v_has_config := found;

  if public.current_mdm_is_super_admin() then
    v_is_authorized := true;
  elsif v_has_config and coalesce(array_length(v_config.group_ids, 1), 0) > 0 then
    v_is_authorized := coalesce(v_group_ids && v_config.group_ids, false);
  end if;

  if not v_is_authorized then
    return jsonb_build_object('items', '[]'::jsonb, 'total', 0);
  end if;

  if v_has_config and btrim(coalesce(v_config.row_filter_sql, '')) <> '' then
    v_where_clause := format('(%s)', v_config.row_filter_sql);
  end if;

  for v_filter_key, v_filter_value in
    select key, value
    from jsonb_each_text(coalesce(p_filters, '{}'::jsonb))
  loop
    v_filter_column := regexp_replace(v_filter_key, '__(from|to)$', '');

    if v_filter_column !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
      continue;
    end if;

    if v_filter_value like 'eq.%' then
      v_where_clause := format(
        '%s and %I = %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 4)
      );
    elsif v_filter_value like 'neq.%' then
      v_where_clause := format(
        '%s and %I <> %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 5)
      );
    elsif v_filter_value like 'like.%' then
      v_where_clause := format(
        '%s and %I like %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 6)
      );
    elsif v_filter_value like 'ilike.%' then
      v_where_clause := format(
        '%s and %I ilike %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 7)
      );
    elsif v_filter_value like 'gte.%' then
      v_where_clause := format(
        '%s and %I >= %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 5)
      );
    elsif v_filter_value like 'lte.%' then
      v_where_clause := format(
        '%s and %I <= %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 5)
      );
    elsif v_filter_value like 'gt.%' then
      v_where_clause := format(
        '%s and %I > %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 4)
      );
    elsif v_filter_value like 'lt.%' then
      v_where_clause := format(
        '%s and %I < %L',
        v_where_clause,
        v_filter_column,
        substr(v_filter_value, 4)
      );
    end if;
  end loop;

  v_order_clause := '';
  foreach v_order_item in array string_to_array(coalesce(p_order, ''), ',')
  loop
    v_order_item := btrim(v_order_item);
    if v_order_item ~ '^[a-zA-Z_][a-zA-Z0-9_]*\.(asc|desc)$' then
      v_order_clause :=
        v_order_clause ||
        case when v_order_clause = '' then '' else ', ' end ||
        format(
          '%I %s',
          split_part(v_order_item, '.', 1),
          upper(split_part(v_order_item, '.', 2))
        );
    end if;
  end loop;

  if v_order_clause = '' then
    v_order_clause := 'updated_at desc, created_at desc';
  end if;

  v_sql := format(
    'select count(*) from public.%I where %s',
    v_definition.table_name,
    v_where_clause
  );
  execute v_sql into v_total;

  v_sql := format(
    'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb)
     from (
       select *
       from public.%I
       where %s
       order by %s
       limit %s
       offset %s
     ) t',
    v_definition.table_name,
    v_where_clause,
    v_order_clause,
    greatest(coalesce(p_page_size, 10), 1),
    greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 10), 1)
  );
  execute v_sql into v_items;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'total', coalesce(v_total, 0)
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
    validation_rule_id,
    list_visible,
    searchable
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
    validation_rule_id,
    list_visible,
    searchable
  from public.mdm_model_fields
  where definition_id = p_definition_id
  order by sort asc, created_at asc;

  return v_new_id;
end;
$$;

commit;
