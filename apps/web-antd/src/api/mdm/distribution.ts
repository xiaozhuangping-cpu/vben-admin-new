import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

import { clearRequestCache, withRequestCache } from './_cache';

export interface DistributionTarget {
  authConfig?: Record<string, any>;
  authType: string;
  baseUrl?: string;
  code: string;
  createdAt?: string;
  description?: string;
  id?: string;
  name: string;
  status: boolean;
  targetType: string;
  updatedAt?: string;
}

export interface DistributionScheme {
  code: string;
  cronExpr?: string;
  definitionId: string;
  definitionName?: string;
  dispatchMode: string;
  filterSql?: string;
  id?: string;
  includeDataAuth?: boolean;
  lastDispatchedAt?: string;
  name: string;
  remark?: string;
  status: string;
  targetId: string;
  targetName?: string;
  triggerEvents?: string[];
}

export interface DistributionSchemeFieldMapping {
  fixedValue?: string;
  id?: string;
  mappingType: string;
  schemeId: string;
  sortNo?: number;
  sourceFieldCode: string;
  targetFieldCode: string;
  transformScript?: string;
}

export interface DistributionTask {
  createdAt?: string;
  definitionId?: string;
  definitionName?: string;
  errorMessage?: string;
  finishedAt?: string;
  id?: string;
  operationType: string;
  recordId?: string;
  retryCount?: number;
  schemeId?: string;
  schemeName?: string;
  startedAt?: string;
  status: string;
  targetId?: string;
  targetName?: string;
  taskType: string;
  triggerMode: string;
}

export interface DistributionTaskLog {
  createdAt?: string;
  id?: string;
  level: string;
  message: string;
  success?: boolean;
  taskId: string;
  taskSummary?: string;
}

export interface DistributionTaskLogDetail extends DistributionTaskLog {
  task?: DistributionTask | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DISTRIBUTION_DISPATCH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mdm-distribution-dispatch`;

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

function resolveFunctionErrorMessage(result: any, fallback: string) {
  const message = String(result?.error || result?.message || '').trim();

  if (
    message &&
    (message.toLowerCase().includes('invalid jwt') ||
      message.toLowerCase().includes('jwt'))
  ) {
    return '当前登录状态已失效，请重新登录后再试。';
  }

  return message || fallback;
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

function normalizeTargetPayload(data: DistributionTarget) {
  return {
    auth_config: data.authConfig ?? {},
    auth_type: data.authType,
    base_url: data.baseUrl ?? '',
    code: data.code,
    description: data.description ?? '',
    name: data.name,
    status: data.status ?? true,
    target_type: data.targetType,
  };
}

function normalizeSchemePayload(data: DistributionScheme) {
  return {
    code: data.code,
    cron_expr: data.cronExpr ?? '',
    definition_id: data.definitionId,
    dispatch_mode: data.dispatchMode,
    filter_sql: data.filterSql ?? '',
    include_data_auth: data.includeDataAuth ?? false,
    name: data.name,
    remark: data.remark ?? '',
    status: data.status,
    target_id: data.targetId,
    trigger_events: Array.isArray(data.triggerEvents) ? data.triggerEvents : [],
  };
}

function normalizeSchemeFieldPayload(data: DistributionSchemeFieldMapping) {
  return {
    fixed_value: data.fixedValue ?? '',
    mapping_type: data.mappingType,
    scheme_id: data.schemeId,
    sort_no: data.sortNo ?? 10,
    source_field_code: data.sourceFieldCode,
    target_field_code: data.targetFieldCode,
    transform_script: data.transformScript ?? '',
  };
}

function mapTarget(item: any): DistributionTarget {
  return {
    authConfig: item.auth_config ?? {},
    authType: item.auth_type ?? 'none',
    baseUrl: item.base_url ?? '',
    code: item.code,
    createdAt: item.created_at ?? '',
    description: item.description ?? '',
    id: item.id,
    name: item.name,
    status: item.status ?? true,
    targetType: item.target_type ?? 'http',
    updatedAt: item.updated_at ?? '',
  };
}

function mapScheme(
  item: any,
  lookups?: {
    definitionNameMap: Map<string, string>;
    targetNameMap: Map<string, string>;
  },
): DistributionScheme {
  return {
    code: item.code,
    cronExpr: item.cron_expr ?? '',
    definitionId: item.definition_id,
    definitionName:
      lookups?.definitionNameMap.get(String(item.definition_id)) ?? '',
    dispatchMode: item.dispatch_mode ?? 'manual',
    filterSql: item.filter_sql ?? '',
    id: item.id,
    includeDataAuth: item.include_data_auth ?? false,
    lastDispatchedAt: item.last_dispatched_at ?? '',
    name: item.name,
    remark: item.remark ?? '',
    status: item.status ?? 'draft',
    targetId: item.target_id,
    targetName: lookups?.targetNameMap.get(String(item.target_id)) ?? '',
    triggerEvents: Array.isArray(item.trigger_events)
      ? item.trigger_events
      : [],
  };
}

function mapSchemeField(item: any): DistributionSchemeFieldMapping {
  return {
    fixedValue: item.fixed_value ?? '',
    id: item.id,
    mappingType: item.mapping_type ?? 'direct',
    schemeId: item.scheme_id,
    sortNo: item.sort_no ?? 10,
    sourceFieldCode: item.source_field_code ?? '',
    targetFieldCode: item.target_field_code ?? '',
    transformScript: item.transform_script ?? '',
  };
}

function mapTask(
  item: any,
  lookups?: {
    definitionNameMap: Map<string, string>;
    schemeNameMap: Map<string, string>;
    targetNameMap: Map<string, string>;
  },
): DistributionTask {
  return {
    createdAt: item.created_at ?? '',
    definitionId: item.definition_id ?? '',
    definitionName:
      lookups?.definitionNameMap.get(String(item.definition_id ?? '')) ?? '',
    errorMessage: item.error_message ?? '',
    finishedAt: item.finished_at ?? '',
    id: item.id,
    operationType: item.operation_type ?? 'full_sync',
    recordId: item.record_id ?? '',
    retryCount: item.retry_count ?? 0,
    schemeId: item.scheme_id ?? '',
    schemeName: lookups?.schemeNameMap.get(String(item.scheme_id ?? '')) ?? '',
    startedAt: item.started_at ?? '',
    status: item.status ?? 'pending',
    targetId: item.target_id ?? '',
    targetName: lookups?.targetNameMap.get(String(item.target_id ?? '')) ?? '',
    taskType: item.task_type ?? 'dispatch',
    triggerMode: item.trigger_mode ?? 'manual',
  };
}

function mapTaskLog(
  item: any,
  lookups?: {
    taskSummaryMap: Map<string, string>;
  },
): DistributionTaskLog {
  return {
    createdAt: item.created_at ?? '',
    id: item.id,
    level: item.level ?? 'info',
    message: item.message ?? '',
    success: item.success ?? null,
    taskId: item.task_id,
    taskSummary: lookups?.taskSummaryMap.get(String(item.task_id ?? '')) ?? '',
  };
}

async function fetchDefinitionNameMap(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_definitions',
    {
      params: {
        id: buildInFilter(ids),
        limit: ids.length,
        select: 'id,name',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map<string, string>(
    rows.map((item: any) => [String(item.id), String(item.name)]),
  );
}

async function fetchTargetNameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_distribution_targets',
    {
      params: {
        id: buildInFilter(ids),
        limit: ids.length,
        select: 'id,name',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map<string, string>(
    rows.map((item: any) => [String(item.id), String(item.name)]),
  );
}

async function fetchSchemeNameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_distribution_schemes',
    {
      params: {
        id: buildInFilter(ids),
        limit: ids.length,
        select: 'id,name',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map<string, string>(
    rows.map((item: any) => [String(item.id), String(item.name)]),
  );
}

async function fetchTaskSummaryMap(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_distribution_tasks',
    {
      params: {
        id: buildInFilter(ids),
        limit: ids.length,
        select: 'id,operation_type,status',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map<string, string>(
    rows.map((item: any) => [
      String(item.id),
      `${item.operation_type ?? 'task'} / ${item.status ?? 'pending'}`,
    ]),
  );
}

export async function getDistributionTargetListApi(params: any = {}) {
  return withRequestCache('mdm_distribution_targets:list', params, async () => {
    const { page = 1, pageSize = 10, ...rest } = params;
    const response = await requestClient.get<any>(
      '/supabase-mdm/mdm_distribution_targets',
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

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];

    return {
      items: rows.map(mapTarget),
      total: parseTotal(response),
    };
  });
}

export async function createDistributionTargetApi(data: DistributionTarget) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_distribution_targets',
    normalizeTargetPayload(data),
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_distribution_targets:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapTarget(rows[0]) : null;
}

export async function updateDistributionTargetApi(
  id: string,
  data: DistributionTarget,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_distribution_targets?id=eq.${id}`,
    {
      data: normalizeTargetPayload(data),
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_distribution_targets:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapTarget(rows[0]) : null;
}

export async function deleteDistributionTargetApi(id: string) {
  await requestClient.delete(
    `/supabase-mdm/mdm_distribution_targets?id=eq.${id}`,
  );
  clearRequestCache('mdm_distribution_targets:list');
}

export async function getDistributionSchemeListApi(params: any = {}) {
  return withRequestCache('mdm_distribution_schemes:list', params, async () => {
    const { page = 1, pageSize = 10, ...rest } = params;
    const response = await requestClient.get<any>(
      '/supabase-mdm/mdm_distribution_schemes',
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

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const definitionIds: string[] = [...new Set(
        rows
          .map((item: any) => String(item.definition_id || ''))
          .filter(Boolean),
      )];
    const targetIds: string[] = [...new Set(
        rows.map((item: any) => String(item.target_id || '')).filter(Boolean),
      )];

    const [definitionNameMap, targetNameMap]: [
      Map<string, string>,
      Map<string, string>,
    ] = await Promise.all([
      fetchDefinitionNameMap(definitionIds),
      fetchTargetNameMap(targetIds),
    ]);

    return {
      items: rows.map((item: any) =>
        mapScheme(item, { definitionNameMap, targetNameMap }),
      ),
      total: parseTotal(response),
    };
  });
}

export async function createDistributionSchemeApi(data: DistributionScheme) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_distribution_schemes',
    normalizeSchemePayload(data),
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_distribution_schemes:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapScheme(rows[0]) : null;
}

export async function updateDistributionSchemeApi(
  id: string,
  data: DistributionScheme,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_distribution_schemes?id=eq.${id}`,
    {
      data: normalizeSchemePayload(data),
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_distribution_schemes:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapScheme(rows[0]) : null;
}

export async function deleteDistributionSchemeApi(id: string) {
  await requestClient.delete(
    `/supabase-mdm/mdm_distribution_schemes?id=eq.${id}`,
  );
  clearRequestCache('mdm_distribution_schemes:list');
}

function buildClonedSchemeCode(code: string) {
  const suffix = Date.now().toString().slice(-6);
  return `${String(code || 'SCHEME').slice(0, 80)}_COPY_${suffix}`;
}

function buildClonedSchemeName(name: string) {
  return `${name || '未命名方案'}-副本`;
}

export async function toggleDistributionSchemeStatusApi(
  id: string,
  status: 'disabled' | 'enabled',
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_distribution_schemes?id=eq.${id}`,
    {
      data: {
        status,
      },
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_distribution_schemes:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapScheme(rows[0]) : null;
}

export async function cloneDistributionSchemeApi(source: DistributionScheme) {
  const createdScheme = await createDistributionSchemeApi({
    ...source,
    code: buildClonedSchemeCode(source.code),
    name: buildClonedSchemeName(source.name),
    status: 'draft',
  });

  if (!createdScheme?.id || !source.id) {
    return createdScheme;
  }

  const sourceMappings = await getDistributionSchemeFieldListApi(source.id);
  for (const mapping of sourceMappings) {
    await createDistributionSchemeFieldApi({
      ...mapping,
      schemeId: String(createdScheme.id),
    });
  }

  clearRequestCache('mdm_distribution_schemes:list');

  return createdScheme;
}

export async function getDistributionSchemeFieldListApi(schemeId: string) {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_distribution_scheme_fields',
    {
      params: {
        order: 'sort_no.asc,created_at.asc',
        scheme_id: `eq.${schemeId}`,
        select: '*',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows.map(mapSchemeField);
}

export async function createDistributionSchemeFieldApi(
  data: DistributionSchemeFieldMapping,
) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_distribution_scheme_fields',
    normalizeSchemeFieldPayload(data),
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapSchemeField(rows[0]) : null;
}

export async function updateDistributionSchemeFieldApi(
  id: string,
  data: DistributionSchemeFieldMapping,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_distribution_scheme_fields?id=eq.${id}`,
    {
      data: normalizeSchemeFieldPayload(data),
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapSchemeField(rows[0]) : null;
}

export async function deleteDistributionSchemeFieldApi(id: string) {
  await requestClient.delete(
    `/supabase-mdm/mdm_distribution_scheme_fields?id=eq.${id}`,
  );
}

export async function getDistributionTaskListApi(params: any = {}) {
  return withRequestCache('mdm_distribution_tasks:list', params, async () => {
    const {
      createdAtFrom,
      createdAtTo,
      page = 1,
      pageSize = 10,
      ...rest
    } = params;
    const andFilters = [
      createdAtFrom ? `created_at.gte.${createdAtFrom}` : '',
      createdAtTo ? `created_at.lte.${createdAtTo}` : '',
    ].filter(Boolean);
    const response = await requestClient.get<any>(
      '/supabase-mdm/mdm_distribution_tasks',
      {
        params: {
          ...(andFilters.length > 0
            ? { and: `(${andFilters.join(',')})` }
            : {}),
          ...rest,
          select: '*',
          order: rest.order ?? 'created_at.desc',
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        headers: {
          Prefer: 'count=exact',
        },
        responseReturn: 'raw',
      },
    );

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const definitionIds: string[] = [...new Set(
        rows
          .map((item: any) => String(item.definition_id || ''))
          .filter(Boolean),
      )];
    const targetIds: string[] = [...new Set(
        rows.map((item: any) => String(item.target_id || '')).filter(Boolean),
      )];
    const schemeIds: string[] = [...new Set(
        rows.map((item: any) => String(item.scheme_id || '')).filter(Boolean),
      )];

    const [definitionNameMap, schemeNameMap, targetNameMap]: [
      Map<string, string>,
      Map<string, string>,
      Map<string, string>,
    ] = await Promise.all([
      fetchDefinitionNameMap(definitionIds),
      fetchSchemeNameMap(schemeIds),
      fetchTargetNameMap(targetIds),
    ]);

    return {
      items: rows.map((item: any) =>
        mapTask(item, { definitionNameMap, schemeNameMap, targetNameMap }),
      ),
      total: parseTotal(response),
    };
  });
}

export async function createDistributionTaskApi(data: {
  definitionId: string;
  operationType?: string;
  schemeId: string;
  targetId: string;
  triggerMode?: string;
}) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_distribution_tasks',
    {
      definition_id: data.definitionId,
      operation_type: data.operationType ?? 'full_sync',
      request_payload: {},
      scheme_id: data.schemeId,
      status: 'pending',
      target_id: data.targetId,
      task_type: 'dispatch',
      trigger_mode: data.triggerMode ?? 'manual',
    },
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  const created = rows[0];

  if (created?.id) {
    await requestClient.post('/supabase-mdm/mdm_distribution_task_logs', {
      level: 'info',
      message: '手动创建分发任务，等待执行。',
      success: true,
      task_id: created.id,
    });
  }

  clearRequestCache('mdm_distribution_tasks:list');
  clearRequestCache('mdm_distribution_task_logs:list');

  return created ? mapTask(created) : null;
}

export async function enqueueDistributionTasksApi(data: {
  definitionId: string;
  operationType?: string;
  recordId?: string;
  triggerMode?: string;
}) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/enqueue_mdm_distribution_tasks',
    {
      p_definition_id: data.definitionId,
      p_operation_type: data.operationType ?? 'update',
      p_record_id: data.recordId ?? null,
      p_trigger_mode: data.triggerMode ?? 'event',
    },
    {
      responseReturn: 'raw',
    },
  );

  const payload = response.data?.data ?? response.data ?? {};

  clearRequestCache('mdm_distribution_tasks:list');
  clearRequestCache('mdm_distribution_task_logs:list');

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
  };
}

export async function dispatchDistributionTasksApi(data: {
  taskIds?: string[];
  triggerMode?: string;
}) {
  const accessToken = useAccessStore().accessToken;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 环境变量缺失，无法执行分发任务');
  }

  if (!accessToken) {
    throw new Error('当前登录状态已失效，请重新登录后重试');
  }

  const response = await fetch(DISTRIBUTION_DISPATCH_FUNCTION_URL, {
    body: JSON.stringify({
      taskIds: Array.isArray(data.taskIds) ? data.taskIds : [],
      triggerMode: data.triggerMode ?? 'manual',
    }),
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: formatAuthorization(accessToken),
    },
    method: 'POST',
  });

  const result = await parseFunctionResponse(response);

  if (!response.ok) {
    throw new Error(resolveFunctionErrorMessage(result, '执行分发任务失败'));
  }

  clearRequestCache('mdm_distribution_tasks:list');
  clearRequestCache('mdm_distribution_task_logs:list');

  return result;
}

export async function testDistributionTargetConnectionApi(data: {
  target: DistributionTarget;
}) {
  const accessToken = useAccessStore().accessToken;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 环境变量缺失，无法测试连接');
  }

  if (!accessToken) {
    throw new Error('当前登录状态已失效，请重新登录后重试');
  }

  const response = await fetch(DISTRIBUTION_DISPATCH_FUNCTION_URL, {
    body: JSON.stringify({
      mode: 'test',
      target: {
        auth_config: data.target.authConfig ?? {},
        auth_type: data.target.authType,
        base_url: data.target.baseUrl,
        code: data.target.code,
        id: data.target.id,
        name: data.target.name,
        target_type: data.target.targetType,
      },
    }),
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: formatAuthorization(accessToken),
    },
    method: 'POST',
  });

  const result = await parseFunctionResponse(response);

  if (!response.ok) {
    throw new Error(resolveFunctionErrorMessage(result, '测试连接失败'));
  }

  return result;
}

export async function enqueueAndDispatchDistributionTasksApi(data: {
  definitionId: string;
  operationType?: string;
  recordId?: string;
  triggerMode?: string;
}) {
  const enqueueResult = await enqueueDistributionTasksApi(data);
  const realtimeTaskIds = enqueueResult.items
    .filter((item: any) => item.dispatchMode === 'realtime')
    .map((item: any) => String(item.taskId))
    .filter(Boolean);

  let dispatchResult: any = null;
  if (realtimeTaskIds.length > 0) {
    dispatchResult = await dispatchDistributionTasksApi({
      taskIds: realtimeTaskIds,
      triggerMode: data.triggerMode ?? 'event',
    });
  }

  return {
    dispatchResult,
    enqueueResult,
  };
}

export async function getDistributionTaskLogListApi(params: any = {}) {
  return withRequestCache(
    'mdm_distribution_task_logs:list',
    params,
    async () => {
      const {
        createdAtFrom,
        createdAtTo,
        page = 1,
        pageSize = 10,
        ...rest
      } = params;
      const andFilters = [
        createdAtFrom ? `created_at.gte.${createdAtFrom}` : '',
        createdAtTo ? `created_at.lte.${createdAtTo}` : '',
      ].filter(Boolean);
      const response = await requestClient.get<any>(
        '/supabase-mdm/mdm_distribution_task_logs',
        {
          params: {
            ...(andFilters.length > 0
              ? { and: `(${andFilters.join(',')})` }
              : {}),
            ...rest,
            select: '*',
            order: rest.order ?? 'created_at.desc',
            limit: pageSize,
            offset: (page - 1) * pageSize,
          },
          headers: {
            Prefer: 'count=exact',
          },
          responseReturn: 'raw',
        },
      );

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const taskIds: string[] = [...new Set(
          rows.map((item: any) => String(item.task_id || '')).filter(Boolean),
        )];
      const taskSummaryMap: Map<string, string> =
        await fetchTaskSummaryMap(taskIds);

      return {
        items: rows.map((item: any) => mapTaskLog(item, { taskSummaryMap })),
        total: parseTotal(response),
      };
    },
  );
}

export async function getDistributionTaskLogDetailApi(
  id: string,
): Promise<DistributionTaskLogDetail | null> {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_distribution_task_logs',
    {
      params: {
        id: `eq.${id}`,
        limit: 1,
        select: '*',
      },
      responseReturn: 'raw',
    },
  );

  const [row] = Array.isArray(response.data?.data) ? response.data.data : [];
  if (!row?.id) {
    return null;
  }

  const log = mapTaskLog(row);
  const taskResult = row.task_id
    ? await getDistributionTaskListApi({
        id: `eq.${row.task_id}`,
        page: 1,
        pageSize: 1,
      })
    : { items: [] };

  return {
    ...log,
    task: taskResult.items[0] ?? null,
  };
}

export async function getDistributionTargetOptionsApi() {
  const result = await getDistributionTargetListApi({
    page: 1,
    pageSize: 1000,
    status: 'eq.true',
  });

  return result.items.map((item: DistributionTarget) => ({
    label: item.name,
    value: String(item.id),
  }));
}
