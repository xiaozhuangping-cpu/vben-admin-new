import { requestClient } from '#/api/request';

export async function createMasterDataHistorySnapshotApi(
  definitionId: string,
  recordId: string,
  effectiveAt?: string,
) {
  return requestClient.post(
    '/supabase-mdm/rpc/create_mdm_data_history_snapshot',
    {
      p_definition_id: definitionId,
      p_effective_at: effectiveAt ?? null,
      p_record_id: recordId,
    },
  );
}

export async function getMasterDataHistoryListApi(
  definitionId: string,
  recordId: string,
  params: { page?: number; pageSize?: number } = {},
) {
  const { page = 1, pageSize = 10 } = params;
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/get_mdm_data_history_list',
    {
      p_definition_id: definitionId,
      p_page: page,
      p_page_size: pageSize,
      p_record_id: recordId,
    },
    {
      responseReturn: 'raw',
    },
  );

  const payload = response.data?.data ?? response.data ?? {};
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    total: Number(payload.total ?? 0),
  };
}

export async function getMasterDataHistoryDetailApi(historyId: string) {
  const response = await requestClient.post<any>(
    '/supabase-mdm/rpc/get_mdm_data_history_detail',
    {
      p_history_id: historyId,
    },
    {
      responseReturn: 'raw',
    },
  );

  return response.data?.data ?? response.data ?? {};
}
