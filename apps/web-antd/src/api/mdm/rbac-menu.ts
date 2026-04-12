import { requestClient } from '#/api/request';

/**
 * 获取所有菜单列表 (平坦结构)
 */
export async function getMenuListApi() {
  return requestClient.get<any[]>('/supabase-mdm/rbac_menus', {
    params: {
      select: '*',
      order: 'order_no.asc'
    }
  });
}

/**
 * 创建菜单
 */
export async function createMenuApi(data: any) {
  const payload = { ...data };
  delete payload.id;
  return requestClient.post('/supabase-mdm/rbac_menus', payload);
}

/**
 * 更新菜单
 */
export async function updateMenuApi(id: string, data: any) {
  const payload = { ...data };
  delete payload.id;
  return requestClient.request(`/supabase-mdm/rbac_menus?id=eq.${id}`, {
    data: payload,
    method: 'PATCH',
  });
}

/**
 * 删除菜单
 */
export async function deleteMenuApi(id: string) {
  return requestClient.delete(`/supabase-mdm/rbac_menus?id=eq.${id}`);
}
