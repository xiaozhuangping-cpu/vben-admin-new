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

function normalizeJsonPayload(rawText: string) {
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      raw: rawText,
    };
  }
}

async function writeRunLog(
  adminClient: ReturnType<typeof createClient>,
  runId: string,
  taskId: string,
  log: {
    detail?: Record<string, any>;
    level: 'error' | 'info' | 'warning';
    message: string;
  },
) {
  await adminClient.from('mdm_collection_task_logs').insert({
    detail: log.detail ?? {},
    level: log.level,
    message: log.message,
    run_id: runId,
    task_id: taskId,
  });
}

async function executeApiTask(task: any) {
  const apiUrl = String(task?.api_url ?? '').trim();
  if (!apiUrl) {
    throw new Error('API address is required for api collection tasks.');
  }

  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
    },
    method: 'GET',
  });

  const rawText = await response.text().catch(() => '');
  const payload = normalizeJsonPayload(rawText);

  if (!response.ok) {
    throw new Error(
      String(
        payload?.message ||
          payload?.error ||
          `Request failed with status ${response.status}`,
      ),
    );
  }

  return {
    status: response.status,
    summary: {
      payload,
      status: response.status,
      type: 'api',
    },
  };
}

async function executePluginTask(task: any) {
  const pluginCode = String(task?.plugin_code ?? '').trim();
  if (!pluginCode) {
    throw new Error('Plugin code is required for plugin collection tasks.');
  }

  const pluginRegistry: Record<
    string,
    (task: any) => Promise<Record<string, any>>
  > = {
    example_plugin: async () => ({
      message: 'Example plugin executed.',
      pluginCode,
      type: 'plugin',
    }),
  };

  const pluginHandler = pluginRegistry[pluginCode];
  if (!pluginHandler) {
    throw new Error(`No plugin handler is registered for ${pluginCode}.`);
  }

  return {
    status: 200,
    summary: await pluginHandler(task),
  };
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

  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: '登录态无效，请重新登录后重试' }, 401);
    }

    const runIds = Array.isArray(body?.runIds)
      ? body.runIds.filter(Boolean)
      : [];

    if (runIds.length === 0) {
      return jsonResponse({ error: 'runIds 不能为空' }, 400);
    }

    const { data: runRows, error: runError } = await adminClient
      .from('mdm_collection_task_runs')
      .select('*')
      .in('id', runIds);

    if (runError) {
      throw runError;
    }

    const results: any[] = [];

    for (const run of runRows || []) {
      const runId = String(run.id);
      const taskId = String(run.task_id);

      try {
        await adminClient
          .from('mdm_collection_task_runs')
          .update({
            error_message: null,
            started_at: new Date().toISOString(),
            status: 'running',
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId);

        const { data: task, error: taskError } = await adminClient
          .from('mdm_collection_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (taskError) {
          throw taskError;
        }

        if (!task?.id) {
          throw new Error('Collection task does not exist.');
        }

        await writeRunLog(adminClient, runId, taskId, {
          detail: {
            collectionType: task.collection_type,
            executeStrategy: task.execute_strategy ?? '',
            triggerMode: run.trigger_mode ?? 'manual',
          },
          level: 'info',
          message: `Collection run started for task [${task.name}].`,
        });

        const executionResult =
          task.collection_type === 'plugin'
            ? await executePluginTask(task)
            : await executeApiTask(task);

        await adminClient
          .from('mdm_collection_task_runs')
          .update({
            error_message: null,
            finished_at: new Date().toISOString(),
            result_summary: executionResult.summary,
            status: 'success',
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId);

        await adminClient
          .from('mdm_collection_tasks')
          .update({
            last_executed_at: new Date().toISOString(),
            last_execution_status: 'success',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        await writeRunLog(adminClient, runId, taskId, {
          detail: executionResult.summary,
          level: 'info',
          message: `Collection run finished successfully for task [${task.name}].`,
        });

        results.push({
          runId,
          success: true,
          taskId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '归集执行失败';

        await adminClient
          .from('mdm_collection_task_runs')
          .update({
            error_message: errorMessage,
            finished_at: new Date().toISOString(),
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', runId);

        await adminClient
          .from('mdm_collection_tasks')
          .update({
            last_executed_at: new Date().toISOString(),
            last_execution_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        await writeRunLog(adminClient, runId, taskId, {
          detail: {
            error: errorMessage,
          },
          level: 'error',
          message: errorMessage,
        });

        results.push({
          error: errorMessage,
          runId,
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
    console.error('mdm-collection-dispatch failed', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : '归集执行失败',
      },
      500,
    );
  }
});
