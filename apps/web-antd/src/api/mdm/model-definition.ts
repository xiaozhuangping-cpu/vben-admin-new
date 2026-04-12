import { requestClient } from '#/api/request';
import { withRequestCache } from './_cache';

import { getNumberingSegmentListApi } from './numbering';
import { getThemeListApi } from './theme';
import { getUserGroupListApi } from './user-group';
import { getValidationRuleListApi } from './validation-rule';

export interface ModelDefinition {
  auditGroupId?: null | string;
  auditGroupName?: string;
  code: string;
  description?: string;
  enabled?: boolean;
  groupId?: null | string;
  groupName?: string;
  id?: string;
  modelType: string;
  modelTypeLabel?: string;
  name: string;
  needAudit?: boolean;
  remark?: string;
  rootDefinitionId?: null | string;
  sortNo?: number;
  sourceDefinitionId?: null | string;
  status: 'draft' | 'history' | 'invalid' | 'published' | 'revised';
  tableName?: string;
  themeId?: null | string;
  themeName?: string;
  updatedAt?: string;
  updatedBy?: null | string;
  versionNo: number;
}

export interface ModelField {
  attachmentMode?: null | string;
  code: string;
  dataType: string;
  defaultValue?: string;
  definitionId: string;
  definitionStatus?: string;
  dictCode?: null | string;
  dictName?: string;
  id?: string;
  isCodeField?: boolean;
  isMultiple?: boolean;
  isPrimary?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
  length?: null | number;
  name: string;
  numberingSegmentId?: null | string;
  numberingSegmentName?: string;
  precision?: null | number;
  relatedDefinitionCode?: string;
  relatedDefinitionId?: null | string;
  relatedDefinitionName?: string;
  remarks?: string;
  sort?: number;
  status?: boolean;
  systemField?: boolean;
  validationRuleId?: null | string;
  validationRuleName?: string;
}

export const SYSTEM_MODEL_FIELD_CODES = [
  'id',
  'status',
  'created_by',
  'created_by_name',
  'updated_by',
  'updated_by_name',
  'created_at',
  'updated_at',
] as const;

function isSystemModelFieldCode(code?: string) {
  return SYSTEM_MODEL_FIELD_CODES.includes((code ?? '') as any);
}

const SYSTEM_MODEL_FIELD_META: Record<
  string,
  { name: string; remarks: string }
> = {
  id: { name: '\u4E3B\u952E', remarks: '\u7CFB\u7EDF\u4E3B\u952E' },
  status: {
    name: '\u72B6\u6001',
    remarks:
      '\u5305\u542B\uFF1A\u8349\u7A3F\u3001\u5F85\u5BA1\u6838\u3001\u5BA1\u6838\u4E0D\u901A\u8FC7\u3001\u5DF2\u751F\u6548\u3001\u5931\u6548',
  },
  created_by: {
    name: '\u521B\u5EFA\u4EBAid',
    remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u4EBAid',
  },
  created_by_name: {
    name: '\u521B\u5EFA\u4EBA',
    remarks:
      '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u4EBA\u59D3\u540D',
  },
  created_at: {
    name: '\u521B\u5EFA\u65F6\u95F4',
    remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u65F6\u95F4',
  },
  updated_by: {
    name: '\u4FEE\u6539\u4EBAid',
    remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u4FEE\u6539\u4EBAid',
  },
  updated_by_name: {
    name: '\u4FEE\u6539\u4EBA',
    remarks:
      '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u4FEE\u6539\u4EBA\u59D3\u540D',
  },
  updated_at: {
    name: '\u4FEE\u6539\u65F6\u95F4',
    remarks:
      '\u8BB0\u5F55\u4E3B\u6570\u636E\u6700\u540E\u4E00\u6B21\u4FEE\u6539\u65F6\u95F4',
  },
};

function getSystemModelFieldMeta(code?: string) {
  return code ? (SYSTEM_MODEL_FIELD_META[code] ?? null) : null;
}

function normalizeAttachmentMode(
  attachmentMode?: null | string,
  isMultiple?: boolean,
) {
  if (attachmentMode === 'single' || attachmentMode === 'multiple') {
    return attachmentMode;
  }
  return isMultiple ? 'multiple' : 'single';
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

function buildInFilter(values: string[]) {
  if (values.length === 0) {
    return '';
  }
  const sanitized = values
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(',');
  return `in.(${sanitized})`;
}

async function fetchDictNameMap(codes: string[]) {
  if (codes.length === 0) {
    return new Map<string, string>();
  }
  const response = await requestClient.get<any>('/supabase-mdm/mdm_dicts', {
    params: {
      code: buildInFilter(codes),
      select: 'code,name',
      limit: codes.length,
    },
    responseReturn: 'raw',
  });
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map(rows.map((item: any) => [item.code, item.name]));
}

async function fetchDefinitionSummaryMap(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, { code: string; name: string }>();
  }
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_definitions',
    {
      params: {
        id: buildInFilter(ids),
        select: 'id,code,name',
        limit: ids.length,
      },
      responseReturn: 'raw',
    },
  );
  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map(
    rows.map((item: any) => [item.id, { code: item.code, name: item.name }]),
  );
}

async function resolveModelDefinitionLookups() {
  const [{ items: themes }, { items: userGroups }] = await Promise.all([
    getThemeListApi({ pageSize: 1000 }),
    getUserGroupListApi({ pageSize: 1000 }),
  ]);

  return {
    themeMap: new Map<string, any>(
      themes.map((theme: any) => [String(theme.id), theme]),
    ),
    userGroupMap: new Map<string, string>(
      userGroups.map((group: any) => [String(group.id), group.name]),
    ),
  };
}

function mapModelDefinition(
  item: any,
  lookups: {
    themeMap: Map<string, any>;
    userGroupMap: Map<string, string>;
  },
) {
  const theme = item.theme_id ? lookups.themeMap.get(item.theme_id) : null;

  return {
    ...item,
    auditGroupId: item.audit_group_id,
    auditGroupName: item.audit_group_id
      ? (lookups.userGroupMap.get(item.audit_group_id) ?? '')
      : '',
    enabled: item.enabled ?? true,
    groupId: item.group_id,
    groupName: item.group_id
      ? (lookups.userGroupMap.get(item.group_id) ?? '')
      : '',
    modelType: item.model_type ?? 'normal',
    modelTypeLabel:
      item.model_type === 'composite'
        ? '\u7EC4\u5408\u6A21\u578B'
        : '\u666E\u901A\u6A21\u578B',
    needAudit: item.need_audit ?? false,
    remark: item.remark ?? item.description ?? '',
    rootDefinitionId: item.root_definition_id,
    sortNo: item.sort_no ?? 0,
    sourceDefinitionId: item.source_definition_id,
    tableName: item.table_name,
    themeId: item.theme_id,
    themeName: theme?.name ?? '',
    updatedAt: item.updated_at ?? item.created_at ?? '',
    updatedBy: item.updated_by,
    versionNo: item.version_no ?? 1,
  } as ModelDefinition;
}

async function resolveGroupIds(data: ModelDefinition) {
  if (
    data.themeId &&
    (!data.auditGroupId || !data.groupId || data.auditGroupId === data.groupId)
  ) {
    const { items } = await getThemeListApi({ pageSize: 1000 });
    const theme = items.find((item: any) => item.id === data.themeId);
    const fallbackGroupId = theme?.userGroupId ?? null;

    return {
      auditGroupId: data.auditGroupId ?? fallbackGroupId,
      groupId: data.groupId ?? fallbackGroupId,
    };
  }

  return {
    auditGroupId: data.auditGroupId ?? null,
    groupId: data.groupId ?? null,
  };
}

export async function getModelDefinitionListApi(params: any = {}) {
  return withRequestCache('mdm_model_definitions:list', params, async () => {
    const { page = 1, pageSize = 10, includeHistory = false, ...rest } = params;
    const response = await requestClient.get<any>(
      '/supabase-mdm/mdm_model_definitions',
      {
        params: {
          ...rest,
          ...(includeHistory ? {} : { status: 'neq.history' }),
          select: '*',
          order: rest.order ?? 'sort_no.asc,updated_at.desc,created_at.desc',
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
    const lookups = await resolveModelDefinitionLookups();
    const items = rawItems.map((item: any) => mapModelDefinition(item, lookups));

    return {
      items,
      total: parseTotal(response),
    };
  });
}

export async function getModelDefinitionOptionsApi(
  params: {
    excludeId?: string;
  } = {},
) {
  const { items } = await getModelDefinitionListApi({
    pageSize: 1000,
    includeHistory: true,
  });
  return items
    .filter((item: any) => item.id && item.id !== params.excludeId)
    .map((item: any) => ({
      label: `${item.name} (${item.code})`,
      value: item.id as string,
    }));
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

  return mapModelDefinition(item, await resolveModelDefinitionLookups());
}

export async function createModelDefinitionApi(data: ModelDefinition) {
  const { auditGroupId, groupId } = await resolveGroupIds(data);
  const payload = {
    audit_group_id: auditGroupId,
    code: data.code,
    description: data.description ?? data.remark ?? '',
    enabled: data.enabled ?? true,
    group_id: groupId,
    model_type: data.modelType,
    name: data.name,
    need_audit: data.needAudit ?? false,
    remark: data.remark ?? data.description ?? '',
    sort_no: data.sortNo ?? 0,
    status: 'draft',
    theme_id: data.themeId ?? null,
    version_no: data.versionNo ?? 1,
  };

  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_model_definitions',
    payload,
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  const [created] = Array.isArray(response.data?.data)
    ? response.data.data
    : [];
  const definitionId = created?.id;

  if (definitionId) {
    const systemFields: ModelField[] = [
      {
        code: 'id',
        dataType: 'varchar',
        definitionId,
        isPrimary: true,
        isRequired: true,
        isUnique: true,
        length: 64,
        name: '\u4E3B\u952E',
        remarks: '\u7CFB\u7EDF\u4E3B\u952E',
        sort: 1,
        status: true,
      },
      {
        code: 'status',
        dataType: 'varchar',
        defaultValue: 'draft',
        definitionId,
        length: 32,
        name: '\u72B6\u6001',
        remarks:
          '\u5305\u542B\uFF1A\u8349\u7A3F\u3001\u5F85\u5BA1\u6838\u3001\u5BA1\u6838\u4E0D\u901A\u8FC7\u3001\u5DF2\u751F\u6548\u3001\u5931\u6548',
        sort: 100,
        status: true,
      },
      {
        code: 'created_by',
        dataType: 'varchar',
        definitionId,
        length: 64,
        name: '\u521B\u5EFA\u4EBAid',
        remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u4EBAid',
        sort: 101,
        status: true,
      },
      {
        code: 'created_by_name',
        dataType: 'varchar',
        definitionId,
        length: 64,
        name: '\u521B\u5EFA\u4EBA',
        remarks:
          '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u4EBA\u59D3\u540D',
        sort: 102,
        status: true,
      },
      {
        code: 'created_at',
        dataType: 'timestamptz',
        definitionId,
        name: '\u521B\u5EFA\u65F6\u95F4',
        remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u521B\u5EFA\u65F6\u95F4',
        sort: 103,
        status: true,
      },
      {
        code: 'updated_by',
        dataType: 'varchar',
        definitionId,
        length: 64,
        name: '\u4FEE\u6539\u4EBAid',
        remarks: '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u4FEE\u6539\u4EBAid',
        sort: 104,
        status: true,
      },
      {
        code: 'updated_by_name',
        dataType: 'varchar',
        definitionId,
        length: 64,
        name: '\u4FEE\u6539\u4EBA',
        remarks:
          '\u8BB0\u5F55\u4E3B\u6570\u636E\u7684\u4FEE\u6539\u4EBA\u59D3\u540D',
        sort: 105,
        status: true,
      },
      {
        code: 'updated_at',
        dataType: 'timestamptz',
        definitionId,
        name: '\u4FEE\u6539\u65F6\u95F4',
        remarks:
          '\u8BB0\u5F55\u4E3B\u6570\u636E\u6700\u540E\u4E00\u6B21\u4FEE\u6539\u65F6\u95F4',
        sort: 106,
        status: true,
      },
    ];
    await Promise.all(systemFields.map((field) => createModelFieldApi(field)));
  }

  return created ?? response.data?.data ?? response.data;
}

export async function updateModelDefinitionApi(
  id: string,
  data: ModelDefinition,
) {
  const { auditGroupId, groupId } = await resolveGroupIds(data);
  const isReadonlyStatus = [
    'history',
    'invalid',
    'published',
    'revised',
  ].includes(data.status);
  const payload = isReadonlyStatus
    ? {
        audit_group_id: auditGroupId,
        need_audit: data.needAudit ?? false,
        name: data.name,
        remark: data.remark ?? data.description ?? '',
        sort_no: data.sortNo ?? 0,
      }
    : {
        audit_group_id: auditGroupId,
        code: data.code,
        description: data.description ?? data.remark ?? '',
        enabled: data.enabled ?? true,
        group_id: groupId,
        model_type: data.modelType,
        name: data.name,
        need_audit: data.needAudit ?? false,
        remark: data.remark ?? data.description ?? '',
        sort_no: data.sortNo ?? 0,
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

export async function updateModelDefinitionEnabledApi(
  id: string,
  enabled: boolean,
) {
  return requestClient.request(
    `/supabase-mdm/mdm_model_definitions?id=eq.${id}`,
    {
      data: { enabled },
      method: 'PATCH',
    },
  );
}

export async function updateModelDefinitionStatusApi(
  id: string,
  status: ModelDefinition['status'],
) {
  const payload: Record<string, any> = { status };
  if (status === 'published') {
    payload.enabled = true;
  } else if (status === 'invalid') {
    payload.enabled = false;
  }

  return requestClient.request(
    `/supabase-mdm/mdm_model_definitions?id=eq.${id}`,
    {
      data: payload,
      method: 'PATCH',
    },
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

  const rawItems = Array.isArray(response.data?.data) ? response.data.data : [];
  const dictCodes: string[] = [
    ...new Set<string>(
      rawItems
        .map((item: any) => (item.dict_code ? String(item.dict_code) : ''))
        .filter(Boolean),
    ),
  ];
  const relatedDefinitionIds: string[] = [
    ...new Set<string>(
      rawItems
        .map((item: any) =>
          item.related_definition_id ? String(item.related_definition_id) : '',
        )
        .filter(Boolean),
    ),
  ];

  const [ruleResponse, numberingResponse, dictMap, definitionMap] =
    await Promise.all([
      getValidationRuleListApi({ pageSize: 1000 }),
      getNumberingSegmentListApi({ pageSize: 1000 }),
      fetchDictNameMap(dictCodes),
      fetchDefinitionSummaryMap(relatedDefinitionIds),
    ]);

  const ruleMap = new Map(
    ruleResponse.items.map((item: any) => [item.id, item.name]),
  );
  const numberingMap = new Map(
    numberingResponse.items.map((item: any) => [item.id, item.segmentName]),
  );

  return rawItems.map((item: any) => {
    const dictCode = item.dict_code ? String(item.dict_code) : null;
    const relatedDefinitionId = item.related_definition_id
      ? String(item.related_definition_id)
      : null;
    const systemFieldMeta = getSystemModelFieldMeta(item.code);
    const relatedDefinition = relatedDefinitionId
      ? (definitionMap.get(relatedDefinitionId) as
          | undefined
          | { code: string; name: string })
      : undefined;
    return {
      ...item,
      attachmentMode: normalizeAttachmentMode(
        item.attachment_mode,
        item.is_multiple,
      ),
      name: systemFieldMeta?.name ?? item.name,
      remarks: systemFieldMeta?.remarks ?? item.remarks,
      dataType: item.data_type,
      defaultValue: item.default_value,
      definitionId: item.definition_id,
      dictCode,
      dictName: dictCode ? (dictMap.get(dictCode) ?? '') : '',
      isCodeField: item.is_code_field ?? false,
      isMultiple:
        normalizeAttachmentMode(item.attachment_mode, item.is_multiple) ===
        'multiple',
      isPrimary: item.is_primary,
      isRequired: item.is_required,
      isUnique: item.is_unique,
      numberingSegmentId: item.numbering_segment_id ?? null,
      numberingSegmentName: item.numbering_segment_id
        ? (numberingMap.get(item.numbering_segment_id) ?? '')
        : '',
      relatedDefinitionCode: relatedDefinition?.code ?? '',
      relatedDefinitionId,
      relatedDefinitionName: relatedDefinition?.name ?? '',
      systemField: isSystemModelFieldCode(item.code),
      validationRuleId: item.validation_rule_id,
      validationRuleName: item.validation_rule_id
        ? (ruleMap.get(item.validation_rule_id) ?? '')
        : '',
    };
  });
}

export async function createModelFieldApi(data: ModelField) {
  const payload = buildModelFieldPayload(data);
  try {
    return await requestClient.post('/supabase-mdm/mdm_model_fields', payload);
  } catch (error) {
    if (!shouldFallbackModelFieldColumns(error)) {
      throw error;
    }
    return requestClient.post(
      '/supabase-mdm/mdm_model_fields',
      stripOptionalModelFieldColumns(payload),
    );
  }
}

export async function updateModelFieldApi(id: string, data: ModelField) {
  const isPublished = data.definitionStatus === 'published';
  const payload = buildModelFieldPayload(data, { isPublished });
  try {
    return await requestClient.request(
      `/supabase-mdm/mdm_model_fields?id=eq.${id}`,
      {
        data: payload,
        method: 'PATCH',
      },
    );
  } catch (error) {
    if (!shouldFallbackModelFieldColumns(error)) {
      throw error;
    }
    return requestClient.request(`/supabase-mdm/mdm_model_fields?id=eq.${id}`, {
      data: stripOptionalModelFieldColumns(payload),
      method: 'PATCH',
    });
  }
}

function buildModelFieldPayload(
  data: ModelField,
  options?: { isPublished?: boolean },
) {
  const isAttachmentType = data.dataType === 'attachment';
  const isDictType = data.dataType === 'dict';
  const isRelationType = data.dataType === 'relation_master';
  const isPublished = options?.isPublished ?? false;
  const attachmentMode = isAttachmentType
    ? normalizeAttachmentMode(data.attachmentMode, data.isMultiple)
    : null;

  return {
    ...(isPublished
      ? {}
      : {
          attachment_mode: attachmentMode,
          code: data.code,
          data_type: data.dataType,
          is_code_field: !!data.isCodeField,
          is_multiple: attachmentMode === 'multiple',
          is_primary: !!data.isPrimary,
          is_required: !!data.isRequired,
          is_unique: !!data.isUnique,
          status: data.status ?? true,
        }),
    default_value: data.defaultValue ?? null,
    ...(isPublished ? {} : { definition_id: data.definitionId }),
    dict_code: isDictType ? (data.dictCode ?? null) : null,
    length: data.length ?? null,
    name: data.name,
    numbering_segment_id: data.isCodeField
      ? (data.numberingSegmentId ?? null)
      : null,
    precision: data.precision ?? null,
    related_definition_id: isRelationType
      ? (data.relatedDefinitionId ?? null)
      : null,
    remarks: data.remarks ?? '',
    sort: data.sort ?? 10,
    validation_rule_id: data.validationRuleId ?? null,
  };
}

function shouldFallbackModelFieldColumns(error: any) {
  const message =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    '';

  return (
    typeof message === 'string' &&
    message.includes('schema cache') &&
    message.includes("'mdm_model_fields'")
  );
}

function stripOptionalModelFieldColumns(payload: Record<string, any>) {
  const {
    attachment_mode: _attachmentMode,
    dict_code: _dictCode,
    is_code_field: _isCodeField,
    numbering_segment_id: _numberingSegmentId,
    related_definition_id: _relatedDefinitionId,
    ...legacyPayload
  } = payload;

  return legacyPayload;
}

export async function deleteModelFieldApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_model_fields?id=eq.${id}`);
}

export async function updateModelFieldEnabledApi(id: string, status: boolean) {
  return requestClient.request(`/supabase-mdm/mdm_model_fields?id=eq.${id}`, {
    data: { status },
    method: 'PATCH',
  });
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
