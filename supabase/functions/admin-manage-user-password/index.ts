import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const ADMIN_ROLE_CODES = new Set(['super_admin', 'admin']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function buildUsernameCandidates(email: string, metadataUsername?: string) {
  const candidates = new Set<string>();
  const trimmedEmail = email.trim();
  const trimmedMetadataUsername = (metadataUsername || '').trim();

  if (trimmedEmail) {
    candidates.add(trimmedEmail);
    const localPart = trimmedEmail.split('@')[0]?.trim();
    if (localPart) {
      candidates.add(localPart);
    }
  }

  if (trimmedMetadataUsername) {
    candidates.add(trimmedMetadataUsername);
  }

  return [...candidates];
}

async function resolveCurrentMdmUserId(
  adminClient: ReturnType<typeof createClient>,
  authUser: any,
) {
  const email = authUser?.email || authUser?.user_metadata?.email || '';
  const metadataUsername =
    authUser?.user_metadata?.username || authUser?.user_metadata?.name || '';

  const candidates = buildUsernameCandidates(email, metadataUsername);

  for (const candidate of candidates) {
    const { data, error } = await adminClient
      .from('mdm_users')
      .select('id')
      .eq('username', candidate)
      .limit(1);

    if (error) {
      throw error;
    }

    const matched = data?.[0];
    if (matched?.id) {
      return matched.id as string;
    }
  }

  return null;
}

async function isCurrentUserAdmin(
  adminClient: ReturnType<typeof createClient>,
  authUser: any,
) {
  const { data: profileRows, error: profileError } = await adminClient
    .from('profiles')
    .select('id, roles(code)')
    .eq('id', authUser.id)
    .limit(1);

  if (profileError) {
    console.warn('profiles admin lookup failed', profileError);
  }

  const legacyProfile = profileRows?.[0];
  const legacyCode = Array.isArray(legacyProfile?.roles)
    ? legacyProfile.roles.map((item: any) => item?.code).find(Boolean)
    : legacyProfile?.roles?.code;

  if (legacyCode && ADMIN_ROLE_CODES.has(legacyCode)) {
    return true;
  }

  const mdmUserId = await resolveCurrentMdmUserId(adminClient, authUser);
  if (!mdmUserId) {
    return false;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from('rbac_user_roles')
    .select('role_id,rbac_roles(code)')
    .eq('user_id', mdmUserId);

  if (roleError) {
    throw roleError;
  }

  return (roleRows || []).some((item: any) =>
    ADMIN_ROLE_CODES.has(item?.rbac_roles?.code),
  );
}

async function findAuthUserByMdmUsername(
  adminClient: ReturnType<typeof createClient>,
  username: string,
  authUserId?: string,
  authEmail?: string,
) {
  const normalizedAuthUserId = (authUserId || '').trim();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedAuthEmail = (authEmail || '').trim().toLowerCase();

  if (normalizedAuthUserId) {
    return { id: normalizedAuthUserId };
  }

  if (!normalizedUsername && !normalizedAuthEmail) {
    return null;
  }

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const matched = users.find((user) => {
      const email = user.email?.trim().toLowerCase() || '';
      const localPart = email.split('@')[0] || '';
      const metadataUsername =
        String(user.user_metadata?.username || user.user_metadata?.name || '')
          .trim()
          .toLowerCase();

      return (
        (normalizedAuthEmail && email === normalizedAuthEmail) ||
        email === normalizedUsername ||
        localPart === normalizedUsername ||
        metadataUsername === normalizedUsername
      );
    });

    if (matched) {
      return matched;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase environment is not configured' }, 500);
  }

  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user: currentUser },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !currentUser) {
      return jsonResponse({ error: '登录态无效，请重新登录后重试' }, 401);
    }

    const isAdmin = await isCurrentUserAdmin(adminClient, currentUser);
    if (!isAdmin) {
      return jsonResponse({ error: '当前账号没有管理员权限，无法修改用户密码' }, 403);
    }

    const body = await req.json();
    const mdmUserId = String(body?.mdmUserId || '').trim();
    const newPassword = String(body?.newPassword || '').trim();

    if (!mdmUserId) {
      return jsonResponse({ error: '缺少用户标识' }, 400);
    }

    if (newPassword.length < 6) {
      return jsonResponse({ error: '密码长度不能少于 6 位' }, 400);
    }

    const { data: mdmUsers, error: mdmUserError } = await adminClient
      .from('mdm_users')
      .select('id,username,nickname,auth_email,auth_user_id')
      .eq('id', mdmUserId)
      .limit(1);

    if (mdmUserError) {
      throw mdmUserError;
    }

    const mdmUser = mdmUsers?.[0];
    if (!mdmUser?.id) {
      return jsonResponse({ error: '目标用户不存在' }, 404);
    }

    const authUser = await findAuthUserByMdmUsername(
      adminClient,
      mdmUser.username,
      mdmUser.auth_user_id,
      mdmUser.auth_email,
    );
    if (!authUser?.id) {
      return jsonResponse(
        {
          error:
            '未找到与该业务用户绑定的认证账号，请先维护登录邮箱，或保证 username 与登录邮箱、邮箱前缀或 auth 元数据用户名一致',
        },
        404,
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      authUser.id,
      {
        password: newPassword,
      },
    );

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      authUserId: authUser.id,
      email: authUser.email,
      message: '密码修改成功',
      username: mdmUser.username,
    });
  } catch (error) {
    console.error('admin-manage-user-password failed', error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : '密码处理失败，请稍后重试',
      },
      500,
    );
  }
});
