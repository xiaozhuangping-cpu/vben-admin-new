begin;

create or replace function public.get_mdm_overview_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_theme_count integer := 0;
  v_model_count integer := 0;
  v_target_count integer := 0;
  v_scheme_count integer := 0;
  v_monthly_map jsonb := '{}'::jsonb;
  v_monthly_increments jsonb := '[]'::jsonb;
  v_theme_model_distribution jsonb := '[]'::jsonb;
  v_table record;
  v_month_bucket record;
  v_month_key text;
  v_month_total bigint;
begin
  select count(*)
  into v_theme_count
  from public.mdm_themes;

  select count(*)
  into v_model_count
  from public.mdm_model_definitions
  where status <> 'history';

  select count(*)
  into v_target_count
  from public.mdm_distribution_targets;

  select count(*)
  into v_scheme_count
  from public.mdm_distribution_schemes;

  for v_table in
    select distinct d.table_name
    from public.mdm_model_definitions d
    where d.status = 'published'
      and d.table_name is not null
      and btrim(d.table_name) <> ''
      and exists (
        select 1
        from information_schema.tables t
        where t.table_schema = 'public'
          and t.table_name = d.table_name
      )
      and exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = d.table_name
          and c.column_name = 'created_at'
      )
  loop
    for v_month_bucket in
      execute format(
        $sql$
          select
            to_char(date_trunc('month', created_at), 'YYYY-MM') as month_key,
            count(*)::bigint as total_count
          from public.%I
          where created_at >= date_trunc('month', current_date) - interval '11 months'
          group by 1
        $sql$,
        v_table.table_name
      )
    loop
      v_month_key := v_month_bucket.month_key;
      v_month_total := coalesce((v_monthly_map ->> v_month_key)::bigint, 0)
        + coalesce(v_month_bucket.total_count, 0);
      v_monthly_map := jsonb_set(
        v_monthly_map,
        array[v_month_key],
        to_jsonb(v_month_total),
        true
      );
    end loop;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month', to_char(month_start, 'YYYY-MM'),
        'count', coalesce((v_monthly_map ->> to_char(month_start, 'YYYY-MM'))::bigint, 0)
      )
      order by month_start
    ),
    '[]'::jsonb
  )
  into v_monthly_increments
  from generate_series(
    date_trunc('month', current_date) - interval '11 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as month_start;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'themeId', coalesce(theme_id_text, ''),
        'themeName', theme_name,
        'modelCount', model_count
      )
      order by model_count desc, theme_name asc
    ),
    '[]'::jsonb
  )
  into v_theme_model_distribution
  from (
    select
      coalesce(d.theme_id::text, '') as theme_id_text,
      coalesce(t.name, 'Uncategorized') as theme_name,
      count(*)::integer as model_count
    from public.mdm_model_definitions d
    left join public.mdm_themes t on t.id = d.theme_id
    where d.status <> 'history'
    group by d.theme_id, t.name
  ) distribution_stats;

  return jsonb_build_object(
    'cards', jsonb_build_object(
      'themeCount', v_theme_count,
      'modelCount', v_model_count,
      'targetCount', v_target_count,
      'schemeCount', v_scheme_count
    ),
    'monthlyIncrements', v_monthly_increments,
    'themeModelDistribution', v_theme_model_distribution
  );
end;
$$;

grant execute on function public.get_mdm_overview_dashboard() to anon;
grant execute on function public.get_mdm_overview_dashboard() to authenticated;
grant execute on function public.get_mdm_overview_dashboard() to service_role;

commit;
