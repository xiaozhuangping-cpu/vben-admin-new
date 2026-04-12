alter table public.mdm_users
add column if not exists auth_user_id uuid;

comment on column public.mdm_users.auth_user_id is
  'Supabase Auth 用户ID，用于稳定绑定认证账号';

create unique index if not exists mdm_users_auth_user_id_key
  on public.mdm_users(auth_user_id)
  where auth_user_id is not null;
