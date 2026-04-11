-- MDM 模型关系持久化表
-- 用途：
-- 1. 将前端模型关系配置持久化到数据库
-- 2. 使用模型定义 ID 作为外键，避免仅靠展示名称关联
-- 3. 对关系状态、重复关系、更新时间进行数据库层约束

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.mdm_model_relationships (
  id uuid not null default gen_random_uuid(),
  source_definition_id uuid not null,
  target_definition_id uuid not null,
  relation_type text not null,
  source_field text not null,
  target_field text not null,
  remark text null,
  sort integer not null default 10,
  status text not null default 'draft',
  created_by uuid null default auth.uid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint mdm_model_relationships_pkey primary key (id),
  constraint mdm_model_relationships_source_definition_id_fkey
    foreign key (source_definition_id)
    references public.mdm_model_definitions (id)
    on delete cascade,
  constraint mdm_model_relationships_target_definition_id_fkey
    foreign key (target_definition_id)
    references public.mdm_model_definitions (id)
    on delete cascade,
  constraint mdm_model_relationships_relation_type_check
    check (relation_type = any (array['1:1'::text, '1:N'::text, 'N:1'::text, 'N:N'::text])),
  constraint mdm_model_relationships_status_check
    check (status = any (array['draft'::text, 'published'::text, 'obsolete'::text])),
  constraint mdm_model_relationships_source_target_not_same_field_check
    check (
      source_definition_id <> target_definition_id
      or lower(source_field) <> lower(target_field)
    )
) tablespace pg_default;

create unique index if not exists uk_mdm_model_relationships_unique_relation
  on public.mdm_model_relationships (
    source_definition_id,
    target_definition_id,
    relation_type,
    lower(source_field),
    lower(target_field)
  );

create index if not exists idx_mdm_model_relationships_source_definition_id
  on public.mdm_model_relationships (source_definition_id);

create index if not exists idx_mdm_model_relationships_target_definition_id
  on public.mdm_model_relationships (target_definition_id);

create index if not exists idx_mdm_model_relationships_status
  on public.mdm_model_relationships (status);

create or replace function public.guard_mdm_model_relationships_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only draft model relationships can be deleted';
    end if;

    return old;
  end if;

  if current_setting('app.mdm_model_relationship_force_write', true) = 'on' then
    return new;
  end if;

  if old.status <> 'draft' then
    raise exception 'Only draft model relationships can be modified';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Status changes must use dedicated RPC functions';
  end if;

  return new;
end;
$$;

drop trigger if exists set_mdm_model_relationships_updated_at
on public.mdm_model_relationships;

create trigger set_mdm_model_relationships_updated_at
before update on public.mdm_model_relationships
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists guard_mdm_model_relationships_write
on public.mdm_model_relationships;

create trigger guard_mdm_model_relationships_write
before update or delete on public.mdm_model_relationships
for each row
execute function public.guard_mdm_model_relationships_write();

create or replace function public.publish_model_relationship(
  p_relationship_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform set_config('app.mdm_model_relationship_force_write', 'on', true);

  update public.mdm_model_relationships
  set status = 'published'
  where id = p_relationship_id
    and status = 'draft'
  returning id into v_id;

  if v_id is null then
    raise exception 'Only draft model relationships can be published';
  end if;

  return v_id;
end;
$$;

create or replace function public.obsolete_model_relationship(
  p_relationship_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform set_config('app.mdm_model_relationship_force_write', 'on', true);

  update public.mdm_model_relationships
  set status = 'obsolete'
  where id = p_relationship_id
    and status in ('draft', 'published')
  returning id into v_id;

  if v_id is null then
    raise exception 'Only draft or published model relationships can be obsoleted';
  end if;

  return v_id;
end;
$$;

alter table public.mdm_model_relationships enable row level security;

drop policy if exists "authenticated crud mdm_model_relationships" on public.mdm_model_relationships;
create policy "authenticated crud mdm_model_relationships"
on public.mdm_model_relationships
for all
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

grant execute on function public.publish_model_relationship(uuid) to authenticated;
grant execute on function public.obsolete_model_relationship(uuid) to authenticated;
