import { getCurrentRbacContext } from './rbac-context';
import { updateUserApi } from '../mdm/user';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const context = await getCurrentRbacContext();
  const response = context.authUser;
  const email = response?.email || response?.user_metadata?.email || '';
  const fullName =
    context.nickname ||
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
    groupCodes: context.groupCodes,
    groupNames: context.groupNames,
    lastLogin: context.lastLogin ? new Date(context.lastLogin).toLocaleString() : '',
    createdAt: context.createdAt ? new Date(context.createdAt).toLocaleString() : '',
    mdmUserId: context.mdmUserId,
    desc: context.mdmUserId ? 'Supabase MDM User' : 'Supabase User',
    homePath: context.homePath || '/',
  } as any;
}

/**
 * 更新个人信息
 */
export async function updateProfileApi(data: any) {
  const context = await getCurrentRbacContext();
  if (!context.mdmUserId) {
    throw new Error('MDM User ID not found');
  }
  
  // 映射字段名回到数据库字段
  const payload = {
    nickname: data.realName,
  };
  
  return updateUserApi(context.mdmUserId, payload as any);
}
