begin;

create or replace function public.get_mdm_distribution_records(
  p_definition_id uuid,
  p_record_id text default null,
  p_filter_sql text default '',
  p_include_data_auth boolean default false,
  p_limit integer default 1000
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
  v_where_clause text := 'true';
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

  if p_include_data_auth then
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
  end if;

  if btrim(coalesce(p_filter_sql, '')) <> '' then
    v_where_clause := format('%s and (%s)', v_where_clause, p_filter_sql);
  end if;

  if btrim(coalesce(p_record_id, '')) <> '' then
    v_where_clause := format('%s and id = %L', v_where_clause, p_record_id);
  end if;

  v_sql := format(
    'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb)
     from (
       select *
       from public.%I
       where %s
       order by updated_at desc, created_at desc
       limit %s
     ) t',
    v_definition.table_name,
    v_where_clause,
    greatest(coalesce(p_limit, 1000), 1)
  );
  execute v_sql into v_items;

  return jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'total', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

grant execute on function public.get_mdm_distribution_records(uuid, text, text, boolean, integer) to authenticated;

commit;
