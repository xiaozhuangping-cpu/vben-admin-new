alter table public.mdm_users
add column if not exists auth_email text;

comment on column public.mdm_users.auth_email is
  'Supabase Auth 登录邮箱，用于密码重置和账号绑定';
