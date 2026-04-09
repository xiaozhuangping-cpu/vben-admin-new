import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const response = await requestClient.get<any>('/auth/user');
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
    roles: ['super'], // 默认给予 super 权限
    desc: 'Supabase User',
    homePath: '/',
  } as any;
}
