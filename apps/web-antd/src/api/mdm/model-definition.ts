import { requestClient } from '#/api/request';

import { getThemeListApi } from './theme';

export interface ModelDefinition {
  code: string;
  description?: string;
  id?: string;
  name: string;
  rootDefinitionId?: null | string;
  sourceDefinitionId?: null | string;
  status: 'draft' | 'published' | 'unpublished';
  tableName?: string;
  themeId?: null | string;
  themeName?: string;
  updatedAt?: string;
  versionNo: number;
}

export interface ModelField {
  code: string;
  dataType: string;
  defaultValue?: string;
  definitionId: string;
  id?: string;
  isPrimary?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
  length?: number | null;
  name: string;
  precision?: number | null;
  remarks?: string;
  sort?: number;
  status?: boolean;
}

export interface ModelVersion {
  actionType?: string;
  createdAt?: string;
  createdBy?: null | string;
  id?: string;
  status?: string;
  tableName?: null | string;
  versionLabel?: string;
  versionNo?: number;
}

function parseTotal(response: any) {
  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  return response.data?.total ?? totalFromHeader;
}

export async function getModelDefinitionListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_definitions',
    {
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
    },
  );

  const rawItems = Array.isArray(response.data?.data) ? response.data.data : [];
  const { items: themes } = await getThemeListApi({ pageSize: 1000 });
  const themeMap = new Map(themes.map((theme: any) => [theme.id, theme.name]));

  const items = rawItems.map((item: any) => ({
    ...item,
    rootDefinitionId: item.root_definition_id,
    sourceDefinitionId: item.source_definition_id,
    tableName: item.table_name,
    themeId: item.theme_id,
    themeName: item.theme_id ? (themeMap.get(item.theme_id) ?? '') : '',
    updatedAt: item.updated_at ?? item.created_at ?? '',
    versionNo: item.version_no ?? 1,
  }));

  return {
    items,
    total: parseTotal(response),
  };
}

export async function getModelDefinitionDetailApi(id: string) {
  const response = await requestClient.get<any>(
    `/supabase-mdm/mdm_model_definitions?id=eq.${id}`,
    {
      params: {
        select: '*',
        limit: 1,
      },
      responseReturn: 'raw',
    },
  );

  const [item] = Array.isArray(response.data?.data) ? response.data.data : [];
  if (!item) {
    return null;
  }

  const { items: themes } = await getThemeListApi({ pageSize: 1000 });
  const themeMap = new Map(themes.map((theme: any) => [theme.id, theme.name]));

  return {
    ...item,
    rootDefinitionId: item.root_definition_id,
    sourceDefinitionId: item.source_definition_id,
    tableName: item.table_name,
    themeId: item.theme_id,
    themeName: item.theme_id ? (themeMap.get(item.theme_id) ?? '') : '',
    updatedAt: item.updated_at ?? item.created_at ?? '',
    versionNo: item.version_no ?? 1,
  };
}

export async function createModelDefinitionApi(data: ModelDefinition) {
  const payload = {
    code: data.code,
    description: data.description ?? '',
    name: data.name,
    status: 'draft',
    theme_id: data.themeId ?? null,
    version_no: data.versionNo ?? 1,
  };

  return requestClient.post('/supabase-mdm/mdm_model_definitions', payload);
}

export async function updateModelDefinitionApi(
  id: string,
  data: ModelDefinition,
) {
  const payload = {
    code: data.code,
    description: data.description ?? '',
    name: data.name,
    status: 'draft',
    theme_id: data.themeId ?? null,
  };

  return requestClient.request(
    `/supabase-mdm/mdm_model_definitions?id=eq.${id}`,
    {
      data: payload,
      method: 'PATCH',
    },
  );
}

export async function deleteModelDefinitionApi(id: string) {
  return requestClient.delete(
    `/supabase-mdm/mdm_model_definitions?id=eq.${id}`,
  );
}

export async function publishModelDefinitionApi(id: string) {
  return requestClient.post('/supabase-mdm/rpc/publish_model_definition', {
    p_definition_id: id,
  });
}

export async function unpublishModelDefinitionApi(id: string) {
  return requestClient.post('/supabase-mdm/rpc/unpublish_model_definition', {
    p_definition_id: id,
  });
}

export async function upgradeModelDefinitionApi(id: string) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/upgrade_model_definition',
    {
      p_definition_id: id,
    },
    {
      responseReturn: 'raw',
    },
  );

  return response.data;
}

export async function getModelFieldListApi(definitionId: string) {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_fields',
    {
      params: {
        definition_id: `eq.${definitionId}`,
        order: 'sort.asc,created_at.asc',
        select: '*',
      },
      responseReturn: 'raw',
    },
  );

  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => ({
    ...item,
    dataType: item.data_type,
    defaultValue: item.default_value,
    definitionId: item.definition_id,
    isPrimary: item.is_primary,
    isRequired: item.is_required,
    isUnique: item.is_unique,
  }));

  return items;
}

export async function createModelFieldApi(data: ModelField) {
  return requestClient.post('/supabase-mdm/mdm_model_fields', {
    code: data.code,
    data_type: data.dataType,
    default_value: data.defaultValue ?? null,
    definition_id: data.definitionId,
    is_primary: !!data.isPrimary,
    is_required: !!data.isRequired,
    is_unique: !!data.isUnique,
    length: data.length ?? null,
    name: data.name,
    precision: data.precision ?? null,
    remarks: data.remarks ?? '',
    sort: data.sort ?? 10,
    status: data.status ?? true,
  });
}

export async function updateModelFieldApi(id: string, data: ModelField) {
  return requestClient.request(`/supabase-mdm/mdm_model_fields?id=eq.${id}`, {
    data: {
      code: data.code,
      data_type: data.dataType,
      default_value: data.defaultValue ?? null,
      is_primary: !!data.isPrimary,
      is_required: !!data.isRequired,
      is_unique: !!data.isUnique,
      length: data.length ?? null,
      name: data.name,
      precision: data.precision ?? null,
      remarks: data.remarks ?? '',
      sort: data.sort ?? 10,
      status: data.status ?? true,
    },
    method: 'PATCH',
  });
}

export async function deleteModelFieldApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_model_fields?id=eq.${id}`);
}

export async function getModelVersionListApi(definitionId: string) {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_versions',
    {
      params: {
        definition_id: `eq.${definitionId}`,
        order: 'version_no.desc,created_at.desc',
        select: '*',
      },
      responseReturn: 'raw',
    },
  );

  return (Array.isArray(response.data?.data) ? response.data.data : []).map(
    (item: any) => ({
      ...item,
      actionType: item.action_type,
      createdAt: item.created_at,
      createdBy: item.created_by,
      tableName: item.table_name,
      versionLabel: item.version_label,
      versionNo: item.version_no,
    }),
  );
}
