import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

import { clearRequestCache, withRequestCache } from './_cache';
import { getDictItemOptionsApi } from './dict';

export interface CollectionTask {
  apiUrl?: string;
  collectionType: 'api' | 'plugin';
  createdAt?: string;
  executeStrategy?: string;
  id?: string;
  lastExecutedAt?: string;
  lastExecutionStatus?: string;
  name: string;
  pluginCode?: string;
  pluginName?: string;
  status: 'disabled' | 'enabled';
  updatedAt?: string;
}

export interface CollectionTaskRun {
  createdAt?: string;
  errorMessage?: string;
  finishedAt?: string;
  id?: string;
  resultSummary?: Record<string, any>;
  startedAt?: string;
  status: string;
  taskId: string;
  taskName?: string;
  triggerMode: string;
  updatedAt?: string;
}

export interface CollectionTaskLog {
  createdAt?: string;
  detail?: Record<string, any>;
  id?: string;
  level: string;
  message: string;
  runId: string;
  runSummary?: string;
  taskId: string;
}

export interface CollectionTaskLogDetail extends CollectionTaskLog {
  run?: CollectionTaskRun | null;
  task?: CollectionTask | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const COLLECTION_DISPATCH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mdm-collection-dispatch`;

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

function normalizeTaskPayload(data: CollectionTask) {
  return {
    api_url:
      data.collectionType === 'api' ? String(data.apiUrl ?? '').trim() : null,
    collection_type: data.collectionType,
    execute_strategy: String(data.executeStrategy ?? '').trim(),
    name: String(data.name ?? '').trim(),
    plugin_code:
      data.collectionType === 'plugin'
        ? String(data.pluginCode ?? '').trim()
        : null,
    status: data.status ?? 'enabled',
  };
}

function mapTask(
  item: any,
  lookups?: {
    pluginNameMap: Map<string, string>;
  },
): CollectionTask {
  const pluginCode = String(item.plugin_code ?? '').trim();

  return {
    apiUrl: item.api_url ?? '',
    collectionType: item.collection_type ?? 'api',
    createdAt: item.created_at ?? '',
    executeStrategy: item.execute_strategy ?? '',
    id: item.id,
    lastExecutedAt: item.last_executed_at ?? '',
    lastExecutionStatus: item.last_execution_status ?? '',
    name: item.name ?? '',
    pluginCode,
    pluginName: pluginCode
      ? (lookups?.pluginNameMap.get(pluginCode) ?? pluginCode)
      : '',
    status: item.status ?? 'enabled',
    updatedAt: item.updated_at ?? '',
  };
}

function mapRun(
  item: any,
  lookups?: {
    taskNameMap: Map<string, string>;
  },
): CollectionTaskRun {
  return {
    createdAt: item.created_at ?? '',
    errorMessage: item.error_message ?? '',
    finishedAt: item.finished_at ?? '',
    id: item.id,
    resultSummary: item.result_summary ?? {},
    startedAt: item.started_at ?? '',
    status: item.status ?? 'pending',
    taskId: String(item.task_id ?? ''),
    taskName: lookups?.taskNameMap.get(String(item.task_id ?? '')) ?? '',
    triggerMode: item.trigger_mode ?? 'manual',
    updatedAt: item.updated_at ?? '',
  };
}

function mapLog(
  item: any,
  lookups?: {
    runSummaryMap: Map<string, string>;
  },
): CollectionTaskLog {
  return {
    createdAt: item.created_at ?? '',
    detail: item.detail ?? {},
    id: item.id,
    level: item.level ?? 'info',
    message: item.message ?? '',
    runId: String(item.run_id ?? ''),
    runSummary: lookups?.runSummaryMap.get(String(item.run_id ?? '')) ?? '',
    taskId: String(item.task_id ?? ''),
  };
}

async function fetchPluginNameMap(codes: string[]) {
  if (codes.length === 0) {
    return new Map<string, string>();
  }

  const options = await getDictItemOptionsApi('mdm_model_plugin');
  const sourceMap = new Map(
    options.map((item: any) => [String(item.value), String(item.label)]),
  );

  return new Map(codes.map((code) => [code, sourceMap.get(code) ?? code]));
}

async function fetchTaskNameMap(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_collection_tasks',
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
  return new Map(
    rows.map((item: any) => [String(item.id), String(item.name ?? '')]),
  );
}

async function fetchRunSummaryMap(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_collection_task_runs',
    {
      params: {
        id: buildInFilter(ids),
        limit: ids.length,
        select: 'id,status,trigger_mode,created_at',
      },
      responseReturn: 'raw',
    },
  );

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return new Map(
    rows.map((item: any) => [
      String(item.id),
      `${item.trigger_mode ?? 'manual'} / ${item.status ?? 'pending'}`,
    ]),
  );
}

export async function getCollectionTaskListApi(params: any = {}) {
  return withRequestCache('mdm_collection_tasks:list', params, async () => {
    const { page = 1, pageSize = 10, taskName, ...rest } = params;
    const response = await requestClient.get<any>(
      '/supabase-mdm/mdm_collection_tasks',
      {
        params: {
          ...rest,
          ...(taskName ? { name: `ilike.%${String(taskName).trim()}%` } : {}),
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
    const pluginCodes = [
      ...new Set(
        rows
          .map((item: any) => String(item.plugin_code ?? '').trim())
          .filter(Boolean),
      ),
    ];
    const pluginNameMap = await fetchPluginNameMap(pluginCodes);

    return {
      items: rows.map((item: any) => mapTask(item, { pluginNameMap })),
      total: parseTotal(response),
    };
  });
}

export async function createCollectionTaskApi(data: CollectionTask) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/mdm_collection_tasks',
    normalizeTaskPayload(data),
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_collection_tasks:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function updateCollectionTaskApi(
  id: string,
  data: CollectionTask,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/mdm_collection_tasks?id=eq.${id}`,
    {
      data: normalizeTaskPayload(data),
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  clearRequestCache('mdm_collection_tasks:list');

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  return rows[0] ? mapTask(rows[0]) : null;
}

export async function deleteCollectionTaskApi(id: string) {
  await requestClient.delete(`/supabase-mdm/mdm_collection_tasks?id=eq.${id}`);
  clearRequestCache('mdm_collection_tasks:list');
  clearRequestCache('mdm_collection_task_runs:list');
  clearRequestCache('mdm_collection_task_logs:list');
}

export async function getCollectionTaskRunListApi(params: any = {}) {
  return withRequestCache('mdm_collection_task_runs:list', params, async () => {
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
      '/supabase-mdm/mdm_collection_task_runs',
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
    const taskIds = [
      ...new Set(
        rows.map((item: any) => String(item.task_id ?? '')).filter(Boolean),
      ),
    ];
    const taskNameMap = await fetchTaskNameMap(taskIds);

    return {
      items: rows.map((item: any) => mapRun(item, { taskNameMap })),
      total: parseTotal(response),
    };
  });
}

export async function getCollectionTaskLogListApi(params: any = {}) {
  return withRequestCache('mdm_collection_task_logs:list', params, async () => {
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
      '/supabase-mdm/mdm_collection_task_logs',
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
    const runIds = [
      ...new Set(
        rows.map((item: any) => String(item.run_id ?? '')).filter(Boolean),
      ),
    ];
    const runSummaryMap = await fetchRunSummaryMap(runIds);

    return {
      items: rows.map((item: any) => mapLog(item, { runSummaryMap })),
      total: parseTotal(response),
    };
  });
}

export async function getCollectionTaskLogDetailApi(
  id: string,
): Promise<CollectionTaskLogDetail | null> {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_collection_task_logs',
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

  const log = mapLog(row);
  const [runResult, taskResult] = await Promise.all([
    row.run_id
      ? getCollectionTaskRunListApi({
          id: `eq.${row.run_id}`,
          page: 1,
          pageSize: 1,
        })
      : Promise.resolve({ items: [] }),
    row.task_id
      ? getCollectionTaskListApi({
          id: `eq.${row.task_id}`,
          page: 1,
          pageSize: 1,
        })
      : Promise.resolve({ items: [] }),
  ]);

  return {
    ...log,
    run: runResult.items[0] ?? null,
    task: taskResult.items[0] ?? null,
  };
}

export async function enqueueCollectionTaskRunApi(data: {
  taskId: string;
  triggerMode?: 'manual' | 'schedule';
}) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/enqueue_mdm_collection_run',
    {
      p_task_id: data.taskId,
      p_trigger_mode: data.triggerMode ?? 'manual',
    },
    {
      responseReturn: 'raw',
    },
  );

  const payload = response.data?.data ?? response.data ?? {};

  clearRequestCache('mdm_collection_task_runs:list');
  clearRequestCache('mdm_collection_task_logs:list');

  return {
    runId: String(payload.runId ?? ''),
    taskId: String(payload.taskId ?? ''),
    taskName: String(payload.taskName ?? ''),
  };
}

export async function dispatchCollectionTaskRunsApi(data: {
  runIds?: string[];
  triggerMode?: 'manual' | 'schedule';
}) {
  const accessToken = useAccessStore().accessToken;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 环境变量缺失，无法执行归集任务。');
  }

  if (!accessToken) {
    throw new Error('当前登录状态已失效，请重新登录后再试。');
  }

  const response = await fetch(COLLECTION_DISPATCH_FUNCTION_URL, {
    body: JSON.stringify({
      runIds: Array.isArray(data.runIds) ? data.runIds : [],
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
    throw new Error(resolveFunctionErrorMessage(result, '执行归集任务失败'));
  }

  clearRequestCache('mdm_collection_tasks:list');
  clearRequestCache('mdm_collection_task_runs:list');
  clearRequestCache('mdm_collection_task_logs:list');

  return result;
}
