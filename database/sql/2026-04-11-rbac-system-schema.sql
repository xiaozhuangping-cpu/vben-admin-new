-- RBAC System Schema
-- Last Updated: 2026-04-11

begin;

-- 1. 角色表
create table if not exists public.rbac_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  description text,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rbac_roles_code_key unique (code)
);

-- 2. 菜单表
create table if not exists public.rbac_menus (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.rbac_menus(id) on delete cascade,
  name text not null, -- 路由名称
  title text not null, -- 显示标题 (支持 i18n key)
  icon text,
  path text not null,
  component text,
  redirect text,
  order_no integer not null default 0,
  is_link boolean not null default false,
  hide_menu boolean not null default false,
  keep_alive boolean not null default true,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  constraint rbac_menus_name_key unique (name)
);

-- 3. 用户与角色关联表 (多对多)
create table if not exists public.rbac_user_roles (
  user_id uuid not null,
  role_id uuid not null references public.rbac_roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- 显式添加外键约束，以防表已存在但缺少约束
do $$
begin
  if not exists (select 1 from information_schema.constraint_column_usage where table_name = 'rbac_user_roles' and constraint_name = 'rbac_user_roles_user_id_fkey') then
    alter table public.rbac_user_roles add constraint rbac_user_roles_user_id_fkey foreign key (user_id) references public.mdm_users(id) on delete cascade;
  end if;
end $$;

-- 4. 角色与菜单关联表 (用于权限控制)
create table if not exists public.rbac_role_menus (
  role_id uuid not null references public.rbac_roles(id) on delete cascade,
  menu_id uuid not null references public.rbac_menus(id) on delete cascade,
  primary key (role_id, menu_id)
);

-- 启用 RLS
alter table public.rbac_roles enable row level security;
alter table public.rbac_menus enable row level security;
alter table public.rbac_user_roles enable row level security;
alter table public.rbac_role_menus enable row level security;

-- 简单的 RLS 策略 (允许所有已登录用户读取)
drop policy if exists select_rbac_roles on public.rbac_roles;
create policy select_rbac_roles on public.rbac_roles for select to authenticated using (true);

drop policy if exists select_rbac_menus on public.rbac_menus;
create policy select_rbac_menus on public.rbac_menus for select to authenticated using (true);

drop policy if exists select_rbac_user_roles on public.rbac_user_roles;
create policy select_rbac_user_roles on public.rbac_user_roles for select to authenticated using (true);

drop policy if exists select_rbac_role_menus on public.rbac_role_menus;
create policy select_rbac_role_menus on public.rbac_role_menus for select to authenticated using (true);

-- 管理员权限 (这里假设超级管理员 code 为 'super_admin')
-- 注意：实际复杂的 RLS 需要关联权限表，这里先简化为允许所有 authenticated 可操作以保证开发顺利
drop policy if exists all_rbac_roles on public.rbac_roles;
create policy all_rbac_roles on public.rbac_roles for all to authenticated using (true) with check (true);

drop policy if exists all_rbac_menus on public.rbac_menus;
create policy all_rbac_menus on public.rbac_menus for all to authenticated using (true) with check (true);

drop policy if exists all_rbac_user_roles on public.rbac_user_roles;
create policy all_rbac_user_roles on public.rbac_user_roles for all to authenticated using (true) with check (true);

drop policy if exists all_rbac_role_menus on public.rbac_role_menus;
create policy all_rbac_role_menus on public.rbac_role_menus for all to authenticated using (true) with check (true);

-- 5. 插入初始数据 (Mock 数据迁移)
insert into public.rbac_roles (name, code, description) values
('超级管理员', 'super_admin', '系统初始最高权限角色'),
('普通用户', 'default_user', '基础业务权限角色')
on conflict (code) do nothing;

-- 插入一级菜单
with dashboard_id as (
  insert into public.rbac_menus (name, title, icon, path, order_no)
  values ('Dashboard', '仪表盘', 'lucide:layout-dashboard', '/dashboard', 10)
  on conflict (name) do update set title = excluded.title returning id
),
mdm_model_id as (
  insert into public.rbac_menus (name, title, icon, path, order_no)
  values ('MdmModel', '主数据建模', 'lucide:database', '/mdm/model', 100)
  on conflict (name) do update set title = excluded.title returning id
),
mdm_system_id as (
  insert into public.rbac_menus (name, title, icon, path, order_no)
  values ('MdmSystem', '系统管理', 'lucide:settings', '/mdm/system', 130)
  on conflict (name) do update set title = excluded.title returning id
)
-- 插入二级菜单
insert into public.rbac_menus (parent_id, name, title, icon, path, order_no)
select id, 'Overview', '概览', 'lucide:cpu', '/dashboard/overview', 1 from dashboard_id union all
select id, 'Workspace', '工作台', 'lucide:home', '/dashboard/workspace', 2 from dashboard_id union all
select id, 'MdmTheme', '数据主题', null, '/mdm/model/theme', 1 from mdm_model_id union all
select id, 'MdmDefinition', '模型定义', null, '/mdm/model/definition', 2 from mdm_model_id union all
select id, 'MdmUser', '人员账号', null, '/mdm/system/user', 1 from mdm_system_id union all
select id, 'MdmRole', '角色权限', null, '/mdm/system/role', 2 from mdm_system_id union all
select id, 'MdmMenu', '菜单管理', null, '/mdm/system/menu', 3 from mdm_system_id
on conflict (name) do update set title = excluded.title;

-- 刷新 PostgREST 缓存，确保新关联可见
notify pgrst, 'reload schema';

commit;
