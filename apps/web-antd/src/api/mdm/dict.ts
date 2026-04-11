import { requestClient } from '#/api/request';

export interface DictDefinition {
  code: string;
  id?: string;
  itemsCount?: number;
  name: string;
  remark?: string;
  sortNo?: number;
  status?: boolean;
  systemFlag?: boolean;
  updatedAt?: string;
}

export interface DictItem {
  code: string;
  dictId: string;
  id?: string;
  name: string;
  remark?: string;
  sortNo?: number;
  status?: boolean;
  value: string;
}

function parseTotal(response: any) {
  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  return response.data?.total ?? totalFromHeader;
}

export async function getDictListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const [dictResponse, itemResponse] = await Promise.all([
    requestClient.get<any>('/supabase-mdm/mdm_dicts', {
      params: {
        ...rest,
        select: '*',
        order: rest.order ?? 'sort_no.asc,updated_at.desc,created_at.desc',
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
      headers: {
        Prefer: 'count=exact',
      },
      responseReturn: 'raw',
    }),
    requestClient.get<any>('/supabase-mdm/mdm_dict_items', {
      params: {
        select: 'dict_id',
        limit: 10000,
      },
      responseReturn: 'raw',
    }),
  ]);

  const itemCountMap = new Map<string, number>();
  for (const item of Array.isArray(itemResponse.data?.data)
    ? itemResponse.data.data
    : []) {
    const dictId = item.dict_id;
    itemCountMap.set(dictId, (itemCountMap.get(dictId) ?? 0) + 1);
  }

  const items = (
    Array.isArray(dictResponse.data?.data) ? dictResponse.data.data : []
  ).map((item: any) => ({
    ...item,
    itemsCount: itemCountMap.get(item.id) ?? 0,
    sortNo: item.sort_no ?? 0,
    status: item.status ?? true,
    systemFlag: item.system_flag ?? false,
    updatedAt: item.updated_at ?? item.created_at ?? '',
  }));

  return {
    items,
    total: parseTotal(dictResponse),
  };
}

export async function getDictItemListApi(dictId: string) {
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_dict_items',
    {
      params: {
        dict_id: `eq.${dictId}`,
        select: '*',
        order: 'sort_no.asc,updated_at.desc,created_at.desc',
      },
      responseReturn: 'raw',
    },
  );

  return (Array.isArray(response.data?.data) ? response.data.data : []).map(
    (item: any) => ({
      ...item,
      dictId: item.dict_id,
      sortNo: item.sort_no ?? 0,
      status: item.status ?? true,
    }),
  );
}

export async function getDictItemOptionsApi(code: string) {
  const dictResponse = await requestClient.get<any>('/supabase-mdm/mdm_dicts', {
    params: {
      code: `eq.${code}`,
      select: 'id',
      limit: 1,
    },
    responseReturn: 'raw',
  });

  const [dict] = Array.isArray(dictResponse.data?.data)
    ? dictResponse.data.data
    : [];
  if (!dict?.id) {
    return [];
  }

  const items = await getDictItemListApi(dict.id);
  return items
    .filter((item: any) => item.status)
    .map((item: any) => ({
      label: item.name,
      value: item.value,
    }));
}

export async function getDictDefinitionOptionsApi() {
  const { items } = await getDictListApi({ pageSize: 1000 });
  return items
    .filter((item: any) => item.status)
    .map((item: any) => ({
      label: `${item.name} (${item.code})`,
      value: item.code,
    }));
}

export async function createDictApi(data: DictDefinition) {
  return requestClient.post('/supabase-mdm/mdm_dicts', {
    code: data.code,
    name: data.name,
    remark: data.remark ?? '',
    sort_no: data.sortNo ?? 0,
    status: data.status ?? true,
    system_flag: data.systemFlag ?? false,
  });
}

export async function updateDictApi(id: string, data: DictDefinition) {
  return requestClient.request(`/supabase-mdm/mdm_dicts?id=eq.${id}`, {
    data: {
      code: data.code,
      name: data.name,
      remark: data.remark ?? '',
      sort_no: data.sortNo ?? 0,
      status: data.status ?? true,
      system_flag: data.systemFlag ?? false,
    },
    method: 'PATCH',
  });
}

export async function deleteDictApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_dicts?id=eq.${id}`);
}

export async function createDictItemApi(data: DictItem) {
  return requestClient.post('/supabase-mdm/mdm_dict_items', {
    code: data.code,
    dict_id: data.dictId,
    name: data.name,
    remark: data.remark ?? '',
    sort_no: data.sortNo ?? 0,
    status: data.status ?? true,
    value: data.value,
  });
}

export async function updateDictItemApi(id: string, data: DictItem) {
  return requestClient.request(`/supabase-mdm/mdm_dict_items?id=eq.${id}`, {
    data: {
      code: data.code,
      name: data.name,
      remark: data.remark ?? '',
      sort_no: data.sortNo ?? 0,
      status: data.status ?? true,
      value: data.value,
    },
    method: 'PATCH',
  });
}

export async function deleteDictItemApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_dict_items?id=eq.${id}`);
}
