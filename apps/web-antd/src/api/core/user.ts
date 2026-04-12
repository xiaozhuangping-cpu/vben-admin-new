import { getCurrentRbacContext } from './rbac-context';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const context = await getCurrentRbacContext();
  const response = context.authUser;
  const email = response?.email || response?.user_metadata?.email || '';
  const fullName =
    response?.user_metadata?.full_name ||
    response?.user_metadata?.name ||
    email ||
    'User';

  // 适配 Supabase 返回的用户属性
  return {
    userId: response.id,
    username: email,
    realName: fullName,
    avatar: response.user_metadata?.avatar_url || '',
    roles: context.roleCodes.length > 0 ? context.roleCodes : context.legacyRoleCodes,
    roleNames: context.roleNames,
    mdmUserId: context.mdmUserId,
    desc: context.mdmUserId ? 'Supabase MDM User' : 'Supabase User',
    homePath: context.homePath || '/',
  } as any;
}
