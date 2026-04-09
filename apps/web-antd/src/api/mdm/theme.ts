import { requestClient } from '#/api/request';

import { getUserGroupListApi } from './user-group';

export interface Theme {
  id?: string;
  name: string;
  code: string;
  order: number;
  description?: string;
  userGroupId?: string;
  userGroupName?: string;
}

export async function getThemeListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>('/supabase-mdm/mdm_themes', {
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
  const rawItems = Array.isArray(response.data?.data) ? response.data.data : [];
  const { items: userGroups } = await getUserGroupListApi({ pageSize: 1000 });
  const userGroupMap = new Map(
    userGroups.map((group: any) => [group.id, group.name]),
  );

  // 映射数据库字段
  const items = rawItems.map((item: any) => ({
    ...item,
    userGroupId: item.user_group_id,
    userGroupName: item.user_group_id
      ? (userGroupMap.get(item.user_group_id) ?? '')
      : '',
  }));

  return {
    items,
    total: response.data?.total ?? totalFromHeader,
  };
}

export async function createThemeApi(data: Theme) {
  const payload = { ...data } as Record<string, any>;
  const userGroupId = payload.userGroupId;
  delete payload.userGroupId;
  delete payload.userGroupName;
  return requestClient.post('/supabase-mdm/mdm_themes', {
    ...payload,
    user_group_id: userGroupId || null,
  });
}

export async function updateThemeApi(id: string, data: Theme) {
  const payload = { ...data } as Record<string, any>;
  const userGroupId = payload.userGroupId;
  delete payload.userGroupId;
  delete payload.userGroupName;
  return requestClient.request(`/supabase-mdm/mdm_themes?id=eq.${id}`, {
    data: {
      ...payload,
      user_group_id: userGroupId || null,
    },
    method: 'PATCH',
  });
}

export async function deleteThemeApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_themes?id=eq.${id}`);
}
