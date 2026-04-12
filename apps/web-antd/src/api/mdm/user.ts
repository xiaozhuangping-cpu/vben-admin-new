import { requestClient } from '#/api/request';
import { withRequestCache } from './_cache';

export interface MdmUser {
  id?: string;
  authEmail?: string;
  authUserId?: string;
  username: string;
  nickname: string;
  org?: string;
  roleIds?: string[];
  roles?: string[];
  status: boolean;
  lastLogin?: null | string;
  createdAt?: string;
}

function normalizeUserPayload(data: MdmUser) {
  const payload = { ...data } as Record<string, any>;
  delete payload.id;
  delete payload.roleIds;
  delete payload.roles;
  delete payload.lastLogin;
  delete payload.createdAt;

  if (Object.hasOwn(payload, 'authEmail')) {
    payload.auth_email = payload.authEmail;
    delete payload.authEmail;
  }

  if (Object.hasOwn(payload, 'authUserId')) {
    payload.auth_user_id = payload.authUserId;
    delete payload.authUserId;
  }

  return payload;
}

export async function getUserListApi(params: any = {}) {
  return withRequestCache('mdm_users:list', params, async () => {
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
      authEmail: item.auth_email ?? item.authEmail ?? '',
      authUserId: item.auth_user_id ?? item.authUserId ?? '',
      roles: Array.isArray(item.roles) ? item.roles : [],
      lastLogin: item.last_login_at ?? item.lastLogin ?? '',
      createdAt: item.created_at ?? item.createdAt,
    }));

    return {
      items,
      total: response.data?.total ?? totalFromHeader,
    };
  });
}

export async function createUserApi(data: MdmUser) {
  const payload = normalizeUserPayload(data);

  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_users',
    payload,
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

export async function updateUserApi(id: string, data: MdmUser) {
  const payload = normalizeUserPayload(data);

  return requestClient.request(`/supabase-mdm/mdm_users?id=eq.${id}`, {
    data: payload,
    headers: {
      Prefer: 'return=representation',
    },
    method: 'PATCH',
    responseReturn: 'raw',
  });
}

export async function deleteUserApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_users?id=eq.${id}`);
}
