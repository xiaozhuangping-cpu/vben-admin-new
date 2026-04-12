import { requestClient } from '#/api/request';

import { getRoleListApi } from './rbac-role';

export async function getRbacUserListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;

  const [response, roleResp] = await Promise.all([
    requestClient.get<any>('/supabase-mdm/mdm_users', {
      params: {
        ...rest,
        select: '*,rbac_user_roles(role_id)',
        order: rest.order ?? 'updated_at.desc,created_at.desc',
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
      headers: {
        Prefer: 'count=exact',
      },
      responseReturn: 'raw',
    }),
    getRoleListApi({ pageSize: 1000 }),
  ]);

  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;

  const roleItems = Array.isArray(roleResp)
    ? roleResp
    : Array.isArray(roleResp?.data)
      ? roleResp.data
      : [];

  const roleMap = new Map(
    roleItems.map((role: any) => [role.id, role.name]),
  );

  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => {
    const roleIds = (item.rbac_user_roles || []).map((ur: any) => ur.role_id);

    return {
      ...item,
      authEmail: item.auth_email ?? item.authEmail ?? '',
      authUserId: item.auth_user_id ?? item.authUserId ?? '',
      roleIds,
      roles: roleIds.map((roleId: string) => roleMap.get(roleId) ?? roleId),
      lastLogin: item.last_login_at ?? item.lastLogin ?? '',
      createdAt: item.created_at ?? item.createdAt,
    };
  });

  return {
    items,
    total: response.data?.total ?? totalFromHeader,
  };
}

/**
 * 更新用户角色
 */
export async function updateUserRolesApi(userId: string, roleIds: string[]) {
  // 1. 删除旧关联
  await requestClient.delete(`/supabase-mdm/rbac_user_roles?user_id=eq.${userId}`);
  
  // 2. 插入新关联
  if (roleIds.length === 0) return;
  
  const payload = roleIds.map(roleId => ({
    user_id: userId,
    role_id: roleId
  }));
  
  return requestClient.post('/supabase-mdm/rbac_user_roles', payload);
}

/**
 * 删除用户
 */
export async function deleteUserApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_users?id=eq.${id}`);
}
