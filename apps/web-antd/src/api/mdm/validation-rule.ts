import { requestClient } from '#/api/request';

import { getThemeListApi } from './theme';

export interface ValidationRule {
  code: string;
  errorMessage?: string;
  expression?: string;
  id?: string;
  name: string;
  remark?: string;
  ruleType: 'expression' | 'length' | 'range' | 'regex' | 'unique';
  sortNo?: number;
  status?: boolean;
  themeId?: null | string;
  themeName?: string;
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

export async function getValidationRuleListApi(params: any = {}) {
  const { page = 1, pageSize = 10, ...rest } = params;
  const response = await requestClient.get<any>(
    '/supabase-mdm/mdm_validation_rules',
    {
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
    },
  );

  const { items: themes } = await getThemeListApi({ pageSize: 1000 });
  const themeMap = new Map(themes.map((item: any) => [item.id, item.name]));

  const items = (
    Array.isArray(response.data?.data) ? response.data.data : []
  ).map((item: any) => ({
    ...item,
    errorMessage: item.error_message ?? '',
    ruleType: item.rule_type,
    sortNo: item.sort_no ?? 0,
    status: item.status ?? true,
    themeId: item.theme_id,
    themeName: item.theme_id ? (themeMap.get(item.theme_id) ?? '') : '',
    updatedAt: item.updated_at ?? item.created_at ?? '',
  }));

  return {
    items,
    total: parseTotal(response),
  };
}

export async function getValidationRuleOptionsApi() {
  const { items } = await getValidationRuleListApi({ pageSize: 1000 });
  return items
    .filter((item: any) => item.status)
    .map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
}

export async function createValidationRuleApi(data: ValidationRule) {
  return requestClient.post('/supabase-mdm/mdm_validation_rules', {
    code: data.code,
    error_message: data.errorMessage ?? '',
    expression: data.expression ?? '',
    name: data.name,
    remark: data.remark ?? '',
    rule_type: data.ruleType,
    sort_no: data.sortNo ?? 0,
    status: data.status ?? true,
    theme_id: data.themeId ?? null,
  });
}

export async function updateValidationRuleApi(
  id: string,
  data: ValidationRule,
) {
  return requestClient.request(
    `/supabase-mdm/mdm_validation_rules?id=eq.${id}`,
    {
      data: {
        code: data.code,
        error_message: data.errorMessage ?? '',
        expression: data.expression ?? '',
        name: data.name,
        remark: data.remark ?? '',
        rule_type: data.ruleType,
        sort_no: data.sortNo ?? 0,
        status: data.status ?? true,
        theme_id: data.themeId ?? null,
      },
      method: 'PATCH',
    },
  );
}

export async function deleteValidationRuleApi(id: string) {
  return requestClient.delete(`/supabase-mdm/mdm_validation_rules?id=eq.${id}`);
}
