begin;

create or replace function public.get_mdm_actor_display_name()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'realName', ''),
    nullif(auth.jwt() ->> 'username', ''),
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'email', ''),
    'Unknown'
  );
$$;

create or replace function public.set_mdm_business_record_defaults()
returns trigger
language plpgsql
as $$
declare
  v_actor_name text := public.get_mdm_actor_display_name();
begin
  if tg_op = 'INSERT' then
    if new.id is null then
      new.id := gen_random_uuid();
    end if;
    if new.status is null or btrim(new.status) = '' then
      new.status := 'draft';
    end if;
    if new.created_at is null then
      new.created_at := now();
    end if;
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    if new.created_by_name is null or btrim(new.created_by_name) = '' then
      new.created_by_name := v_actor_name;
    end if;
  end if;

  if new.updated_at is null then
    new.updated_at := now();
  else
    new.updated_at := now();
  end if;

  if new.updated_by is null or tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
  end if;
  if new.updated_by_name is null or btrim(new.updated_by_name) = '' or tg_op = 'UPDATE' then
    new.updated_by_name := v_actor_name;
  end if;

  return new;
end;
$$;

create or replace function public.apply_mdm_business_table_defaults(p_table_name text)
returns void
language plpgsql
as $$
declare
  v_trigger_name text;
begin
  if p_table_name is null or btrim(p_table_name) = '' then
    return;
  end if;

  execute format(
    'alter table public.%I alter column id set default gen_random_uuid()',
    p_table_name
  );
  execute format(
    'alter table public.%I alter column status set default %L',
    p_table_name,
    'draft'
  );
  execute format(
    'alter table public.%I alter column created_at set default now()',
    p_table_name
  );
  execute format(
    'alter table public.%I alter column updated_at set default now()',
    p_table_name
  );
  execute format(
    'alter table public.%I alter column created_by set default auth.uid()',
    p_table_name
  );
  execute format(
    'alter table public.%I alter column updated_by set default auth.uid()',
    p_table_name
  );

  v_trigger_name := format('set_%s_business_defaults', p_table_name);
  execute format(
    'drop trigger if exists %I on public.%I',
    v_trigger_name,
    p_table_name
  );
  execute format(
    'create trigger %I before insert or update on public.%I for each row execute function public.set_mdm_business_record_defaults()',
    v_trigger_name,
    p_table_name
  );

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_mdm_business_history_snapshot_trigger'
  ) then
    perform public.apply_mdm_business_history_snapshot_trigger(p_table_name);
  end if;
end;
$$;

create or replace function public.sync_mdm_business_table_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.table_name is not null and btrim(new.table_name) <> '' then
    perform public.apply_mdm_business_table_defaults(new.table_name);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_mdm_business_table_defaults on public.mdm_model_definitions;

create trigger sync_mdm_business_table_defaults
after insert or update of status, table_name on public.mdm_model_definitions
for each row
execute function public.sync_mdm_business_table_defaults();

do $$
declare
  v_table_name text;
begin
  for v_table_name in
    select table_name
    from public.mdm_model_definitions
    where status = 'published'
      and table_name is not null
      and btrim(table_name) <> ''
  loop
    perform public.apply_mdm_business_table_defaults(v_table_name);
  end loop;
end;
$$;

commit;
