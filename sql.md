create table public.mdm_themes ( id uuid not null default gen_random_uuid (), name text not null, code text not null, "order" integer null default 0, description text null, user_group_id uuid null, created_at timestamp with time zone null default now(), updated_at timestamp with time zone null default now(), constraint mdm_themes_pkey primary key (id), constraint mdm_themes_code_key unique (code), constraint mdm_themes_user_group_id_fkey foreign KEY (user_group_id) references mdm_user_groups (id) on delete set null ) TABLESPACE pg_default;

create table public.mdm_user_groups ( id uuid not null default gen_random_uuid (), name text not null, code text not null, description text null, status boolean null default true, created_at timestamp with time zone null default now(), updated_at timestamp with time zone null default now(), constraint mdm_user_groups_pkey primary key (id), constraint mdm_user_groups_code_key unique (code) ) TABLESPACE pg_default;

create table public.mdm_model_definitions ( id uuid not null default gen_random_uuid(), root_definition_id uuid null, source_definition_id uuid null, theme_id uuid null, name text not null, code text not null, status text not null default 'draft', version_no integer not null default 1, table_name text null, description text null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), constraint mdm_model_definitions_pkey primary key (id), constraint mdm_model_definitions_theme_id_fkey foreign key (theme_id) references public.mdm_themes (id) on delete set null, constraint mdm_model_definitions_root_definition_id_fkey foreign key (root_definition_id) references public.mdm_model_definitions (id) on delete set null, constraint mdm_model_definitions_source_definition_id_fkey foreign key (source_definition_id) references public.mdm_model_definitions (id) on delete set null, constraint mdm_model_definitions_status_check check (status in ('draft', 'published', 'unpublished')) ) tablespace pg_default;

create index if not exists idx_mdm_model_definitions_theme_id on public.mdm_model_definitions (theme_id); create index if not exists idx_mdm_model_definitions_status on public.mdm_model_definitions (status); create index if not exists idx_mdm_model_definitions_root_definition_id on public.mdm_model_definitions (root_definition_id);

create table public.mdm_model_fields ( id uuid not null default gen_random_uuid(), definition_id uuid not null, name text not null, code text not null, data_type text not null, length integer null, precision integer null, is_multiple boolean not null default false, is_required boolean not null default false, is_primary boolean not null default false, is_unique boolean not null default false, default_value text null, sort integer not null default 10, status boolean not null default true, remarks text null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), constraint mdm_model_fields_pkey primary key (id), constraint mdm_model_fields_definition_id_fkey foreign key (definition_id) references public.mdm_model_definitions (id) on delete cascade, constraint mdm_model_fields_data_type_check check (data_type in ('text', 'varchar', 'int4', 'numeric', 'boolean', 'date', 'timestamptz', 'attachment')), constraint mdm_model_fields_unique_code unique (definition_id, code) ) tablespace pg_default;

create index if not exists idx_mdm_model_fields_definition_id on public.mdm_model_fields (definition_id);

create table public.mdm_model_versions ( id uuid not null default gen_random_uuid(), definition_id uuid not null, version_no integer not null, version_label text not null, status text not null, action_type text not null, table_name text null, definition_snapshot jsonb not null default '{}'::jsonb, field_snapshot jsonb not null default '[]'::jsonb, created_by uuid null default auth.uid(), created_at timestamp with time zone not null default now(), constraint mdm_model_versions_pkey primary key (id), constraint mdm_model_versions_definition_id_fkey foreign key (definition_id) references public.mdm_model_definitions (id) on delete cascade ) tablespace pg_default;

create index if not exists idx_mdm_model_versions_definition_id on public.mdm_model_versions (definition_id);

create table public.mdm_model_migrations ( id uuid not null default gen_random_uuid(), definition_id uuid not null, version_no integer not null, table_name text not null, executed_sql text[] not null default '{}', status text not null default 'success', error_message text null, created_by uuid null default auth.uid(), created_at timestamp with time zone not null default now(), constraint mdm_model_migrations_pkey primary key (id), constraint mdm_model_migrations_definition_id_fkey foreign key (definition_id) references public.mdm_model_definitions (id) on delete cascade ) tablespace pg_default;

create index if not exists idx_mdm_model_migrations_definition_id on public.mdm_model_migrations (definition_id);

create or replace function public.set_current_timestamp_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end;

$$
language plpgsql;

drop trigger if exists set_mdm_model_definitions_updated_at on public.mdm_model_definitions;
create trigger set_mdm_model_definitions_updated_at
before update on public.mdm_model_definitions
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_mdm_model_fields_updated_at on public.mdm_model_fields;
create trigger set_mdm_model_fields_updated_at
before update on public.mdm_model_fields
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.publish_model_definition(p_definition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as
$$

declare v_definition public.mdm_model_definitions%rowtype; v_fields jsonb := '[]'::jsonb; v_field record; v_table_name text; v_sanitized_code text; v_sql text; v_type_sql text; v_default_sql text; v_executed_sql text[] := '{}'; v_column_name text; v_should_exist boolean; v_existing_column record; v_unique_index_name text; begin select \* into v_definition from public.mdm_model_definitions where id = p_definition_id;

if not found then raise exception '数据模型不存在'; end if;

if v_definition.status <> 'draft' then raise exception '只有草稿状态模型才能发布'; end if;

select jsonb_agg(to_jsonb(f) order by f.sort asc, f.created_at asc) into v_fields from public.mdm_model_fields f where f.definition_id = p_definition_id;

if v_fields is null or jsonb_array_length(v_fields) = 0 then raise exception '请先配置模型字段后再发布'; end if;

v*sanitized_code := regexp_replace(lower(v_definition.code), '[^a-z0-9*]+', '_', 'g'); v_table_name := coalesce(nullif(v_definition.table_name, ''), format('mdm_data_%s', v_sanitized_code));

v_sql := format( 'create table if not exists public.%I (id uuid not null default gen_random_uuid() primary key, created_at timestamptz not null default now(), updated_at timestamptz not null default now())', v_table_name ); execute v_sql; v_executed_sql := array_append(v_executed_sql, v_sql);

for v_field in select \* from public.mdm_model_fields where definition_id = p_definition_id and status = true order by sort asc, created_at asc loop v_column_name := lower(v_field.code); v_type_sql := case v_field.data_type when 'varchar' then format('varchar(%s)', coalesce(nullif(v_field.length, 0), 255)) when 'numeric' then format('numeric(%s,%s)', coalesce(nullif(v_field.length, 0), 18), coalesce(v_field.precision, 2)) when 'int4' then 'integer' when 'boolean' then 'boolean' when 'date' then 'date' when 'timestamptz' then 'timestamp with time zone' when 'attachment' then 'jsonb' else 'text' end;

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
      v_sql := format('alter table public.%I add column %I %s', v_table_name, v_column_name, v_type_sql);
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

for v_existing_column in select c.column_name from information_schema.columns c where c.table_schema = 'public' and c.table_name = v_table_name and c.column_name not in ('id', 'created_at', 'updated_at') loop select exists ( select 1 from public.mdm_model_fields f where f.definition_id = p_definition_id and f.status = true and lower(f.code) = v_existing_column.column_name ) into v_should_exist;

    if not v_should_exist then
      execute format('drop index if exists public.%I', format('uk_%s_%s', v_table_name, v_existing_column.column_name));
      v_sql := format(
        'alter table public.%I drop column if exists %I',
        v_table_name,
        v_existing_column.column_name
      );
      execute v_sql;
      v_executed_sql := array_append(v_executed_sql, v_sql);
    end if;

end loop;

execute format( 'drop trigger if exists set\_%I_updated_at on public.%I', v_table_name, v_table_name );

execute format( 'create trigger set*%I_updated_at before update on public.%I for each row execute function public.set_current_timestamp_updated_at()', v_table_name, v_table_name ); v_executed_sql := array_append( v_executed_sql, format( 'create trigger set*%I_updated_at before update on public.%I for each row execute function public.set_current_timestamp_updated_at()', v_table_name, v_table_name ) );

v_sql := format('alter table public.%I enable row level security', v_table_name); execute v_sql; v_executed_sql := array_append(v_executed_sql, v_sql);

v_sql := format( 'grant select, insert, update, delete on table public.%I to authenticated', v_table_name ); execute v_sql; v_executed_sql := array_append(v_executed_sql, v_sql);

v*sql := format( 'drop policy if exists %I on public.%I', format('authenticated_crud*%s', v_table_name), v_table_name ); execute v_sql; v_executed_sql := array_append(v_executed_sql, v_sql);

v*sql := format( 'create policy %I on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', format('authenticated_crud*%s', v_table_name), v_table_name ); execute v_sql; v_executed_sql := array_append(v_executed_sql, v_sql);

insert into public.mdm_model_versions ( definition_id, version_no, version_label, status, action_type, table_name, definition_snapshot, field_snapshot ) values ( v_definition.id, v_definition.version_no, format('v%s.0', v_definition.version_no), 'published', 'publish', v_table_name, to_jsonb(v_definition), v_fields );

insert into public.mdm_model_migrations ( definition_id, version_no, table_name, executed_sql, status ) values ( v_definition.id, v_definition.version_no, v_table_name, v_executed_sql, 'success' );

update public.mdm_model_definitions set status = 'published', table_name = v_table_name, updated_at = now() where id = p_definition_id;

return jsonb_build_object( 'definition_id', p_definition_id, 'status', 'published', 'table_name', v_table_name ); end;

$$
;

create or replace function public.unpublish_model_definition(p_definition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as
$$

begin update public.mdm_model_definitions set status = 'unpublished', updated_at = now() where id = p_definition_id and status = 'published';

if not found then raise exception '只有已发布状态模型才能取消发布'; end if;

return jsonb_build_object( 'definition_id', p_definition_id, 'status', 'unpublished' ); end;

$$
;

create or replace function public.upgrade_model_definition(p_definition_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as
$$

declare v_source public.mdm_model_definitions%rowtype; v_new_id uuid; v_root_id uuid; begin select \* into v_source from public.mdm_model_definitions where id = p_definition_id;

if not found then raise exception '数据模型不存在'; end if;

if v_source.status <> 'published' then raise exception '只有已发布模型才能升级'; end if;

update public.mdm_model_definitions set status = 'unpublished', updated_at = now() where id = p_definition_id and status = 'published';

v_root_id := coalesce(v_source.root_definition_id, v_source.id);

insert into public.mdm_model_definitions ( root_definition_id, source_definition_id, theme_id, name, code, status, version_no, table_name, description ) values ( v_root_id, v_source.id, v_source.theme_id, v_source.name, v_source.code, 'draft', v_source.version_no + 1, null, v_source.description ) returning id into v_new_id;

  insert into public.mdm_model_fields ( definition_id, name, code, data_type, length, precision, is_multiple, is_required, is_primary, is_unique, default_value, sort, status, remarks ) select v_new_id, name, code, data_type, length, precision, is_multiple, is_required, is_primary, is_unique, default_value, sort, status, remarks from public.mdm_model_fields where definition_id = p_definition_id order by sort asc, created_at asc;

return v_new_id; end;

$$
;

alter table public.mdm_model_definitions enable row level security;
alter table public.mdm_model_fields enable row level security;
alter table public.mdm_model_versions enable row level security;
alter table public.mdm_model_migrations enable row level security;

drop policy if exists "authenticated crud mdm_model_definitions" on public.mdm_model_definitions;
create policy "authenticated crud mdm_model_definitions"
on public.mdm_model_definitions
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated crud mdm_model_fields" on public.mdm_model_fields;
create policy "authenticated crud mdm_model_fields"
on public.mdm_model_fields
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated crud mdm_model_versions" on public.mdm_model_versions;
create policy "authenticated crud mdm_model_versions"
on public.mdm_model_versions
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "authenticated crud mdm_model_migrations" on public.mdm_model_migrations;
create policy "authenticated crud mdm_model_migrations"
on public.mdm_model_migrations
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

grant execute on function public.publish_model_definition(uuid) to authenticated;
grant execute on function public.unpublish_model_definition(uuid) to authenticated;
grant execute on function public.upgrade_model_definition(uuid) to authenticated;
$$
