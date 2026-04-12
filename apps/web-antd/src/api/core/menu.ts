import { requestClient } from '#/api/request';
import { getCurrentRbacContext } from './rbac-context';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  const context = await getCurrentRbacContext();

  const response = await requestClient.get<any[]>('/supabase-mdm/rbac_menus', {
    params: {
      select: '*',
      status: 'eq.true',
      order: 'order_no.asc',
    },
  });

  const allMenus = Array.isArray(response) ? response : [];

  if (context.isSuperAdmin) {
    return allMenus;
  }

  if (context.menuIds.length === 0) {
    return [];
  }

  const menuMap = new Map(allMenus.map((item: any) => [item.id, item]));
  const visibleIds = new Set<string>();

  for (const menuId of context.menuIds) {
    let current: any = menuMap.get(menuId);
    while (current?.id) {
      if (visibleIds.has(current.id)) {
        break;
      }
      visibleIds.add(current.id);
      current = current.parent_id ? menuMap.get(current.parent_id) : null;
    }
  }

  return allMenus.filter((item: any) => visibleIds.has(item.id));
}
