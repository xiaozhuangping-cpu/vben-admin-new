begin;

create table if not exists public.mdm_notifications (
  id uuid primary key default gen_random_uuid(),
  biz_key text,
  title text not null,
  content text not null default '',
  type text not null default 'system',
  level text not null default 'info',
  source_type text,
  source_id text,
  route_path text,
  external_url text,
  icon text,
  avatar text,
  status boolean not null default true,
  created_by uuid references public.mdm_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mdm_notifications_biz_key_key unique (biz_key)
);

create table if not exists public.mdm_notification_receivers (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.mdm_notifications(id) on delete cascade,
  user_id uuid not null references public.mdm_users(id) on delete cascade,
  read_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mdm_notification_receivers_notification_user_key
    unique (notification_id, user_id)
);

create index if not exists mdm_notifications_created_at_idx
  on public.mdm_notifications(created_at desc);

create index if not exists mdm_notification_receivers_user_id_idx
  on public.mdm_notification_receivers(user_id, is_deleted, read_at, created_at desc);

create or replace view public.mdm_notification_inbox_v as
select
  receiver.id as receiver_id,
  receiver.user_id,
  receiver.read_at,
  receiver.created_at,
  notification.id as notification_id,
  notification.title,
  notification.content,
  notification.type,
  notification.level,
  notification.source_type,
  notification.source_id,
  notification.route_path,
  notification.external_url,
  notification.icon,
  notification.avatar
from public.mdm_notification_receivers receiver
join public.mdm_notifications notification
  on notification.id = receiver.notification_id
where receiver.is_deleted = false
  and notification.status = true;

alter table public.mdm_notifications enable row level security;
alter table public.mdm_notification_receivers enable row level security;

drop policy if exists select_mdm_notifications on public.mdm_notifications;
create policy select_mdm_notifications
  on public.mdm_notifications
  for select
  to authenticated
  using (true);

drop policy if exists all_mdm_notifications on public.mdm_notifications;
create policy all_mdm_notifications
  on public.mdm_notifications
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists select_mdm_notification_receivers on public.mdm_notification_receivers;
create policy select_mdm_notification_receivers
  on public.mdm_notification_receivers
  for select
  to authenticated
  using (true);

drop policy if exists all_mdm_notification_receivers on public.mdm_notification_receivers;
create policy all_mdm_notification_receivers
  on public.mdm_notification_receivers
  for all
  to authenticated
  using (true)
  with check (true);

insert into public.mdm_notifications (
  biz_key,
  title,
  content,
  type,
  level,
  route_path
)
values (
  'system:welcome:message-center',
  '消息中心已启用',
  '顶部消息角标、未读状态和消息中心页面已经可用，后续可继续接入审批、分发和归集等业务提醒。',
  'system',
  'info',
  '/mdm/system/message-center'
)
on conflict (biz_key) do update
set
  title = excluded.title,
  content = excluded.content,
  route_path = excluded.route_path,
  updated_at = now();

insert into public.mdm_notification_receivers (notification_id, user_id)
select notification.id, user_item.id
from public.mdm_notifications notification
cross join public.mdm_users user_item
where notification.biz_key = 'system:welcome:message-center'
on conflict (notification_id, user_id) do nothing;

notify pgrst, 'reload schema';

commit;
