import { getCurrentRbacContext } from '#/api/core/rbac-context';
import { requestClient } from '#/api/request';

import { clearRequestCache, withRequestCache } from './_cache';
import { getUserGroupListApi } from './user-group';

export interface ModelDataAuthFieldPermission {
  canRead: boolean;
  canWrite: boolean;
  fieldId: string;
}

export interface ModelDataAuthConfig {
  definitionId: string;
  fieldPermissions: ModelDataAuthFieldPermission[];
  groupIds: string[];
  id?: string;
  rowFilterSql?: string;
  status?: boolean;
}

export interface EffectiveModelDataAuth {
  authorized: boolean;
  canCreate: boolean;
  canEdit: boolean;
  fieldPermissionMap: Record<
    string,
    {
      canRead: boolean;
      canWrite: boolean;
    }
  >;
  groupIds: string[];
  hasConfig: boolean;
  isSuperAdmin: boolean;
  rowFilterSql: string;
}

function normalizeFieldPermissions(
  fieldPermissions: ModelDataAuthFieldPermission[] = [],
) {
  return fieldPermissions
    .filter((item) => item.fieldId)
    .map((item) => ({
      canRead: !!(item.canRead || item.canWrite),
      canWrite: !!item.canWrite,
      fieldId: String(item.fieldId),
    }));
}

export async function getModelDataAuthConfigApi(definitionId: string) {
  return withRequestCache(
    'mdm_model_data_auth:get',
    { definitionId },
    async (): Promise<ModelDataAuthConfig> => {
      const configResponse = await requestClient.get<any>(
        '/supabase-mdm/mdm_model_data_auth_configs',
        {
          params: {
            definition_id: `eq.${definitionId}`,
            limit: 1,
            select: '*',
          },
          responseReturn: 'raw',
        },
      );

      const [config] = Array.isArray(configResponse.data?.data)
        ? configResponse.data.data
        : [];

      if (!config?.id) {
        return {
          definitionId,
          fieldPermissions: [],
          groupIds: [],
          rowFilterSql: '',
          status: true,
        };
      }

      const fieldResponse = await requestClient.get<any>(
        '/supabase-mdm/mdm_model_data_auth_fields',
        {
          params: {
            auth_config_id: `eq.${config.id}`,
            order: 'created_at.asc',
            select: '*',
          },
          responseReturn: 'raw',
        },
      );

      const rawFieldItems = Array.isArray(fieldResponse.data?.data)
        ? fieldResponse.data.data
        : [];

      return {
        definitionId: config.definition_id,
        fieldPermissions: rawFieldItems.map((item: any) => ({
          canRead: item.can_read ?? false,
          canWrite: item.can_write ?? false,
          fieldId: String(item.field_id),
        })),
        groupIds: Array.isArray(config.group_ids)
          ? config.group_ids.map(String)
          : [],
        id: config.id,
        rowFilterSql: config.row_filter_sql ?? '',
        status: config.status ?? true,
      };
    },
  );
}

export async function saveModelDataAuthConfigApi(data: ModelDataAuthConfig) {
  const fieldPermissions = normalizeFieldPermissions(data.fieldPermissions);
  const configResponse = await requestClient.post<any>(
    '/supabase-mdm/mdm_model_data_auth_configs?on_conflict=definition_id',
    {
      definition_id: data.definitionId,
      group_ids: Array.isArray(data.groupIds) ? data.groupIds : [],
      row_filter_sql: data.rowFilterSql ?? '',
      status: data.status ?? true,
    },
    {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      responseReturn: 'raw',
    },
  );

  const [config] = Array.isArray(configResponse.data?.data)
    ? configResponse.data.data
    : [];

  if (!config?.id) {
    throw new Error('未能保存数据授权主配置');
  }

  await requestClient.delete(
    `/supabase-mdm/mdm_model_data_auth_fields?auth_config_id=eq.${config.id}`,
  );

  if (fieldPermissions.length > 0) {
    await requestClient.post('/supabase-mdm/mdm_model_data_auth_fields', [
      ...fieldPermissions.map((item) => ({
        auth_config_id: config.id,
        can_read: item.canRead,
        can_write: item.canWrite,
        field_id: item.fieldId,
      })),
    ]);
  }

  clearRequestCache('mdm_model_data_auth:get');

  return {
    definitionId: String(config.definition_id),
    fieldPermissions,
    groupIds: Array.isArray(config.group_ids)
      ? config.group_ids.map(String)
      : [],
    id: String(config.id),
    rowFilterSql: config.row_filter_sql ?? '',
    status: config.status ?? true,
  } satisfies ModelDataAuthConfig;
}

export async function getCurrentModelDataAuthApi(
  definitionId: string,
  fieldIds: string[] = [],
) {
  return withRequestCache(
    'mdm_model_data_auth:current',
    { definitionId, fieldIds },
    async (): Promise<EffectiveModelDataAuth> => {
      const [context, authConfig, userGroupResponse] = await Promise.all([
        getCurrentRbacContext(),
        getModelDataAuthConfigApi(definitionId),
        getUserGroupListApi({ pageSize: 1000 }),
      ]);

      const currentGroupIds = context.mdmUserId
        ? userGroupResponse.items
            .filter((item: any) => (item.userIds ?? []).includes(context.mdmUserId))
            .map((item: any) => String(item.id))
        : [];

      const hasConfig =
        authConfig.groupIds.length > 0 ||
        authConfig.fieldPermissions.length > 0 ||
        !!String(authConfig.rowFilterSql || '').trim();
      const matchedGroupIds =
        authConfig.groupIds.length > 0
          ? authConfig.groupIds.filter((groupId) =>
              currentGroupIds.includes(groupId),
            )
          : currentGroupIds;
      const authorized =
        context.isSuperAdmin ||
        !hasConfig ||
        authConfig.groupIds.length === 0 ||
        matchedGroupIds.length > 0;

      const fieldPermissionMap = Object.fromEntries(
        fieldIds.map((fieldId) => {
          const matched = authConfig.fieldPermissions.find(
            (item) => item.fieldId === fieldId,
          );

          if (context.isSuperAdmin || !hasConfig) {
            return [fieldId, { canRead: true, canWrite: true }];
          }

          if (!authorized) {
            return [fieldId, { canRead: false, canWrite: false }];
          }

          return [
            fieldId,
            {
              canRead: matched?.canRead ?? false,
              canWrite: matched?.canWrite ?? false,
            },
          ];
        }),
      );

      return {
        authorized,
        canCreate: context.isSuperAdmin
          ? true
          : Object.values(fieldPermissionMap).some((item) => item.canWrite),
        canEdit: context.isSuperAdmin
          ? true
          : Object.values(fieldPermissionMap).some((item) => item.canWrite),
        fieldPermissionMap,
        groupIds: matchedGroupIds,
        hasConfig,
        isSuperAdmin: context.isSuperAdmin,
        rowFilterSql: authConfig.rowFilterSql ?? '',
      };
    },
  );
}
