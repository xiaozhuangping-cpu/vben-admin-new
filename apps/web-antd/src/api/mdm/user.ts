import { requestClient } from '#/api/request';

export interface MdmUser {
  id?: string;
  username: string;
  nickname: string;
  org?: string;
  roles?: string[];
  status: boolean;
  lastLogin?: null | string;
  createdAt?: string;
}

export async function getUserListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>('/supabase-mdm/mdm_users', {
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

  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => ({
    ...item,
    roles: Array.isArray(item.roles) ? item.roles : [],
    lastLogin: item.last_login_at ?? item.lastLogin ?? '',
    createdAt: item.created_at ?? item.createdAt,
  }));

  return {
    items,
    total: response.data?.total ?? totalFromHeader,
  };
}

export async function createUserApi(data: MdmUser) {
  const payload = { ...data } as Record<string, any>;
  delete payload.id;
  delete payload.lastLogin;
  delete payload.createdAt;

  return requestClient.post('/supabase-mdm/mdm_users', {
    ...payload,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
  });
}

export async function updateUserApi(id: string, data: MdmUser) {
  const payload = { ...data } as Record<string, any>;
  delete payload.id;
  delete payload.lastLogin;
  delete payload.createdAt;

  return requestClient.request(`/supabase-mdm/mdm_users?id=eq.${id}`, {
    data: {
      ...payload,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    },
    method: 'PATCH',
  });
}

export async function deleteUserApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_users?id=eq.${id}`);
}
