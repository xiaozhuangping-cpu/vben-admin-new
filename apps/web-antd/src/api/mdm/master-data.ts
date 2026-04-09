import { requestClient } from '#/api/request';

function parseTotal(response: any) {
  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  return response.data?.total ?? totalFromHeader;
}

export async function getDynamicMasterDataRecordsApi(
  tableName: string,
  params: any = {},
) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(`/supabase-mdm/${tableName}`, {
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
  });

  return {
    items: Array.isArray(response.data?.data) ? response.data.data : [],
    total: parseTotal(response),
  };
}

export async function createDynamicMasterDataRecordApi(
  tableName: string,
  data: Record<string, any>,
) {
  const response = await requestClient.post<any>(
    `/supabase-mdm/${tableName}`,
    data,
    {
      headers: {
        Prefer: 'return=representation',
      },
      responseReturn: 'raw',
    },
  );

  return Array.isArray(response.data?.data)
    ? response.data.data[0]
    : response.data;
}

export async function updateDynamicMasterDataRecordApi(
  tableName: string,
  id: string,
  data: Record<string, any>,
) {
  const response = await requestClient.request<any>(
    `/supabase-mdm/${tableName}?id=eq.${id}`,
    {
      data,
      headers: {
        Prefer: 'return=representation',
      },
      method: 'PATCH',
      responseReturn: 'raw',
    },
  );

  return Array.isArray(response.data?.data)
    ? response.data.data[0]
    : response.data;
}
