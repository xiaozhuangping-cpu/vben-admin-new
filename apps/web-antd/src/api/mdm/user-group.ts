import { requestClient } from '#/api/request';

import { getAssignableUserListApi } from './user-member';

export interface UserGroup {
  id?: string;
  name: string;
  code: string;
  description?: string;
  status: boolean;
  userIds?: string[];
  userNames?: string[];
  createTime?: string;
}

export async function getUserGroupListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_user_groups',
    {
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
    },
  );

  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  const assignableUsers = await getAssignableUserListApi();
  const userNameMap = new Map(
    assignableUsers.map((user) => [
      String(user.id),
      user.nickname || user.label,
    ]),
  );
  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => {
    const userIds = Array.isArray(item.user_ids)
      ? item.user_ids.map(String)
      : [];

    return {
      ...item,
      createTime: item.created_at ?? item.createTime,
      userIds,
      userNames: userIds
        .map((id: string) => userNameMap.get(id))
        .filter(Boolean),
    };
  });

  return {
    items,
    total: response.data?.total ?? totalFromHeader,
  };
}

export async function createUserGroupApi(data: UserGroup) {
  const payload = { ...data } as Record<string, any>;
  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
  const sanitizedPayload = {
    code: payload.code,
    description: payload.description ?? '',
    name: payload.name,
    status: payload.status,
  };

  return requestClient.post('/supabase-mdm/mdm_user_groups', {
    ...sanitizedPayload,
    user_ids: userIds,
  });
}

export async function updateUserGroupApi(id: string, data: UserGroup) {
  const payload = { ...data } as Record<string, any>;
  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
  const sanitizedPayload = {
    code: payload.code,
    description: payload.description ?? '',
    name: payload.name,
    status: payload.status,
  };

  return requestClient.request(`/supabase-mdm/mdm_user_groups?id=eq.${id}`, {
    data: {
      ...sanitizedPayload,
      user_ids: userIds,
    },
    method: 'PATCH',
  });
}

export async function deleteUserGroupApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_user_groups?id=eq.${id}`);
}
