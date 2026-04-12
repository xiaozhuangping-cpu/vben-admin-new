begin;

create table if not exists public.mdm_model_data_auth_configs (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.mdm_model_definitions(id) on delete cascade,
  group_ids uuid[] not null default '{}'::uuid[],
  row_filter_sql text,
  status boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_model_data_auth_configs_definition_id_key unique (definition_id)
);

create table if not exists public.mdm_model_data_auth_fields (
  id uuid primary key default gen_random_uuid(),
  auth_config_id uuid not null references public.mdm_model_data_auth_configs(id) on delete cascade,
  field_id uuid not null references public.mdm_model_fields(id) on delete cascade,
  can_read boolean not null default false,
  can_write boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  constraint mdm_model_data_auth_fields_auth_config_field_key unique (auth_config_id, field_id)
);

create index if not exists idx_mdm_model_data_auth_configs_definition_id
  on public.mdm_model_data_auth_configs(definition_id);

create index if not exists idx_mdm_model_data_auth_fields_auth_config_id
  on public.mdm_model_data_auth_fields(auth_config_id);

create index if not exists idx_mdm_model_data_auth_fields_field_id
  on public.mdm_model_data_auth_fields(field_id);

alter table public.mdm_model_data_auth_configs enable row level security;
alter table public.mdm_model_data_auth_fields enable row level security;

drop policy if exists authenticated_crud_mdm_model_data_auth_configs on public.mdm_model_data_auth_configs;
create policy authenticated_crud_mdm_model_data_auth_configs on public.mdm_model_data_auth_configs
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists authenticated_crud_mdm_model_data_auth_fields on public.mdm_model_data_auth_fields;
create policy authenticated_crud_mdm_model_data_auth_fields on public.mdm_model_data_auth_fields
for all to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop trigger if exists trg_mdm_model_data_auth_configs_audit_fields on public.mdm_model_data_auth_configs;
create trigger trg_mdm_model_data_auth_configs_audit_fields
before insert or update on public.mdm_model_data_auth_configs
for each row execute function public.set_mdm_audit_fields();

drop trigger if exists trg_mdm_model_data_auth_fields_audit_fields on public.mdm_model_data_auth_fields;
create trigger trg_mdm_model_data_auth_fields_audit_fields
before insert or update on public.mdm_model_data_auth_fields
for each row execute function public.set_mdm_audit_fields();

commit;
