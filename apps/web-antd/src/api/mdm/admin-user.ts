import { useAccessStore } from '@vben/stores';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CREATE_USER_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-create-user`;

function formatAuthorization(token: string) {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

async function parseFunctionResponse(response: Response) {
  const rawText = await response.text().catch(() => '');

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      message: rawText,
    };
  }
}

export interface CreateManagedUserPayload {
  authEmail: string;
  nickname: string;
  org?: string;
  password: string;
  roleIds?: string[];
  status: boolean;
  username: string;
}

export async function createManagedUserApi(payload: CreateManagedUserPayload) {
  const accessToken = useAccessStore().accessToken;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 环境变量缺失，无法创建用户');
  }

  if (!accessToken) {
    throw new Error('当前登录态已失效，请重新登录后重试');
  }

  const response = await fetch(CREATE_USER_FUNCTION_URL, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: formatAuthorization(accessToken),
    },
    method: 'POST',
  });

  const result = await parseFunctionResponse(response);

  if (!response.ok) {
    throw new Error(result?.error || result?.message || '创建用户失败');
  }

  return result;
}
