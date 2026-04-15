begin;

create table if not exists public.mdm_collection_tasks (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  collection_type varchar(20) not null,
  api_url text,
  plugin_code varchar(100),
  execute_strategy text,
  status varchar(20) not null default 'enabled',
  last_executed_at timestamptz,
  last_execution_status varchar(20),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mdm_collection_tasks_type_check
    check (collection_type in ('api', 'plugin')),
  constraint mdm_collection_tasks_status_check
    check (status in ('enabled', 'disabled')),
  constraint mdm_collection_tasks_source_check
    check (
      (collection_type = 'api' and nullif(btrim(coalesce(api_url, '')), '') is not null)
      or (collection_type = 'plugin' and nullif(btrim(coalesce(plugin_code, '')), '') is not null)
    )
);

create index if not exists mdm_collection_tasks_status_idx
  on public.mdm_collection_tasks(status);

create index if not exists mdm_collection_tasks_type_idx
  on public.mdm_collection_tasks(collection_type);

create index if not exists mdm_collection_tasks_last_executed_at_idx
  on public.mdm_collection_tasks(last_executed_at desc);

create table if not exists public.mdm_collection_task_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.mdm_collection_tasks(id) on delete cascade,
  trigger_mode varchar(20) not null default 'manual',
  status varchar(20) not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mdm_collection_task_runs_trigger_mode_check
    check (trigger_mode in ('manual', 'schedule')),
  constraint mdm_collection_task_runs_status_check
    check (status in ('pending', 'running', 'success', 'failed', 'cancelled'))
);

create index if not exists mdm_collection_task_runs_task_id_idx
  on public.mdm_collection_task_runs(task_id);

create index if not exists mdm_collection_task_runs_status_idx
  on public.mdm_collection_task_runs(status);

create index if not exists mdm_collection_task_runs_created_at_idx
  on public.mdm_collection_task_runs(created_at desc);

create table if not exists public.mdm_collection_task_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.mdm_collection_task_runs(id) on delete cascade,
  task_id uuid not null references public.mdm_collection_tasks(id) on delete cascade,
  level varchar(16) not null default 'info',
  message text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mdm_collection_task_logs_level_check
    check (level in ('info', 'warning', 'error'))
);

create index if not exists mdm_collection_task_logs_task_id_idx
  on public.mdm_collection_task_logs(task_id);

create index if not exists mdm_collection_task_logs_run_id_idx
  on public.mdm_collection_task_logs(run_id);

create index if not exists mdm_collection_task_logs_created_at_idx
  on public.mdm_collection_task_logs(created_at desc);

create or replace function public.enqueue_mdm_collection_run(
  p_task_id uuid,
  p_trigger_mode text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_task public.mdm_collection_tasks%rowtype;
  v_run_id uuid;
begin
  select *
  into v_task
  from public.mdm_collection_tasks
  where id = p_task_id
  limit 1;

  if not found then
    raise exception 'Collection task % does not exist', p_task_id;
  end if;

  insert into public.mdm_collection_task_runs (
    task_id,
    trigger_mode,
    status,
    result_summary,
    created_by,
    updated_by
  )
  values (
    p_task_id,
    case
      when p_trigger_mode in ('manual', 'schedule') then p_trigger_mode
      else 'manual'
    end,
    'pending',
    jsonb_build_object(
      'collectionType', v_task.collection_type,
      'taskName', v_task.name
    ),
    public.current_mdm_user_id(),
    public.current_mdm_user_id()
  )
  returning id into v_run_id;

  insert into public.mdm_collection_task_logs (
    run_id,
    task_id,
    level,
    message,
    detail
  )
  values (
    v_run_id,
    p_task_id,
    'info',
    format('Collection run queued for task [%s].', coalesce(v_task.name, p_task_id::text)),
    jsonb_build_object(
      'triggerMode', p_trigger_mode
    )
  );

  return jsonb_build_object(
    'runId', v_run_id,
    'taskId', p_task_id,
    'taskName', v_task.name
  );
end;
$$;

grant execute on function public.enqueue_mdm_collection_run(uuid, text) to authenticated;

comment on table public.mdm_collection_tasks is 'MDM data collection task definitions';
comment on table public.mdm_collection_task_runs is 'MDM data collection execution runs';
comment on table public.mdm_collection_task_logs is 'MDM data collection execution logs';

commit;
