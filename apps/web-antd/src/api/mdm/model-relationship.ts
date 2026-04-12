import { requestClient } from '#/api/request';

import { getModelDefinitionListApi } from './model-definition';

export interface ModelRelationship {
  createdAt?: string;
  id?: string;
  relationType: '1:1' | '1:N' | 'N:1' | 'N:N';
  remark?: string;
  sort?: number;
  sourceDefinitionId: string;
  sourceField: string;
  sourceModelCode?: string;
  sourceModelType?: string;
  sourceModelName?: string;
  status?: 'draft' | 'obsolete' | 'published';
  targetDefinitionId: string;
  targetField: string;
  targetModelCode?: string;
  targetModelType?: string;
  targetModelName?: string;
  updatedAt?: string;
}

function parseTotal(response: any) {
  const contentRange =
    response.headers?.['content-range'] ?? response.headers?.['Content-Range'];
  const totalFromHeader = contentRange
    ? Number.parseInt(contentRange.split('/').pop() || '0', 10)
    : 0;
  return response.data?.total ?? totalFromHeader;
}

function formatModelLabel(item: any) {
  return `${item.name} (${item.code})`;
}

export async function getModelRelationshipListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_model_relationships',
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
  const { items: definitions } = await getModelDefinitionListApi({
    pageSize: 1000,
  });
  const definitionMap = new Map<
    string,
    { code: string; label: string; modelType: string }
  >(
    definitions.map((item: any) => [
      item.id,
      {
        code: item.code,
        label: formatModelLabel(item),
        modelType: item.modelType,
      },
    ]),
  );

  return {
    items: rawItems.map((item: any) => ({
      ...item,
      createdAt: item.created_at,
      relationType: item.relation_type,
      sourceDefinitionId: item.source_definition_id,
      sourceField: item.source_field,
      sourceModelCode: definitionMap.get(item.source_definition_id)?.code ?? '',
      sourceModelName:
        definitionMap.get(item.source_definition_id)?.label ?? '',
      sourceModelType:
        definitionMap.get(item.source_definition_id)?.modelType ?? '',
      sort: item.sort ?? 10,
      targetDefinitionId: item.target_definition_id,
      targetField: item.target_field,
      targetModelCode: definitionMap.get(item.target_definition_id)?.code ?? '',
      targetModelName:
        definitionMap.get(item.target_definition_id)?.label ?? '',
      targetModelType:
        definitionMap.get(item.target_definition_id)?.modelType ?? '',
      updatedAt: item.updated_at ?? item.created_at ?? '',
    })),
    total: parseTotal(response),
  };
}

export async function getModelRelationshipOptionsApi() {
  const { items } = await getModelDefinitionListApi({ pageSize: 1000 });
  return items.map((item: any) => ({
    label: formatModelLabel(item),
    value: item.id,
  }));
}

export async function createModelRelationshipApi(data: ModelRelationship) {
  return requestClient.post('/supabase-mdm/mdm_model_relationships', {
    relation_type: data.relationType,
    remark: data.remark ?? '',
    sort: data.sort ?? 10,
    source_definition_id: data.sourceDefinitionId,
    source_field: data.sourceField,
    status: 'draft',
    target_definition_id: data.targetDefinitionId,
    target_field: data.targetField,
  });
}

export async function updateModelRelationshipApi(
  id: string,
  data: ModelRelationship,
) {
  return requestClient.request(
    `/supabase-mdm/mdm_model_relationships?id=eq.${id}`,
    {
      data: {
        relation_type: data.relationType,
        remark: data.remark ?? '',
        sort: data.sort ?? 10,
        source_definition_id: data.sourceDefinitionId,
        source_field: data.sourceField,
        target_definition_id: data.targetDefinitionId,
        target_field: data.targetField,
      },
      method: 'PATCH',
    },
  );
}

export async function deleteModelRelationshipApi(id: string) {
  return requestClient.delete(
    `/supabase-mdm/mdm_model_relationships?id=eq.${id}`,
  );
}

export async function publishModelRelationshipApi(id: string) {
  return requestClient.post('/supabase-mdm/rpc/publish_model_relationship', {
    p_relationship_id: id,
  });
}

export async function obsoleteModelRelationshipApi(id: string) {
  return requestClient.post('/supabase-mdm/rpc/obsolete_model_relationship', {
    p_relationship_id: id,
  });
}
