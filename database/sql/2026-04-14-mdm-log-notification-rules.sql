begin;

create table if not exists public.mdm_log_notification_rules (
  id uuid primary key default gen_random_uuid(),
  log_category varchar(32) not null,
  log_level varchar(16) not null,
  notify_channel varchar(32) not null,
  receiver_group_ids uuid[] not null default '{}'::uuid[],
  remark text,
  status boolean not null default true,
  created_by uuid references public.mdm_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.mdm_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint mdm_log_notification_rules_category_check
    check (log_category in ('collection', 'distribution')),
  constraint mdm_log_notification_rules_level_check
    check (log_level in ('info', 'warning', 'error')),
  constraint mdm_log_notification_rules_channel_check
    check (notify_channel in ('site_message', 'dingtalk'))
);

create index if not exists mdm_log_notification_rules_lookup_idx
  on public.mdm_log_notification_rules(log_category, log_level, notify_channel)
  where status = true;

create table if not exists public.mdm_log_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.mdm_log_notification_rules(id) on delete cascade,
  log_category varchar(32) not null,
  log_record_id uuid not null,
  notify_channel varchar(32) not null,
  receiver_group_id uuid references public.mdm_user_groups(id) on delete set null,
  receiver_user_id uuid references public.mdm_users(id) on delete set null,
  notification_id uuid references public.mdm_notifications(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status varchar(16) not null default 'pending',
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mdm_log_notification_deliveries_category_check
    check (log_category in ('collection', 'distribution')),
  constraint mdm_log_notification_deliveries_channel_check
    check (notify_channel in ('site_message', 'dingtalk')),
  constraint mdm_log_notification_deliveries_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint mdm_log_notification_deliveries_unique
    unique (rule_id, log_record_id, notify_channel, receiver_user_id)
);

create index if not exists mdm_log_notification_deliveries_log_idx
  on public.mdm_log_notification_deliveries(log_category, log_record_id, notify_channel);

create or replace function public.process_mdm_log_notification(
  p_log_category text,
  p_log_id uuid,
  p_log_level text,
  p_message text,
  p_task_id uuid default null,
  p_run_id uuid default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rule record;
  v_group_id uuid;
  v_user_id uuid;
  v_group_user_ids uuid[];
  v_notification_id uuid;
  v_route_path text;
  v_title text;
  v_payload jsonb;
begin
  if p_log_category = 'collection' then
    v_route_path := format('/mdm/integration/collection/log-detail/%s', p_log_id);
    v_title := format('[归集日志][%s] %s', upper(coalesce(p_log_level, 'info')), left(coalesce(p_message, ''), 60));
  else
    v_route_path := format('/mdm/integration/distribution/log-detail/%s', p_log_id);
    v_title := format('[分发日志][%s] %s', upper(coalesce(p_log_level, 'info')), left(coalesce(p_message, ''), 60));
  end if;

  v_payload := jsonb_build_object(
    'category', p_log_category,
    'level', p_log_level,
    'logId', p_log_id,
    'message', coalesce(p_message, ''),
    'routePath', v_route_path,
    'runId', p_run_id,
    'taskId', p_task_id
  );

  for v_rule in
    select *
    from public.mdm_log_notification_rules
    where status = true
      and log_category = p_log_category
      and log_level = p_log_level
  loop
    if coalesce(array_length(v_rule.receiver_group_ids, 1), 0) = 0 then
      continue;
    end if;

    if v_rule.notify_channel = 'site_message' then
      insert into public.mdm_notifications (
        biz_key,
        title,
        content,
        type,
        level,
        source_type,
        source_id,
        route_path,
        status,
        created_at,
        updated_at
      )
      values (
        format('log:%s:%s:rule:%s:channel:%s', p_log_category, p_log_id, v_rule.id, v_rule.notify_channel),
        v_title,
        coalesce(p_message, ''),
        'alert',
        p_log_level,
        p_log_category || '_log',
        p_log_id::text,
        v_route_path,
        true,
        now(),
        now()
      )
      on conflict (biz_key) do update
      set
        content = excluded.content,
        level = excluded.level,
        route_path = excluded.route_path,
        updated_at = now()
      returning id into v_notification_id;
    else
      v_notification_id := null;
    end if;

    foreach v_group_id in array v_rule.receiver_group_ids
    loop
      select user_ids
      into v_group_user_ids
      from public.mdm_user_groups
      where id = v_group_id
      limit 1;

      if coalesce(array_length(v_group_user_ids, 1), 0) = 0 then
        continue;
      end if;

      foreach v_user_id in array v_group_user_ids
      loop
        if v_user_id is null then
          continue;
        end if;

        insert into public.mdm_log_notification_deliveries (
          rule_id,
          log_category,
          log_record_id,
          notify_channel,
          receiver_group_id,
          receiver_user_id,
          notification_id,
          payload,
          status,
          error_message,
          delivered_at,
          updated_at
        )
        values (
          v_rule.id,
          p_log_category,
          p_log_id,
          v_rule.notify_channel,
          v_group_id,
          v_user_id,
          v_notification_id,
          v_payload,
          case when v_rule.notify_channel = 'site_message' then 'sent' else 'pending' end,
          case
            when v_rule.notify_channel = 'dingtalk' then '钉钉发送器尚未绑定到外部 webhook，请补充发送处理器。'
            else null
          end,
          case when v_rule.notify_channel = 'site_message' then now() else null end,
          now()
        )
        on conflict (rule_id, log_record_id, notify_channel, receiver_user_id) do update
        set
          notification_id = excluded.notification_id,
          payload = excluded.payload,
          updated_at = now();

        if v_rule.notify_channel = 'site_message' and v_notification_id is not null then
          insert into public.mdm_notification_receivers (
            notification_id,
            user_id,
            created_at,
            updated_at
          )
          values (
            v_notification_id,
            v_user_id,
            now(),
            now()
          )
          on conflict (notification_id, user_id) do nothing;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

create or replace function public.trg_mdm_collection_task_logs_notify()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.process_mdm_log_notification(
    'collection',
    new.id,
    new.level,
    new.message,
    new.task_id,
    new.run_id
  );

  return new;
end;
$$;

create or replace function public.trg_mdm_distribution_task_logs_notify()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.process_mdm_log_notification(
    'distribution',
    new.id,
    new.level,
    new.message,
    new.task_id,
    null
  );

  return new;
end;
$$;

drop trigger if exists trg_mdm_collection_task_logs_notify on public.mdm_collection_task_logs;
create trigger trg_mdm_collection_task_logs_notify
after insert on public.mdm_collection_task_logs
for each row
execute function public.trg_mdm_collection_task_logs_notify();

drop trigger if exists trg_mdm_distribution_task_logs_notify on public.mdm_distribution_task_logs;
create trigger trg_mdm_distribution_task_logs_notify
after insert on public.mdm_distribution_task_logs
for each row
execute function public.trg_mdm_distribution_task_logs_notify();

alter table public.mdm_log_notification_rules enable row level security;
alter table public.mdm_log_notification_deliveries enable row level security;

drop policy if exists select_mdm_log_notification_rules on public.mdm_log_notification_rules;
create policy select_mdm_log_notification_rules
  on public.mdm_log_notification_rules
  for select
  to authenticated
  using (true);

drop policy if exists all_mdm_log_notification_rules on public.mdm_log_notification_rules;
create policy all_mdm_log_notification_rules
  on public.mdm_log_notification_rules
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists select_mdm_log_notification_deliveries on public.mdm_log_notification_deliveries;
create policy select_mdm_log_notification_deliveries
  on public.mdm_log_notification_deliveries
  for select
  to authenticated
  using (true);

drop policy if exists all_mdm_log_notification_deliveries on public.mdm_log_notification_deliveries;
create policy all_mdm_log_notification_deliveries
  on public.mdm_log_notification_deliveries
  for all
  to authenticated
  using (true)
  with check (true);

with integration_menu as (
  select id
  from public.rbac_menus
  where name = 'MdmIntegration'
  limit 1
)
insert into public.rbac_menus (parent_id, name, title, path, component, order_no)
select
  id,
  'MdmIntegrationLogNotification',
  '日志提醒配置',
  '/mdm/integration/log-notification',
  'mdm/integration/log-notification/index.vue',
  5
from integration_menu
on conflict (name) do update
set
  title = excluded.title,
  path = excluded.path,
  component = excluded.component,
  order_no = excluded.order_no;

notify pgrst, 'reload schema';

commit;
