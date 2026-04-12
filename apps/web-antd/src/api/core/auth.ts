import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken?: string;
  }

  export interface RefreshTokenResult {
    access_token: string;
    refresh_token?: string;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    password?: string;
    username?: string;
  }
}

async function resolveLoginEmail(loginName?: string) {
  const identifier = (loginName || '').trim();

  if (!identifier) {
    return '';
  }

  if (identifier.includes('@')) {
    return identifier;
  }

  try {
    const response = await requestClient.get<any[]>('/supabase-mdm/mdm_users', {
      params: {
        username: `eq.${identifier}`,
        select: 'username,auth_email',
        limit: 1,
      },
    });

    const matchedUser = Array.isArray(response) ? response[0] : null;
    return matchedUser?.auth_email || identifier;
  } catch (error) {
    console.warn('Failed to resolve login email by username', error);
    return identifier;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const resolvedEmail = await resolveLoginEmail(data.username);
  const response = await requestClient.post<any>(
    '/auth/token?grant_type=password',
    {
      email: resolvedEmail,
      password: data.password,
    },
  );

  // 适配 Supabase 返回的字段格式 (access_token -> accessToken)
  return {
    ...response,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
  };
}

/**
 * 注册
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return requestClient.post('/auth/signup', {
    email: data.username,
    password: data.password,
  });
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  const refreshToken = useAccessStore().refreshToken;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!refreshToken) {
    throw new Error('Refresh token is missing.');
  }

  return baseRequestClient.post<any>(
    '/auth/token?grant_type=refresh_token',
    {
      refresh_token: refreshToken,
    },
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );
}

/**
 * 退出登录
 */
export async function logoutApi() {
  const accessToken = useAccessStore().accessToken;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return baseRequestClient.post(
    '/auth/logout',
    {},
    {
      headers: {
        apikey: anonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  );
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return [];
}
