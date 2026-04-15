begin;

create table if not exists public.mdm_distribution_targets (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  code varchar(100) not null,
  target_type varchar(32) not null default 'http',
  base_url text,
  auth_type varchar(32) not null default 'none',
  auth_config jsonb not null default '{}'::jsonb,
  description text,
  status boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create unique index if not exists mdm_distribution_targets_code_key
  on public.mdm_distribution_targets(code);

create index if not exists mdm_distribution_targets_status_idx
  on public.mdm_distribution_targets(status);

create table if not exists public.mdm_distribution_schemes (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  code varchar(100) not null,
  definition_id uuid not null references public.mdm_model_definitions(id) on delete cascade,
  target_id uuid not null references public.mdm_distribution_targets(id) on delete cascade,
  dispatch_mode varchar(32) not null default 'manual',
  trigger_events text[] not null default array['create', 'update']::text[],
  cron_expr varchar(100),
  filter_sql text,
  include_data_auth boolean not null default false,
  status varchar(32) not null default 'draft',
  last_dispatched_at timestamptz,
  remark text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mdm_distribution_schemes_status_check
    check (status in ('draft', 'enabled', 'disabled')),
  constraint mdm_distribution_schemes_dispatch_mode_check
    check (dispatch_mode in ('manual', 'realtime', 'cron'))
);

create unique index if not exists mdm_distribution_schemes_code_key
  on public.mdm_distribution_schemes(code);

create index if not exists mdm_distribution_schemes_definition_id_idx
  on public.mdm_distribution_schemes(definition_id);

create index if not exists mdm_distribution_schemes_target_id_idx
  on public.mdm_distribution_schemes(target_id);

create table if not exists public.mdm_distribution_scheme_fields (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.mdm_distribution_schemes(id) on delete cascade,
  source_field_code varchar(100) not null,
  target_field_code varchar(100) not null,
  mapping_type varchar(32) not null default 'direct',
  fixed_value text,
  transform_script text,
  sort_no integer not null default 10,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mdm_distribution_scheme_fields_mapping_type_check
    check (mapping_type in ('direct', 'fixed', 'script'))
);

create index if not exists mdm_distribution_scheme_fields_scheme_id_idx
  on public.mdm_distribution_scheme_fields(scheme_id);

create table if not exists public.mdm_distribution_tasks (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid references public.mdm_distribution_schemes(id) on delete set null,
  definition_id uuid references public.mdm_model_definitions(id) on delete set null,
  target_id uuid references public.mdm_distribution_targets(id) on delete set null,
  task_type varchar(32) not null default 'dispatch',
  trigger_mode varchar(32) not null default 'manual',
  operation_type varchar(32) not null default 'full_sync',
  record_id varchar(100),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  status varchar(32) not null default 'pending',
  retry_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mdm_distribution_tasks_status_check
    check (status in ('pending', 'running', 'success', 'failed', 'cancelled'))
);

create index if not exists mdm_distribution_tasks_scheme_id_idx
  on public.mdm_distribution_tasks(scheme_id);

create index if not exists mdm_distribution_tasks_status_idx
  on public.mdm_distribution_tasks(status);

create index if not exists mdm_distribution_tasks_created_at_idx
  on public.mdm_distribution_tasks(created_at desc);

create table if not exists public.mdm_distribution_task_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.mdm_distribution_tasks(id) on delete cascade,
  level varchar(16) not null default 'info',
  message text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  success boolean,
  created_at timestamptz not null default now(),
  constraint mdm_distribution_task_logs_level_check
    check (level in ('info', 'warning', 'error'))
);

create index if not exists mdm_distribution_task_logs_task_id_idx
  on public.mdm_distribution_task_logs(task_id);

create index if not exists mdm_distribution_task_logs_created_at_idx
  on public.mdm_distribution_task_logs(created_at desc);

comment on table public.mdm_distribution_targets is '主数据分发目标定义';
comment on table public.mdm_distribution_schemes is '主数据分发方案定义';
comment on table public.mdm_distribution_scheme_fields is '主数据分发方案字段映射';
comment on table public.mdm_distribution_tasks is '主数据分发任务队列';
comment on table public.mdm_distribution_task_logs is '主数据分发执行日志';

commit;
