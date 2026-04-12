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

    if (data?.[0]?.id) {
      return data[0].id as string;
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

  let createdAuthUserId: null | string = null;

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
      return jsonResponse({ error: '当前账号没有管理员权限，无法创建用户' }, 403);
    }

    const body = await req.json();
    const authEmail = String(body?.authEmail || '').trim().toLowerCase();
    const nickname = String(body?.nickname || '').trim();
    const org = String(body?.org || '').trim();
    const password = String(body?.password || '').trim();
    const roleIds = Array.isArray(body?.roleIds)
      ? body.roleIds.filter((item: unknown): item is string => Boolean(item))
      : [];
    const status = Boolean(body?.status ?? true);
    const username = String(body?.username || '').trim();

    if (!username) {
      return jsonResponse({ error: '用户名不能为空' }, 400);
    }

    if (!nickname) {
      return jsonResponse({ error: '姓名不能为空' }, 400);
    }

    if (!authEmail) {
      return jsonResponse({ error: '登录邮箱不能为空' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: '登录密码长度不能少于 6 位' }, 400);
    }

    const { data: duplicatedUsers, error: duplicatedUserError } = await adminClient
      .from('mdm_users')
      .select('id')
      .or(`username.eq.${username},auth_email.eq.${authEmail}`)
      .limit(1);

    if (duplicatedUserError) {
      throw duplicatedUserError;
    }

    if ((duplicatedUsers || []).length > 0) {
      return jsonResponse({ error: '用户名或登录邮箱已存在' }, 409);
    }

    const { data: createdAuthUser, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        password,
        user_metadata: {
          name: nickname,
          username,
        },
      });

    if (createAuthError || !createdAuthUser?.user?.id) {
      throw createAuthError || new Error('认证账号创建失败');
    }

    createdAuthUserId = createdAuthUser.user.id;

    const { data: mdmUser, error: createMdmError } = await adminClient
      .from('mdm_users')
      .insert({
        auth_email: authEmail,
        auth_user_id: createdAuthUserId,
        nickname,
        org: org || null,
        roles: [],
        status,
        username,
      })
      .select('*')
      .single();

    if (createMdmError || !mdmUser?.id) {
      throw createMdmError || new Error('业务用户创建失败');
    }

    if (roleIds.length > 0) {
      const { error: roleError } = await adminClient.from('rbac_user_roles').insert(
        roleIds.map((roleId) => ({
          role_id: roleId,
          user_id: mdmUser.id,
        })),
      );

      if (roleError) {
        throw roleError;
      }
    }

    return jsonResponse({
      authUser: {
        email: createdAuthUser.user.email,
        id: createdAuthUser.user.id,
      },
      mdmUser,
      message: '用户创建成功',
    });
  } catch (error) {
    if (createdAuthUserId) {
      await adminClient.auth.admin.deleteUser(createdAuthUserId).catch((rollbackError) => {
        console.error('rollback auth user failed', rollbackError);
      });
    }

    console.error('admin-create-user failed', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : '创建用户失败，请稍后重试',
      },
      500,
    );
  }
});
