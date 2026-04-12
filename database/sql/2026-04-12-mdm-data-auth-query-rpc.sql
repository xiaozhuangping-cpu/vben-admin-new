begin;

create or replace function public.current_mdm_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_local_part text := split_part(v_email, '@', 1);
  v_user_id uuid;
begin
  if auth.uid() is not null then
    select id
    into v_user_id
    from public.mdm_users
    where auth_user_id = auth.uid()
    limit 1;
  end if;

  if v_user_id is not null then
    return v_user_id;
  end if;

  if v_email = '' then
    return null;
  end if;

  select id
  into v_user_id
  from public.mdm_users
  where lower(coalesce(auth_email, '')) = v_email
     or lower(username) = v_email
     or lower(username) = v_local_part
  limit 1;

  return v_user_id;
end;
$$;

create or replace function public.current_mdm_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists(
    select 1
    from public.rbac_user_roles ur
    join public.rbac_roles r on r.id = ur.role_id
    where ur.user_id = public.current_mdm_user_id()
      and r.code = 'super_admin'
  );
$$;

create or replace function public.current_mdm_user_group_ids()
returns uuid[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    array(
      select g.id
      from public.mdm_user_groups g
      where g.status = true
        and public.current_mdm_user_id() is not null
        and coalesce(g.user_ids, '{}'::uuid[]) @> array[public.current_mdm_user_id()]::uuid[]
    ),
    '{}'::uuid[]
  );
$$;

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
    if v_filter_key !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' then
      continue;
    end if;

    if v_filter_value like 'eq.%' then
      v_where_clause := format(
        '%s and %I = %L',
        v_where_clause,
        v_filter_key,
        substr(v_filter_value, 4)
      );
    elsif v_filter_value like 'neq.%' then
      v_where_clause := format(
        '%s and %I <> %L',
        v_where_clause,
        v_filter_key,
        substr(v_filter_value, 5)
      );
    elsif v_filter_value like 'like.%' then
      v_where_clause := format(
        '%s and %I like %L',
        v_where_clause,
        v_filter_key,
        substr(v_filter_value, 6)
      );
    elsif v_filter_value like 'ilike.%' then
      v_where_clause := format(
        '%s and %I ilike %L',
        v_where_clause,
        v_filter_key,
        substr(v_filter_value, 7)
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

commit;
