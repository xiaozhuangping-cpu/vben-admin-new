import { requestClient } from '#/api/request';
import { preferences } from '@vben/preferences';

interface CurrentRbacContext {
  authUser: any;
  isSuperAdmin: boolean;
  legacyRoleCodes: string[];
  mdmUserId: null | string;
  menuIds: string[];
  roleCodes: string[];
  roleNames: string[];
  groupCodes: string[];
  groupNames: string[];
  nickname?: string;
  lastLogin?: string;
  createdAt?: string;
  homePath?: string;
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

let currentRbacContextPromise: null | Promise<CurrentRbacContext> = null;

async function loadCurrentRbacContext(): Promise<CurrentRbacContext> {
  const authUser = await requestClient.get<any>('/auth/user');
  const email = authUser?.email || authUser?.user_metadata?.email || '';
  const metadataUsername =
    authUser?.user_metadata?.username || authUser?.user_metadata?.name || '';
  const legacyRoleCodes: string[] = [];

  const usernameCandidates = buildUsernameCandidates(email, metadataUsername);
  let mdmUserId: null | string = null;
  let roleHomePath: null | string = null;
  let matchedUser: any = null;

  for (const candidate of usernameCandidates) {
    const userResp = await requestClient.get<any[]>('/supabase-mdm/mdm_users', {
      params: {
        username: `eq.${candidate}`,
        select: 'id,username,nickname,status,last_login_at,created_at',
        limit: 1,
      },
    });
    matchedUser = userResp?.[0];
    if (matchedUser?.id) {
      mdmUserId = matchedUser.id;
      break;
    }
  }

  const finalHomePath = preferences.app.defaultHomePath;

  if (!mdmUserId) {
    return {
      authUser,
      isSuperAdmin: false,
      legacyRoleCodes,
      mdmUserId: null,
      menuIds: [],
      roleCodes: [],
      roleNames: [],
      groupCodes: [],
      groupNames: [],
      homePath: finalHomePath,
    };
  }

  const userRoleResp = await requestClient.get<any[]>(
    '/supabase-mdm/rbac_user_roles',
    {
      params: {
        user_id: `eq.${mdmUserId}`,
        select: 'role_id,rbac_roles(code,name,home_path)',
      },
    },
  );

  const roleRows = Array.isArray(userRoleResp) ? userRoleResp : [];
  const roleCodes = roleRows
    .map((item: any) => item.rbac_roles?.code)
    .filter((item: any): item is string => Boolean(item));
  const roleNames = roleRows
    .map((item: any) => item.rbac_roles?.name)
    .filter((item: any): item is string => Boolean(item));
  const roleIds = roleRows
    .map((item: any) => item.role_id)
    .filter((item: any): item is string => Boolean(item));
  roleHomePath =
    roleRows.find((item: any) => item.rbac_roles?.home_path)?.rbac_roles
      ?.home_path || null;
  const isSuperAdmin = roleCodes.includes('super_admin');
  const resolvedHomePath = roleHomePath || preferences.app.defaultHomePath;

  if (roleIds.length === 0) {
    return {
      authUser,
      isSuperAdmin,
      legacyRoleCodes,
      mdmUserId,
      menuIds: [],
      roleCodes,
      roleNames,
      groupCodes: [],
      groupNames: [],
      homePath: resolvedHomePath,
    };
  }

  const roleMenuResp = await requestClient.get<any[]>(
    '/supabase-mdm/rbac_role_menus',
    {
      params: {
        role_id: `in.(${roleIds.join(',')})`,
        select: 'menu_id',
      },
    },
  );

  const menuIds = Array.from(
    new Set(
      (Array.isArray(roleMenuResp) ? roleMenuResp : [])
        .map((item: any) => item.menu_id)
        .filter((item: any): item is string => Boolean(item)),
    ),
  );

  const userGroupResp = await requestClient.get<any[]>(
    '/supabase-mdm/mdm_user_groups',
    {
      params: {
        user_ids: `cs.{${mdmUserId}}`,
        select: 'code,name',
      },
    },
  );

  const groupRows = Array.isArray(userGroupResp) ? userGroupResp : [];
  const groupCodes = groupRows.map((item: any) => item.code);
  const groupNames = groupRows.map((item: any) => item.name);

  return {
    authUser,
    isSuperAdmin,
    legacyRoleCodes,
    mdmUserId,
    menuIds,
    roleCodes,
    roleNames,
    groupCodes,
    groupNames,
    nickname: matchedUser?.nickname || null,
    lastLogin: matchedUser?.last_login_at || null,
    createdAt: matchedUser?.created_at || null,
    homePath: resolvedHomePath,
  };
}

export async function getCurrentRbacContext(): Promise<CurrentRbacContext> {
  if (!currentRbacContextPromise) {
    currentRbacContextPromise = loadCurrentRbacContext().catch((error) => {
      currentRbacContextPromise = null;
      throw error;
    });
  }

  return currentRbacContextPromise;
}

export function clearCurrentRbacContextCache() {
  currentRbacContextPromise = null;
}
