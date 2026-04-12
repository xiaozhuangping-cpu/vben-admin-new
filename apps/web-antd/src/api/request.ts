/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    const hadAccessChecked = accessStore.isAccessChecked;
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);
    accessStore.setIsAccessChecked(false);
    if (preferences.app.loginExpiredMode === 'modal' && hadAccessChecked) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data?.access_token;
    const newRefreshToken = resp.data?.refresh_token;

    if (!newToken) {
      throw new Error('Failed to refresh access token.');
    }

    accessStore.setAccessToken(newToken);
    if (newRefreshToken) {
      accessStore.setRefreshToken(newRefreshToken);
    }
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      const requestUrl = `${config.url || ''}`;

      // Bypass the local Vite proxy for Supabase endpoints to avoid intermittent
      // 502 errors from the dev proxy layer.
      if (SUPABASE_URL && requestUrl.startsWith('/supabase-mdm/')) {
        config.baseURL = `${SUPABASE_URL}/rest/v1`;
        config.url = requestUrl.replace(/^\/supabase-mdm/, '');
      } else if (SUPABASE_URL && requestUrl.startsWith('/auth/')) {
        config.baseURL = `${SUPABASE_URL}/auth/v1`;
        config.url = requestUrl.replace(/^\/auth/, '');
      }

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;

      // Supabase apikey header
      if (SUPABASE_ANON_KEY) {
        config.headers.apikey = SUPABASE_ANON_KEY;
      }

      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { data, status, headers } = response;
      // 处理 201 Created 或 204 No Content 且无数据的情况
      if ((status === 201 || status === 204) && !data) {
        response.data = {
          code: 0,
          data: {},
          message: 'ok',
        };
        return response;
      }

      // 提取 Supabase 的总数 (从 Content-Range 响应头中)
      const contentRange =
        headers?.['content-range'] || headers?.['Content-Range'];
      let total: number | undefined;
      if (contentRange) {
        const totalStr = contentRange.split('/').pop();
        if (totalStr) {
          total = Number.parseInt(totalStr, 10);
        }
      }

      if (data && typeof data === 'object' && !Object.hasOwn(data, 'code')) {
        // 如果没有 code 字段，自动包裹为成功结构 (适配 Supabase)
        response.data = {
          code: 0,
          data,
          message: 'ok',
          total, // 将总数注入到包裹层
        };
      } else if (
        data &&
        typeof data === 'object' &&
        Object.hasOwn(data, 'code')
      ) {
        // 如果已经有包裹层，也尝试注入总数
        (response.data as any).total = total || (response.data as any).total;
      }
      return response;
    },
  });

  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // Supabase 在 token 过期时可能返回 403 bad_jwt 或 {"message": "JWT expired"} 等，
  // 这里统一转成 401，交给后面的认证拦截器走静默刷新或重新登录逻辑。
  client.addResponseInterceptor({
    rejected: async (error) => {
      const response = error?.response;
      const responseData = response?.data;
      
      // 捕获 Supabase 常见的 JWT 失效错误
      const isJwtError = 
        response?.status === 403 && (
          responseData?.error_code === 'bad_jwt' || 
          responseData?.message?.includes('JWT') ||
          responseData?.msg?.includes('JWT')
        );

      if (isJwtError) {
        response.status = 401;
      }
      throw error;
    },
  });

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      message.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
