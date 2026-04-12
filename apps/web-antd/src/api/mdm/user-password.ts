import { useAccessStore } from '@vben/stores';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PASSWORD_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-manage-user-password`;

function formatAuthorization(token: string) {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

interface ManageUserPasswordPayload {
  mdmUserId: string;
  newPassword: string;
}

export async function manageUserPasswordApi(
  payload: ManageUserPasswordPayload,
) {
  const accessToken = useAccessStore().accessToken;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 环境变量缺失，无法调用密码服务');
  }

  if (!accessToken) {
    throw new Error('当前登录态已失效，请重新登录后重试');
  }

  const response = await fetch(PASSWORD_FUNCTION_URL, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: formatAuthorization(accessToken),
    },
    method: 'POST',
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || result?.message || '密码处理失败');
  }

  return result;
}
