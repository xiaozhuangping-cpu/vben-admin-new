import { requestClient } from '#/api/request';

/**
 * 获取角色列表
 */
export async function getRoleListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>('/supabase-mdm/rbac_roles', {
    params: {
      ...rest,
      select: '*',
      order: rest.order ?? 'updated_at.desc,created_at.desc',
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
    headers: {
      Prefer: 'count=exact',
    },
    responseReturn: 'raw',
  });

  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;

  return {
    data: Array.isArray(response.data?.data) ? response.data.data : [],
    total: response.data?.total ?? totalFromHeader,
  };
}

/**
 * 创建角色
 */
export async function createRoleApi(data: any) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rbac_roles',
    data,
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  return Array.isArray(response.data?.data)
    ? response.data.data[0]
    : response.data;
}

/**
 * 更新角色
 */
export async function updateRoleApi(id: string, data: any) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/rbac_roles?id=eq.${id}`,
    {
      data,
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  return Array.isArray(response.data?.data)
    ? response.data.data[0]
    : response.data;
}

/**
 * 删除角色
 */
export async function deleteRoleApi(id: string) {
  return requestClient.delete(`/supabase-mdm/rbac_roles?id=eq.${id}`);
}

/**
 * 获取角色关联的菜单ID列表
 */
export async function getRoleMenusApi(roleId: string) {
  const resp = await requestClient.get<any[]>('/supabase-mdm/rbac_role_menus', {
    params: {
      role_id: `eq.${roleId}`,
      select: 'menu_id',
    },
  });
  return Array.isArray(resp) ? resp.map((item: any) => item.menu_id) : [];
}

/**
 * 设置角色关联的菜单
 */
export async function setRoleMenusApi(roleId: string, menuIds: string[]) {
  // 1. 先删除旧的
  await requestClient.delete(`/supabase-mdm/rbac_role_menus?role_id=eq.${roleId}`);
  
  // 2. 插入新的
  if (menuIds.length === 0) return;
  
  const payload = menuIds.map(id => ({
    role_id: roleId,
    menu_id: id
  }));
  
  return requestClient.post('/supabase-mdm/rbac_role_menus', payload);
}
