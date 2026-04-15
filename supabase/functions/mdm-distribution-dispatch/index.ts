import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

class TargetTestError extends Error {
  responsePayload?: Record<string, any>;
  status?: number;

  constructor(
    message: string,
    options?: {
      responsePayload?: Record<string, any>;
      status?: number;
    },
  ) {
    super(message);
    this.name = 'TargetTestError';
    this.responsePayload = options?.responsePayload;
    this.status = options?.status;
  }
}

function buildHeaders(target: any) {
  const authType = String(target?.auth_type || 'none');
  const authConfig = target?.auth_config ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authType === 'bearer' && authConfig?.token) {
    headers.Authorization = `Bearer ${authConfig.token}`;
  } else if (authType === 'basic' && authConfig?.username) {
    const encoded = btoa(
      `${authConfig.username}:${String(authConfig.password || '')}`,
    );
    headers.Authorization = `Basic ${encoded}`;
  } else if (authType === 'header' && authConfig?.headers) {
    Object.assign(headers, authConfig.headers);
  }

  return headers;
}

async function testTargetConnection(target: any) {
  if (!target?.base_url) {
    throw new TargetTestError('鐩爣杩炴帴鍦板潃涓嶈兘涓虹┖');
  }

  const method = String(target?.auth_config?.testMethod || 'GET').toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : JSON.stringify(
          target?.auth_config?.testPayload ?? {
            code: target?.code ?? '',
            message: 'mdm distribution connection test',
            targetName: target?.name ?? '',
          },
        );

  const response = await fetch(String(target.base_url), {
    body,
    headers: buildHeaders(target),
    method,
  });

  const rawResponse = await response.text().catch(() => '');
  let responsePayload: Record<string, any> = { raw: rawResponse };

  try {
    responsePayload = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    responsePayload = { raw: rawResponse };
  }

  if (!response.ok) {
    throw new TargetTestError(
      responsePayload?.error ||
        responsePayload?.message ||
        `鐩爣鎺ュ彛璋冪敤澶辫触(${response.status})`,
      {
        responsePayload,
        status: response.status,
      },
    );
  }

  return {
    responsePayload,
    status: response.status,
    success: true,
  };
}

function normalizeMappingValue(mapping: any, record: Record<string, any>) {
  const mappingType = String(mapping?.mapping_type || 'direct');
  const sourceFieldCode = String(mapping?.source_field_code || '');
  const currentValue = record[sourceFieldCode];

  if (mappingType === 'fixed') {
    return mapping?.fixed_value ?? '';
  }

  if (mappingType === 'script') {
    const script = String(mapping?.transform_script || '').trim();
    if (!script) {
      return currentValue;
    }
     
    const evaluator = new Function(
      'record',
      'value',
      `return (${script})(record, value);`,
    );
    return evaluator(record, currentValue);
  }

  return currentValue;
}

function buildMappedRecord(record: Record<string, any>, mappings: any[]) {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return record;
  }

  return Object.fromEntries(
    mappings.map((mapping) => [
      String(mapping.target_field_code || ''),
      normalizeMappingValue(mapping, record),
    ]),
  );
}

async function writeTaskLog(
  adminClient: ReturnType<typeof createClient>,
  taskId: string,
  log: {
    level: 'error' | 'info' | 'warning';
    message: string;
    requestPayload?: Record<string, any>;
    responsePayload?: Record<string, any>;
    success?: boolean;
  },
) {
  await adminClient.from('mdm_distribution_task_logs').insert({
    level: log.level,
    message: log.message,
    request_payload: log.requestPayload ?? {},
    response_payload: log.responsePayload ?? {},
    success: log.success ?? null,
    task_id: taskId,
  });
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
    return jsonResponse(
      { error: 'Supabase environment is not configured' },
      500,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === 'test') {
      try {
        const result = await testTargetConnection(body?.target ?? {});
        return jsonResponse({
          message: '连接测试成功',
          ...result,
        });
      } catch (error) {
        if (error instanceof TargetTestError) {
          return jsonResponse({
            errorType: 'target_response',
            message: error.message,
            responsePayload: error.responsePayload ?? {},
            status: error.status ?? null,
            success: false,
          });
        }

        throw error;
      }
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

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: '登录态无效，请重新登录后重试' }, 401);
    }

    const taskIds = Array.isArray(body?.taskIds)
      ? body.taskIds.filter(Boolean)
      : [];

    if (taskIds.length === 0) {
      return jsonResponse({ error: 'taskIds 涓嶈兘涓虹┖' }, 400);
    }

    const { data: taskRows, error: taskError } = await adminClient
      .from('mdm_distribution_tasks')
      .select('*')
      .in('id', taskIds);

    if (taskError) {
      throw taskError;
    }

    const results: any[] = [];

    for (const task of taskRows || []) {
      const taskId = String(task.id);

      try {
        await adminClient
          .from('mdm_distribution_tasks')
          .update({
            error_message: null,
            started_at: new Date().toISOString(),
            status: 'running',
          })
          .eq('id', taskId);

        const [{ data: scheme }, { data: target }, { data: definition }] =
          await Promise.all([
            adminClient
              .from('mdm_distribution_schemes')
              .select('*')
              .eq('id', task.scheme_id)
              .single(),
            adminClient
              .from('mdm_distribution_targets')
              .select('*')
              .eq('id', task.target_id)
              .single(),
            adminClient
              .from('mdm_model_definitions')
              .select('id,name,code,table_name')
              .eq('id', task.definition_id)
              .single(),
          ]);

        if (!scheme?.id || !target?.id || !definition?.id) {
          throw new Error('任务关联的方案、目标或模型不存在');
        }

        const { data: mappingRows, error: mappingError } = await adminClient
          .from('mdm_distribution_scheme_fields')
          .select('*')
          .eq('scheme_id', scheme.id)
          .order('sort_no', { ascending: true });

        if (mappingError) {
          throw mappingError;
        }

        const { data: recordResult, error: recordError } = await userClient.rpc(
          'get_mdm_distribution_records',
          {
            p_definition_id: task.definition_id,
            p_filter_sql: scheme.filter_sql ?? '',
            p_include_data_auth: scheme.include_data_auth ?? false,
            p_limit: task.record_id ? 1 : 1000,
            p_record_id: task.record_id ?? null,
          },
        );

        if (recordError) {
          throw recordError;
        }

        const rawRecords = Array.isArray(recordResult?.items)
          ? recordResult.items
          : [];
        const mappedRecords = rawRecords.map((record: Record<string, any>) =>
          buildMappedRecord(record, mappingRows || []),
        );

        const requestPayload = {
          definition: {
            code: definition.code,
            id: definition.id,
            name: definition.name,
          },
          operationType: task.operation_type,
          records: mappedRecords,
          scheme: {
            code: scheme.code,
            id: scheme.id,
            name: scheme.name,
          },
        };

        const method = String(
          target?.auth_config?.method || 'POST',
        ).toUpperCase();
        const response = await fetch(String(target.base_url || ''), {
          body: JSON.stringify(requestPayload),
          headers: buildHeaders(target),
          method,
        });

        const rawResponse = await response.text().catch(() => '');
        let responsePayload: Record<string, any> = { raw: rawResponse };

        try {
          responsePayload = rawResponse ? JSON.parse(rawResponse) : {};
        } catch {
          responsePayload = { raw: rawResponse };
        }

        if (!response.ok) {
          throw new Error(
            responsePayload?.error ||
              responsePayload?.message ||
              `鐩爣鎺ュ彛璋冪敤澶辫触(${response.status})`,
          );
        }

        await adminClient
          .from('mdm_distribution_tasks')
          .update({
            error_message: null,
            finished_at: new Date().toISOString(),
            response_payload: responsePayload,
            status: 'success',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        await adminClient
          .from('mdm_distribution_schemes')
          .update({
            last_dispatched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheme.id);

        await writeTaskLog(adminClient, taskId, {
          level: 'info',
          message: `分发成功，已推送到目标[${target.name}]。`,
          requestPayload,
          responsePayload,
          success: true,
        });

        results.push({
          success: true,
          taskId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '鍒嗗彂鎵ц澶辫触';

        await adminClient
          .from('mdm_distribution_tasks')
          .update({
            error_message: errorMessage,
            finished_at: new Date().toISOString(),
            retry_count: Number(task.retry_count || 0) + 1,
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        await writeTaskLog(adminClient, taskId, {
          level: 'error',
          message: errorMessage,
          success: false,
        });

        results.push({
          error: errorMessage,
          success: false,
          taskId,
        });
      }
    }

    return jsonResponse({
      items: results,
      total: results.length,
    });
  } catch (error) {
    console.error('mdm-distribution-dispatch failed', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : '鍒嗗彂鎵ц澶辫触',
      },
      500,
    );
  }
});
